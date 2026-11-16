import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

import { DEFAULT_ALERT_RULES } from '@/lib/alerts';
import { addDays, dateRange, todayKey, weekdayOf } from '@/lib/dates';
import { db, withTimeout } from '@/lib/firestore';
import { dayKeyBrt } from '@/lib/format';
import { holidayMap } from '@/lib/holidays';
import { dateInfo, median, type DateKind } from '@/lib/market';
import type { CalendarEvent, Hotel, Property } from '@/types';

import { mockClient, mockHotels, MOCK_NOW } from './mock';
import { checksCol, clientRef, decisionsCol, eventsCol, hotelRef, hotelsCol } from './paths';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 6;
/** Noites futuras com tarifa de exemplo (hoje + 29). */
const RATE_DAYS = 30;
/** Versão da carga: hotéis carregados por uma versão anterior ganham só o que falta (localização, preço-piso, tarifas). */
const SEED_VERSION = 2;

const EXAMPLE_EVENT_CITY = 'Goiânia/GO';
const EXAMPLE_EVENT_NAME = 'Feira Agro Centro-Oeste';
/** Localização onde a carga simula uma alta de preços sem feriado, para a detecção de evento aparecer. */
const SUSPECT_CITY = 'Caldas Novas/GO';

/** Cliente da versão anterior da carga (Rede Litoral). Hotéis cadastrados por usuários lá são trazidos para o cliente atual. */
const LEGACY_CLIENT_ID = 'rede-litoral';
/** Localização dada a um hotel trazido do cliente anterior que estava sem localização. */
const LEGACY_DEFAULT_CITY = 'Brasília/DF';
/** Limite de operações por lote do Firestore (o máximo é 500). */
const BATCH_LIMIT = 450;

/**
 * Carga inicial: grava no Firestore os dados de exemplo de src/data/mock.ts
 * (Rede Cerrado Hotéis, 9 hotéis com 3 concorrentes cada, em Brasília, Goiânia e Caldas Novas).
 *
 * - Seguro para rodar mais de uma vez: nada que já existe é sobrescrito.
 * - Os horários do exemplo são trazidos para "agora", para os preços não aparecerem desatualizados.
 * - Cada propriedade ganha um histórico dos últimos dias (gráfico de 7 dias) e tarifas para as
 *   próximas 30 noites (comparativo por data, calendário e alertas), com feriados, um evento
 *   cadastrado e uma data com cara de evento sem cadastro.
 */
