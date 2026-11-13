import { doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';

import { db, withTimeout } from '@/lib/firestore';
import type { Hotel, Property } from '@/types';

import { mockClient, mockHotels, MOCK_NOW } from './mock';
import { checksCol, clientRef, hotelRef, hotelsCol } from './paths';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 6;

/**
 * Carga inicial: grava no Firestore os dados de exemplo de src/data/mock.ts
 * (Rede Litoral Hotéis, 9 hotéis com 3 concorrentes cada).
 *
 * - Seguro para rodar mais de uma vez: hotéis que já existem são pulados (nada é sobrescrito).
 * - Os horários do exemplo são trazidos para "agora", para os preços não aparecerem desatualizados.
 * - Cada propriedade ganha um histórico de leituras dos últimos dias, usado pelo gráfico de 7 dias.
 */
export async function seedExampleData(): Promise<{ created: number; skipped: number }> {
  const existing = new Set((await withTimeout(getDocs(hotelsCol()))).docs.map((d) => d.id));
  const offsetMs = Date.now() - MOCK_NOW.getTime();
  const shift = (iso: string | undefined | null) =>
    iso ? new Date(new Date(iso).getTime() + offsetMs).toISOString() : iso;

  const batch = writeBatch(db);
  batch.set(clientRef(), { name: mockClient.name, alertThresholdPct: mockClient.alertThresholdPct }, { merge: true });

  let created = 0;
  for (const hotel of mockHotels) {
    if (existing.has(hotel.id)) continue;

    const shifted: Hotel = {
      ...hotel,
      own: shiftProperty(hotel.own, shift),
      competitors: hotel.competitors.map((c) => shiftProperty(c, shift)),
    };

    batch.set(hotelRef(hotel.id), {
      order: shifted.order,
      own: shifted.own,
      competitors: shifted.competitors,
      createdAt: serverTimestamp(),
    });

    for (const property of [shifted.own, ...shifted.competitors]) {
      for (const check of historyFor(property)) {
        batch.set(doc(checksCol(hotel.id)), { ...check, source: 'seed', createdAt: serverTimestamp() });
      }
    }
    created++;
  }

  await withTimeout(batch.commit());
  return { created, skipped: mockHotels.length - created };
}

function shiftProperty(property: Property, shift: (iso: string | null | undefined) => string | null | undefined): Property {
  return {
    ...property,
    latest: {
      ...property.latest,
      checkedAt: shift(property.latest.checkedAt) ?? null,
      changedAt: shift(property.latest.changedAt) ?? undefined,
    },
  };
}

/** Variação determinística de até ±6% por dia (o mesmo hotel gera sempre o mesmo histórico). */
function variation(seed: string, day: number): number {
  let hash = day * 2654435761;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (((hash >>> 0) % 1201) / 1200 - 0.5) * 0.12;
}

type CheckDoc = { propertyId: string; propertyName: string; status: string; price: number | null; checkedAt: string };

function historyFor(property: Property): CheckDoc[] {
  const { latest } = property;
  if (!latest.checkedAt) return [];
  const base = latest.price ?? latest.previousPrice;
  const lastTime = new Date(latest.checkedAt).getTime();
  const checks: CheckDoc[] = [];

  if (base !== null && base !== undefined) {
    for (let day = HISTORY_DAYS; day >= 1; day--) {
      checks.push({
        propertyId: property.id,
        propertyName: property.name,
        status: 'ok',
        price: Math.round(base * (1 + variation(property.id, day))),
        checkedAt: new Date(lastTime - day * DAY_MS).toISOString(),
      });
    }
  }

  // Preço antes da mudança de hoje (para o "era R$ ... até as HH:MM" bater com o histórico).
  if (latest.previousPrice !== undefined && latest.changedAt) {
    checks.push({
      propertyId: property.id,
      propertyName: property.name,
      status: 'ok',
      price: latest.previousPrice,
      checkedAt: new Date(new Date(latest.changedAt).getTime() - 60 * 60 * 1000).toISOString(),
    });
  }

  checks.push({
    propertyId: property.id,
    propertyName: property.name,
    status: latest.status,
    price: latest.status === 'ok' ? latest.price : null,
    checkedAt: latest.checkedAt,
  });
  return checks;
}
