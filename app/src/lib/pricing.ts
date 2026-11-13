// Regras de negócio puras (sem React, sem Firebase): fáceis de testar e de reutilizar.

import type { Hotel, Property } from '@/types';

import { hourInBrt } from './format';

export const COLLECT_START_HOUR = 8;
export const COLLECT_END_HOUR = 20;
/** Sem leitura válida há mais que isso, dentro do horário de coleta, o preço é "desatualizado". */
export const STALE_AFTER_MINUTES = 90;

export type PriceState = 'ok' | 'sold_out' | 'stale' | 'failed';

export type Direction = 'above' | 'below' | 'equal';

export type HotelSummary = {
  hotel: Hotel;
  state: PriceState;
  /** Média dos concorrentes com preço válido. null se nenhum tiver. */
  competitorAvg: number | null;
  /** Diferença % do hotel em relação à média. null quando não é comparável. */
  diffPct: number | null;
  direction: Direction | null;
  /** true quando |diferença| passa do limite do cliente. */
  highlighted: boolean;
  /** Posição do hotel entre os 4 preços, do mais barato (1) ao mais caro. */
  rank: { position: number; total: number } | null;
};

export function isWithinCollectHours(now: Date): boolean {
  const h = hourInBrt(now);
  return h >= COLLECT_START_HOUR && h <= COLLECT_END_HOUR;
}

export function priceState(property: Property, now: Date): PriceState {
  const { status, price, checkedAt } = property.latest;
  if (status === 'sold_out') return 'sold_out';
  if (price === null || checkedAt === null) return 'failed';
  if (status !== 'ok') return 'stale'; // falhou agora, mas existe um preço válido anterior
  const ageMin = (now.getTime() - new Date(checkedAt).getTime()) / 60000;
  if (isWithinCollectHours(now) && ageMin > STALE_AFTER_MINUTES) return 'stale';
  return 'ok';
}

/** Preço utilizável em comparação: só o de uma leitura atual e válida. */
function comparablePrice(property: Property, now: Date): number | null {
  return priceState(property, now) === 'ok' ? property.latest.price : null;
}

export function diffPct(value: number, base: number): number {
  return ((value - base) / base) * 100;
}

export function summarizeHotel(hotel: Hotel, thresholdPct: number, now: Date): HotelSummary {
  const state = priceState(hotel.own, now);
  const competitorPrices = hotel.competitors
    .map((c) => comparablePrice(c, now))
    .filter((p): p is number => p !== null);
  const competitorAvg = competitorPrices.length
    ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
    : null;

  const ownPrice = comparablePrice(hotel.own, now);
  if (ownPrice === null || competitorAvg === null) {
    return { hotel, state, competitorAvg, diffPct: null, direction: null, highlighted: false, rank: null };
  }

  const diff = diffPct(ownPrice, competitorAvg);
  const direction: Direction = diff > 0 ? 'above' : diff < 0 ? 'below' : 'equal';
  const cheaperCount = competitorPrices.filter((p) => p < ownPrice).length;

  return {
    hotel,
    state,
    competitorAvg,
    diffPct: diff,
    direction,
    highlighted: Math.abs(diff) > thresholdPct,
    rank: { position: cheaperCount + 1, total: competitorPrices.length + 1 },
  };
}

/** Em destaque no topo, sem leitura comparável no fim; dentro de cada grupo, a ordem do cadastro. */
export function sortForDashboard(summaries: HotelSummary[]): HotelSummary[] {
  const group = (s: HotelSummary) => (s.highlighted ? 0 : s.diffPct !== null ? 1 : 2);
  return [...summaries].sort((a, b) => group(a) - group(b) || a.hotel.order - b.hotel.order);
}

export function countSummary(summaries: HotelSummary[]) {
  return {
    above: summaries.filter((s) => s.direction === 'above').length,
    below: summaries.filter((s) => s.direction === 'below').length,
    highlighted: summaries.filter((s) => s.highlighted).length,
  };
}

/** Texto do cabeçalho sobre a próxima coleta. */
export function nextUpdateLabel(now: Date): string {
  const h = hourInBrt(now);
  if (h < COLLECT_START_HOUR) return 'Atualizações retomam hoje às 08:00';
  if (h >= COLLECT_END_HOUR) return 'Atualizações retomam amanhã às 08:00';
  return `próxima às ${String(h + 1).padStart(2, '0')}:00`;
}