export async function seedExampleData(): Promise<{ created: number; skipped: number; rates: number; migrated: number }> {
  const now = new Date();
  const today = todayKey(now);
  const [hotelsSnap, clientSnap, eventsSnap] = await withTimeout(
    Promise.all([getDocs(hotelsCol()), getDoc(clientRef()), getDocs(eventsCol())]),
  );
  const existing = new Map(hotelsSnap.docs.map((d) => [d.id, d.data()]));

  // Cliente: nome, limite e regras de alerta padrão (sem apagar regras já ajustadas).
  await withTimeout(
    setDoc(
      clientRef(),
      {
        name: clientSnap.data()?.name ?? mockClient.name,
        alertThresholdPct: clientSnap.data()?.alertThresholdPct ?? mockClient.alertThresholdPct,
        ...(clientSnap.data()?.alertRules ? {} : { alertRules: DEFAULT_ALERT_RULES }),
      },
      { merge: true },
    ),
  );

  const year = Number(today.slice(0, 4));
  const holidays = holidayMap([year, year + 1]);
  const dates = dateRange(today, RATE_DAYS);

  // Um evento cadastrado (num sábado comum daqui a 1 ou 2 semanas) e uma data suspeita (dia útil sem feriado).
  const eventDate = dates.find((d, i) => i >= 7 && weekdayOf(d) === 6 && !holidays.has(d)) ?? addDays(today, 10);
  const suspectDate =
    dates.find((d, i) => i >= 10 && [2, 3, 4].includes(weekdayOf(d)) && !holidays.has(d) && !holidays.has(addDays(d, 1))) ??
    addDays(today, 12);
  const plannedEvents: CalendarEvent[] = [
    { id: 'exemplo', date: eventDate, city: EXAMPLE_EVENT_CITY, name: EXAMPLE_EVENT_NAME, kind: 'evento' },
  ];
  if (eventsSnap.empty) {
    await withTimeout(
      addDoc(eventsCol(), {
        date: eventDate,
        city: EXAMPLE_EVENT_CITY,
        name: EXAMPLE_EVENT_NAME,
        kind: 'evento',
        createdBy: 'carga de exemplo',
        createdAt: serverTimestamp(),
      }),
    );
  }

  // Coleta de exemplo feita hoje às 06:00 (ou há 5 minutos, se ainda for madrugada).
  const sixAm = new Date(`${today}T06:00:00-03:00`);
  const collectedAt = (now > sixAm ? sixAm : new Date(now.getTime() - 5 * 60 * 1000)).toISOString();
  const offsetMs = now.getTime() - MOCK_NOW.getTime();
  const shift = (iso: string | undefined | null) => (iso ? new Date(new Date(iso).getTime() + offsetMs).toISOString() : iso);
  const firstHoliday = dates.find((d) => holidays.has(d));

  let created = 0;
  let rates = 0;
  for (const hotel of mockHotels) {
    const stored = existing.get(hotel.id);
    if (stored && typeof stored.seedVersion === 'number' && stored.seedVersion >= SEED_VERSION) continue;

    const shifted: Hotel = {
      ...hotel,
      own: shiftProperty(hotel.own, shift),
      competitors: hotel.competitors.map((c) => shiftProperty(c, shift)),
    };
    const batch = writeBatch(db);

    if (!stored) {
      batch.set(hotelRef(hotel.id), {
        order: shifted.order,
        own: shifted.own,
        competitors: shifted.competitors,
        city: hotel.city,
        floorPrice: hotel.floorPrice,
        seedVersion: SEED_VERSION,
        createdAt: serverTimestamp(),
      });
      for (const property of [shifted.own, ...shifted.competitors]) {
        for (const check of historyFor(property)) {
          batch.set(doc(checksCol(hotel.id)), { ...check, source: 'seed', createdAt: serverTimestamp() });
        }
      }
      created++;
    } else {
      // Hotel de uma carga anterior: completa localização e preço-piso sem trocar o que o usuário editou.
      batch.set(
        hotelRef(hotel.id),
        {
          city: typeof stored.city === 'string' && stored.city ? stored.city : hotel.city,
          floorPrice: typeof stored.floorPrice === 'number' ? stored.floorPrice : hotel.floorPrice,
          seedVersion: SEED_VERSION,
        },
        { merge: true },
      );
      // A noite de hoje entra também como tarifa, com o preço atual do painel.
      for (const property of [shifted.own, ...shifted.competitors]) {
        const { status, price, checkedAt } = property.latest;
        if (!checkedAt || (status !== 'ok' && status !== 'sold_out')) continue;
        batch.set(doc(checksCol(hotel.id)), {
          propertyId: property.id,
          propertyName: property.name,
          status,
          price: status === 'ok' ? price : null,
          checkedAt,
          stayDate: today,
          source: 'seed',
          createdAt: serverTimestamp(),
        });
        rates++;
      }
    }

    // Tarifas das próximas noites (a de hoje já veio do histórico ou do bloco acima).
    const ownBase = baseOwnPrice(shifted);
    for (const [role, property] of [['own', shifted.own] as const, ...shifted.competitors.map((c) => ['competitor', c] as const)]) {
      const base = role === 'own' ? ownBase : basePrice(property);
      for (let i = 1; i < dates.length; i++) {
        const date = dates[i];
        const info = dateInfo(date, hotel.city, holidays, plannedEvents);
        const rate = exampleRate(property.id, base, i, info.kind, weekdayOf(date), role, hotel.city === SUSPECT_CITY && date === suspectDate);
        batch.set(doc(checksCol(hotel.id)), {
          propertyId: property.id,
          propertyName: property.name,
          status: rate.status,
          price: rate.price,
          checkedAt: collectedAt,
          stayDate: date,
          source: 'seed',
          createdAt: serverTimestamp(),
        });
        rates++;

        // Como os concorrentes mexeram no preço para o primeiro feriado: três coletas anteriores, mais baratas.
        if (role === 'competitor' && date === firstHoliday && rate.price !== null) {
          [12, 8, 4].forEach((daysAgo, k) => {
            batch.set(doc(checksCol(hotel.id)), {
              propertyId: property.id,
              propertyName: property.name,
              status: 'ok',
              price: Math.round((rate.price as number) * [0.82, 0.88, 0.94][k]),
              checkedAt: new Date(new Date(collectedAt).getTime() - daysAgo * DAY_MS).toISOString(),
              stayDate: date,
              source: 'seed',
              createdAt: serverTimestamp(),
            });
            rates++;
          });
        }
      }
    }

    await withTimeout(batch.commit());
  }

  const migrated = await migrateUserHotels(existing, mockHotels.length);
  return { created, skipped: mockHotels.length - created, rates, migrated };
}

