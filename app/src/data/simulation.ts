// Simulação de preços para demonstrar o app: todas as noites desde o dia 1º do mês até 60 dias à frente,
// para todos os hotéis da rede (da carga de exemplo e os cadastrados pelo usuário) e todos os concorrentes.
// Os valores são fictícios (gerados a partir do preço atual de cada hotel) e ficam marcados com source "simulado".

import { doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';

import { addDays, dateRange, diffDays, monthOf, monthStart, todayKey, weekdayOf } from '@/lib/dates';
import { db, withTimeout } from '@/lib/firestore';
import { holidayMap } from '@/lib/holidays';
import { dateInfo, median } from '@/lib/market';
import { STALE_AFTER_MINUTES } from '@/lib/pricing';
import { MAX_STAY_DAYS_AHEAD } from '@/lib/readings';
import type { CalendarEvent, Hotel, LatestCheck, Property } from '@/types';

import { competitorKeyOf } from './hotelsRepository';
import { checksCol, hotelRef } from './paths';
import { exampleRate, variation } from './seed';

/** Limite de operações por lote do Firestore (o máximo é 500). */
const BATCH_LIMIT = 200;
/** Cada lote pode levar mais que o normal (são centenas de gravações): espera até 60 s antes de desistir. */
const BATCH_TIMEOUT_MS = 60_000;
/** Preço de partida quando o hotel não tem nenhum preço registrado. */
const DEFAULT_BASE = 300;

export type SimulationResult = { hotels: number; rates: number; from: string; to: string };

type Write = { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge?: boolean };

/** Faixa simulada: do dia 1º do mês atual até 60 dias à frente (a mesma janela que o app carrega). */
export function simulationRange(today: string): { from: string; to: string } {
  return { from: monthStart(monthOf(today)), to: addDays(today, MAX_STAY_DAYS_AHEAD) };
}

/**
 * Preço de partida de cada propriedade: o preço atual, se houver. Concorrente sem preço parte do preço
 * do hotel da rede com uma diferença fixa entre -15% e +15% (sempre a mesma para o mesmo concorrente).
 * Hotel da rede sem preço parte de 5% abaixo da mediana dos concorrentes.
 */
function baseFor(property: Property, hotel: Hotel, ownBase: number, role: 'own' | 'competitor'): number {
  const known = property.latest.price ?? property.latest.previousPrice;
  if (known) return known;
  if (role === 'own') return ownBase;
  return Math.round(ownBase * (1 + variation(competitorKeyOf(property), 7) * 2.5));
}

function ownBaseOf(hotel: Hotel): number {
  const known = hotel.own.latest.price ?? hotel.own.latest.previousPrice;
  if (known) return known;
  const competitorPrices = hotel.competitors
    .map((c) => c.latest.price ?? c.latest.previousPrice)
    .filter((p): p is number => typeof p === 'number');
  return Math.round((median(competitorPrices) ?? DEFAULT_BASE) * 0.95);
}

/** Leitura simulada feita às 09:00 (horário de Brasília) do dia informado. */
const nineAm = (day: string) => new Date(`${day}T09:00:00-03:00`).toISOString();

/**
 * Grava a simulação. Não sobrescreve nada: noites que já têm leitura de uma propriedade ficam como estão,
 * e o preço atual (painel) só é preenchido em quem ainda não tem leitura de hoje. Rodar de novo só completa o que faltar.
 * Rodando de novo, a noite de hoje ganha uma coleta nova sempre que a anterior passou de STALE_AFTER_MINUTES
 * (o painel deixa de mostrar "desatualizado").
 */
export async function simulatePrices(hotels: Hotel[], events: CalendarEvent[], now = new Date()): Promise<SimulationResult> {
  const today = todayKey(now);
  const { from, to } = simulationRange(today);
  const year = Number(today.slice(0, 4));
  const holidays = holidayMap([year, year + 1]);
  const nights = dateRange(from, diffDays(from, to) + 1);
  // Coleta das noites de hoje em diante: agora (2 minutos atrás). O painel considera desatualizado um preço
  // com mais de STALE_AFTER_MINUTES; por isso a coleta é registrada na hora em que a simulação roda.
  const collectedAt = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const freshSince = now.getTime() - STALE_AFTER_MINUTES * 60 * 1000;

  let rates = 0;
  let touched = 0;
  for (const hotel of hotels) {
    // Noites que já têm leitura, por propriedade (para não duplicar).
    const existing = await withTimeout(getDocs(query(checksCol(hotel.id), where('stayDate', '>=', from))), BATCH_TIMEOUT_MS);
    const taken = new Set(
      existing.docs.map((d) => `${String(d.data().propertyId)}|${String(d.data().stayDate)}`),
    );
    // Noite de hoje: só conta como feita se a coleta é recente (menos de STALE_AFTER_MINUTES). Uma coleta mais
    // antiga deixa o preço "desatualizado"; nesse caso, registra uma coleta agora repetindo o último preço conhecido.
    const collectedToday = new Set<string>();
    const lastForToday = new Map<string, { status: string; price: number | null; checkedAt: string }>();
    for (const d of existing.docs) {
      const data = d.data();
      if (data.stayDate !== today || typeof data.checkedAt !== 'string') continue;
      const id = String(data.propertyId);
      // Coleta recente (ainda não "desatualizada" no painel): não precisa de outra.
      if (new Date(data.checkedAt).getTime() >= freshSince) collectedToday.add(id);
      const prev = lastForToday.get(id);
      if (!prev || data.checkedAt > prev.checkedAt) {
        lastForToday.set(id, { status: String(data.status), price: typeof data.price === 'number' ? data.price : null, checkedAt: data.checkedAt });
      }
    }

    const writes: Write[] = [];
    const ownBase = ownBaseOf(hotel);
    const latestToday = new Map<string, LatestCheck>();

    const roles = [['own', hotel.own] as const, ...hotel.competitors.map((c) => ['competitor', c] as const)];
    for (const [role, property] of roles) {
      const base = baseFor(property, hotel, ownBase, role);
      const seedId = role === 'own' ? property.id : competitorKeyOf(property);
      nights.forEach((night, i) => {
        const isToday = night === today;
        if (isToday ? collectedToday.has(property.id) : taken.has(`${property.id}|${night}`)) return;
        const info = dateInfo(night, hotel.city, holidays, events);
        const known = isToday ? lastForToday.get(property.id) : undefined;
        const rate = known
          ? { status: known.status === 'sold_out' ? ('sold_out' as const) : ('ok' as const), price: known.price }
          : exampleRate(seedId, base, i + 1, info.kind, weekdayOf(night), role, false);
        if (rate.status === 'ok' && rate.price === null) return; // leitura antiga sem preço: não inventa
        const checkedAt = night < today ? nineAm(night) : collectedAt;
        writes.push({
          ref: doc(checksCol(hotel.id)),
          data: {
            propertyId: property.id,
            propertyName: property.name,
            status: rate.status,
            price: rate.price,
            checkedAt,
            stayDate: night,
            source: 'simulado',
            createdAt: serverTimestamp(),
          },
        });
        rates++;
        // Preço atual do painel: atualiza com a coleta de agora.
        if (isToday) {
          latestToday.set(property.id, { status: rate.status, price: rate.price, checkedAt });
        }
      });
    }

    if (latestToday.size > 0) {
      const withLatest = (p: Property) => (latestToday.has(p.id) ? { ...p, latest: latestToday.get(p.id)! } : p);
      const clean = (p: Property) => ({
        id: p.id,
        name: p.name,
        ...(p.bookingUrl ? { bookingUrl: p.bookingUrl } : {}),
        latest: p.latest,
        ...(p.competitorKey ? { competitorKey: p.competitorKey } : {}),
      });
      writes.push({
        ref: hotelRef(hotel.id),
        data: {
          own: clean(withLatest(hotel.own)),
          competitors: hotel.competitors.map((c) => clean(withLatest(c))),
          updatedAt: serverTimestamp(),
        },
        merge: true,
      });
    }

    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const w of writes.slice(i, i + BATCH_LIMIT)) {
        if (w.merge) batch.set(w.ref, w.data, { merge: true });
        else batch.set(w.ref, w.data);
      }
      await withTimeout(batch.commit(), BATCH_TIMEOUT_MS);
    }
    if (writes.length > 0) touched++;
  }

  return { hotels: touched, rates, from, to };
}