/**
 * Traz os hotéis cadastrados por usuários no cliente anterior (os que não vieram da carga, ou seja,
 * sem seedVersion) para o cliente atual, com o histórico de leituras e as decisões.
 * O original não é apagado (as regras não permitem apagar leituras). Rodar de novo não duplica nada.
 */
async function migrateUserHotels(existing: Map<string, unknown>, seedCount: number): Promise<number> {
  const legacyHotels = await withTimeout(getDocs(collection(db, 'clients', LEGACY_CLIENT_ID, 'hotels')));
  let migrated = 0;
  let order = seedCount;
  // Nomes já usados na rede atual: um hotel recadastrado à mão não é trazido de novo (evita dois "Brisa Tower Hotel").
  const fold = (name: unknown) => String(name ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  const currentNames = new Set(
    [...existing.values()].map((h) => fold((h as { own?: { name?: unknown } }).own?.name)),
  );
  for (const legacy of legacyHotels.docs) {
    const data = legacy.data();
    if (typeof data.seedVersion === 'number' || existing.has(legacy.id)) continue;
    if (currentNames.has(fold((data.own as { name?: unknown } | undefined)?.name))) continue;

    const legacyPath = ['clients', LEGACY_CLIENT_ID, 'hotels', legacy.id] as const;
    const [checks, decisions] = await withTimeout(
      Promise.all([getDocs(collection(db, ...legacyPath, 'checks')), getDocs(collection(db, ...legacyPath, 'decisions'))]),
    );

    // Os filhos vão primeiro; o hotel por último, para ele só aparecer no app com o histórico completo.
    const writes: [ReturnType<typeof doc>, Record<string, unknown>][] = [
      ...checks.docs.map((c) => [doc(checksCol(legacy.id), c.id), c.data()] as [ReturnType<typeof doc>, Record<string, unknown>]),
      ...decisions.docs.map((d) => [doc(decisionsCol(legacy.id), d.id), d.data()] as [ReturnType<typeof doc>, Record<string, unknown>]),
    ];
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      for (const [ref, value] of writes.slice(i, i + BATCH_LIMIT)) batch.set(ref, value);
      await withTimeout(batch.commit());
    }

    order++;
    await withTimeout(
      setDoc(hotelRef(legacy.id), {
        ...data,
        city: typeof data.city === 'string' && data.city ? data.city : LEGACY_DEFAULT_CITY,
        order: typeof data.order === 'number' && data.order > seedCount ? data.order : order,
        migratedFrom: LEGACY_CLIENT_ID,
      }),
    );
    migrated++;
  }
  return migrated;
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

/** Variação determinística de até ±6% (o mesmo hotel gera sempre os mesmos números). */
export function variation(seed: string, day: number): number {
  let hash = day * 2654435761;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (((hash >>> 0) % 1201) / 1200 - 0.5) * 0.12;
}

/** Sorteio determinístico de 0 a 99. */
export function chance(seed: string, day: number): number {
  return Math.floor((variation(`${seed}#`, day) / 0.12 + 0.5) * 99.99);
}

const basePrice = (p: Property) => p.latest.price ?? p.latest.previousPrice ?? 300;

/** Unidade sem preço hoje: parte de um pouco abaixo da mediana dos concorrentes. */
function baseOwnPrice(hotel: Hotel): number {
  if (hotel.own.latest.price !== null) return hotel.own.latest.price;
  if (hotel.own.latest.previousPrice !== undefined) return hotel.own.latest.previousPrice;
  return Math.round((median(hotel.competitors.map(basePrice)) ?? 300) * 0.95);
}

// Quanto cada tipo de noite pesa no preço. As unidades da rede reagem menos que o mercado,
// para a carga mostrar sugestões de "subir" em feriados e eventos.
export const COMPETITOR_FACTOR: Record<DateKind, number> = { util: 1, fim_de_semana: 1.1, vespera: 1.14, feriado: 1.24, evento: 1.2 };
export const OWN_FACTOR: Record<DateKind, number> = { util: 1, fim_de_semana: 1.05, vespera: 1.03, feriado: 1.03, evento: 1.02 };

export function exampleRate(
  id: string,
  base: number,
  day: number,
  kind: DateKind,
  weekday: number,
  role: 'own' | 'competitor',
  suspect: boolean,
): { status: 'ok' | 'sold_out'; price: number | null } {
  let factor = (role === 'own' ? OWN_FACTOR : COMPETITOR_FACTOR)[kind];
  if (kind === 'util' && weekday === 0) factor *= role === 'own' ? 0.97 : 0.94; // noite de domingo
  if (role === 'competitor') {
    const roll = chance(id, day);
    if (suspect && roll < 45) return { status: 'sold_out', price: null };
    if ((kind === 'feriado' || kind === 'evento') && roll < 35) return { status: 'sold_out', price: null };
    if (kind === 'vespera' && roll < 15) return { status: 'sold_out', price: null };
    if (suspect) factor *= 1.28;
  }
  return { status: 'ok', price: Math.round(base * factor * (1 + variation(id, day) / 2)) };
}

type CheckDoc = {
  propertyId: string;
  propertyName: string;
  status: string;
  price: number | null;
  checkedAt: string;
  stayDate: string;
};

/** Histórico dos últimos dias: o preço da própria noite, uma leitura por dia. */
function historyFor(property: Property): CheckDoc[] {
  const { latest } = property;
  if (!latest.checkedAt) return [];
  const base = latest.price ?? latest.previousPrice;
  const lastTime = new Date(latest.checkedAt).getTime();
  const make = (status: string, price: number | null, checkedAt: string): CheckDoc => ({
    propertyId: property.id,
    propertyName: property.name,
    status,
    price,
    checkedAt,
    stayDate: dayKeyBrt(new Date(checkedAt)),
  });
  const checks: CheckDoc[] = [];

  if (base !== null && base !== undefined) {
    for (let day = HISTORY_DAYS; day >= 1; day--) {
      checks.push(make('ok', Math.round(base * (1 + variation(property.id, day))), new Date(lastTime - day * DAY_MS).toISOString()));
    }
  }

  // Preço antes da mudança de hoje (para o "era R$ ... até as HH:MM" bater com o histórico).
  if (latest.previousPrice !== undefined && latest.changedAt) {
    checks.push(make('ok', latest.previousPrice, new Date(new Date(latest.changedAt).getTime() - 60 * 60 * 1000).toISOString()));
  }

  checks.push(make(latest.status, latest.status === 'ok' ? latest.price : null, latest.checkedAt));
  return checks;
}
