// Mercado por data de estadia: preços dos concorrentes, tipo de data, sugestão de preço,
// nível de demanda e datas suspeitas de evento. Funções puras, sem React nem Firebase.

import type { CalendarEvent, Hotel, RateCheck } from '@/types';

import { addDays, weekdayOf } from './dates';
import { formatBRL, formatBRLShort, formatPct } from './format';
import { diffPct, priceState } from './pricing';

// ---------- índice de tarifas ----------

/** Preço vigente de uma propriedade para uma noite: a leitura mais recente com preço ou esgotada. */
export type StayRate = { status: 'ok' | 'sold_out'; price: number | null; checkedAt: string };
export type RateIndex = Map<string, StayRate>;

const rateKey = (propertyId: string, stayDate: string) => `${propertyId}|${stayDate}`;

/** Monta o índice propriedade + data -> leitura mais recente. Falhas não apagam um preço já conhecido. */
export function buildRateIndex(checks: RateCheck[]): RateIndex {
  const index: RateIndex = new Map();
  for (const check of checks) {
    if (!check.stayDate) continue;
    const valid = (check.status === 'ok' && typeof check.price === 'number') || check.status === 'sold_out';
    if (!valid) continue;
    const key = rateKey(check.propertyId, check.stayDate);
    const current = index.get(key);
    if (current && current.checkedAt >= check.checkedAt) continue;
    index.set(key, {
      status: check.status === 'ok' ? 'ok' : 'sold_out',
      price: check.status === 'ok' ? check.price : null,
      checkedAt: check.checkedAt,
    });
  }
  return index;
}

export function rateFor(index: RateIndex, propertyId: string, stayDate: string): StayRate | null {
  return index.get(rateKey(propertyId, stayDate)) ?? null;
}

/** Histórico de preços de uma propriedade para uma noite, do mais antigo para o mais novo. */
export function priceEvolution(checks: RateCheck[], propertyId: string, stayDate: string): RateCheck[] {
  return checks
    .filter((c) => c.propertyId === propertyId && c.stayDate === stayDate && (c.status === 'ok' || c.status === 'sold_out'))
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
    // Mantém só as mudanças: leituras repetidas com o mesmo preço/status não acrescentam informação.
    .filter((c, i, all) => i === 0 || c.status !== all[i - 1].status || c.price !== all[i - 1].price);
}

// ---------- mercado de uma data ----------

export type DateMarket = {
  date: string;
  own: StayRate | null;
  /** Preço da unidade, quando há leitura com preço. */
  ownPrice: number | null;
  /** Preços dos concorrentes com leitura válida. */
  prices: number[];
  soldOut: number;
  /** Concorrentes cadastrados (com ou sem leitura). */
  competitorCount: number;
  min: number | null;
  median: number | null;
  max: number | null;
};

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function toMarket(date: string, own: StayRate | null, rates: (StayRate | null)[], competitorCount: number): DateMarket {
  const prices = rates.filter((r): r is StayRate => r?.status === 'ok' && r.price !== null).map((r) => r.price as number);
  return {
    date,
    own,
    ownPrice: own?.status === 'ok' ? own.price : null,
    prices,
    soldOut: rates.filter((r) => r?.status === 'sold_out').length,
    competitorCount,
    min: prices.length ? Math.min(...prices) : null,
    median: median(prices),
    max: prices.length ? Math.max(...prices) : null,
  };
}

/** Mercado de um hotel numa noite, a partir das tarifas por data de estadia. */
export function marketFor(hotel: Hotel, date: string, index: RateIndex): DateMarket {
  return toMarket(
    date,
    rateFor(index, hotel.own.id, date),
    hotel.competitors.map((c) => rateFor(index, c.id, date)),
    hotel.competitors.length,
  );
}

/** Mercado de hoje a partir do "latest" do painel (o mesmo dado dos cartões). */
export function marketFromLatest(hotel: Hotel, now: Date, date: string): DateMarket {
  const fromLatest = (p: Hotel['own']): StayRate | null => {
    const state = priceState(p, now);
    if (state === 'sold_out') return { status: 'sold_out', price: null, checkedAt: p.latest.checkedAt ?? '' };
    if (state === 'ok' && p.latest.price !== null) return { status: 'ok', price: p.latest.price, checkedAt: p.latest.checkedAt ?? '' };
    return null;
  };
  return toMarket(date, fromLatest(hotel.own), hotel.competitors.map(fromLatest), hotel.competitors.length);
}

// ---------- tipo de data ----------

export type DateKind = 'feriado' | 'evento' | 'vespera' | 'fim_de_semana' | 'util';
export type DateInfo = { kind: DateKind; label: string; name?: string };

export const DATE_KIND_LABEL: Record<DateKind, string> = {
  feriado: 'Feriado',
  evento: 'Evento',
  vespera: 'Véspera de feriado',
  fim_de_semana: 'Fim de semana',
  util: 'Dia útil',
};

const appliesTo = (event: CalendarEvent, city: string | undefined) => event.city === '' || event.city === (city ?? '');

/**
 * Classifica a noite: feriado (nacional ou cadastrado), evento cadastrado, véspera de feriado,
 * fim de semana (noites de sexta e sábado) ou dia útil.
 */
export function dateInfo(date: string, city: string | undefined, holidays: Map<string, string>, events: CalendarEvent[]): DateInfo {
  const holidayName = (d: string) =>
    holidays.get(d) ?? events.find((e) => e.kind === 'feriado' && e.date === d && appliesTo(e, city))?.name;

  const holiday = holidayName(date);
  if (holiday) return { kind: 'feriado', label: DATE_KIND_LABEL.feriado, name: holiday };

  const event = events.find((e) => e.kind === 'evento' && e.date === date && appliesTo(e, city));
  if (event) return { kind: 'evento', label: DATE_KIND_LABEL.evento, name: event.name };

  const next = holidayName(addDays(date, 1));
  if (next) return { kind: 'vespera', label: DATE_KIND_LABEL.vespera, name: next };

  const wd = weekdayOf(date);
  if (wd === 5 || wd === 6) return { kind: 'fim_de_semana', label: DATE_KIND_LABEL.fim_de_semana };
  return { kind: 'util', label: DATE_KIND_LABEL.util };
}

export const isSpecial = (info: DateInfo) => info.kind === 'feriado' || info.kind === 'evento';

// ---------- sugestão de preço ----------

/** Diferença até a qual a unidade é considerada alinhada com a mediana. */
export const ALIGNED_PCT = 3;

export type SuggestionAction = 'subir' | 'baixar' | 'manter' | 'definir' | 'esgotado' | 'sem_dados';

export type Suggestion = {
  action: SuggestionAction;
  low: number | null;
  high: number | null;
  /** Diferença % da unidade em relação à mediana do mercado. */
  gapPct: number | null;
  /** Explicação da sugestão, em frases curtas. */
  reasons: string[];
};

const round5 = (value: number) => Math.round(value / 5) * 5;

function dateReason(info: DateInfo): string | null {
  switch (info.kind) {
    case 'feriado':
      return `Feriado: ${info.name}.`;
    case 'evento':
      return `Evento cadastrado: ${info.name}.`;
    case 'vespera':
      return `Véspera de feriado (${info.name}).`;
    case 'fim_de_semana':
      return 'Noite de fim de semana.';
    case 'util':
      return null;
  }
}

/**
 * Sugere uma faixa de preço para a unidade numa data.
 * A faixa acompanha a mediana dos concorrentes (de -3% a +2%), sobe um pouco quando há
 * concorrentes esgotados e nunca fica abaixo do preço-piso. A regra não é "ficar abaixo do
 * concorrente": isso levaria a uma corrida de preço e à perda de margem.
 */
export function suggestPrice(market: DateMarket, info: DateInfo, floorPrice?: number): Suggestion {
  // Todos os concorrentes esgotados: não há preço de mercado, mas é o sinal de demanda mais forte.
  // A faixa parte da própria diária (+10% a +20%), respeitando o preço-piso.
  if (market.median === null && market.competitorCount > 0 && market.soldOut === market.competitorCount) {
    const reasons = [`Todos os ${market.competitorCount} concorrentes estão esgotados nesta data: demanda muito alta.`];
    const why = dateReason(info);
    if (why) reasons.push(why);
    if (market.own?.status === 'sold_out') {
      return { action: 'esgotado', low: null, high: null, gapPct: null, reasons: ['Sua unidade também está esgotada nesta data.', ...reasons] };
    }
    if (market.ownPrice === null) {
      return { action: 'sem_dados', low: null, high: null, gapPct: null, reasons: [...reasons, 'Registre o preço da sua unidade para receber uma faixa.'] };
    }
    let low = round5(market.ownPrice * 1.1);
    let high = round5(market.ownPrice * 1.2);
    if (floorPrice && floorPrice > 0 && low < floorPrice) {
      low = floorPrice;
      if (high < low) high = low;
    }
    reasons.splice(1, 0, `Sua diária: ${formatBRL(market.ownPrice)}. Sem preço de mercado para comparar, a faixa parte dela (+10% a +20%).`);
    return { action: 'subir', low, high, gapPct: null, reasons };
  }
  if (market.median === null) {
    return {
      action: 'sem_dados',
      low: null,
      high: null,
      gapPct: null,
      reasons: ['Ainda não há preços de concorrentes para esta data. Registre leituras para receber uma sugestão.'],
    };
  }

  const reasons: string[] = [`Mediana dos ${market.prices.length} concorrentes com preço: ${formatBRL(market.median)}.`];

  let bonus = 0;
  if (market.soldOut > 0) {
    const half = market.soldOut * 2 >= market.competitorCount;
    bonus = half ? 0.04 : 0.02;
    reasons.push(
      `${market.soldOut} de ${market.competitorCount} concorrentes esgotados: sinal de demanda ${half ? 'alta' : 'acima do normal'}.`,
    );
  }
  const why = dateReason(info);
  if (why) reasons.push(why);

  let low = round5(market.median * (0.97 + bonus));
  let high = round5(market.median * (1.02 + bonus));
  if (floorPrice && floorPrice > 0) {
    if (low < floorPrice) low = floorPrice;
    if (high < low) high = low;
    reasons.push(`Preço-piso da unidade (${formatBRL(floorPrice)}) respeitado.`);
  }

  if (market.own?.status === 'sold_out') {
    return { action: 'esgotado', low, high, gapPct: null, reasons: ['Sua unidade já está esgotada nesta data.', ...reasons] };
  }
  if (market.ownPrice === null) {
    return { action: 'definir', low, high, gapPct: null, reasons: ['Ainda não há preço da sua unidade para esta data.', ...reasons] };
  }

  const gap = diffPct(market.ownPrice, market.median);
  reasons.splice(1, 0, `Sua diária: ${formatBRL(market.ownPrice)} (${formatPct(gap)} em relação à mediana).`);
  const inRange = market.ownPrice >= low && market.ownPrice <= high;
  const action: SuggestionAction =
    inRange || Math.abs(gap) <= ALIGNED_PCT ? 'manter' : market.ownPrice < low ? 'subir' : 'baixar';
  if (action === 'baixar') {
    reasons.push('A faixa acompanha a mediana, sem buscar ser o mais barato: evita corrida de preço e perda de margem.');
  }
  return { action, low, high, gapPct: gap, reasons };
}

/** Texto curto da sugestão, para cartões e listas. */
export function suggestionLabel(s: Suggestion): string {
  const range = s.low !== null && s.high !== null ? `${formatBRLShort(s.low)} a ${formatBRLShort(s.high)}` : '';
  switch (s.action) {
    case 'subir':
      return `Subir para ${range}`;
    case 'baixar':
      return `Baixar para ${range}`;
    case 'manter':
      return 'Manter o preço';
    case 'definir':
      return `Definir entre ${range}`;
    case 'esgotado':
      return 'Esgotado: sem ação';
    case 'sem_dados':
      return 'Sem dados para sugerir';
  }
}

// ---------- nível de demanda e calendário ----------

export type DemandLevel = 0 | 1 | 2 | 3;
export const DEMAND_LABELS: Record<DemandLevel, string> = { 0: 'Baixa', 1: 'Média', 2: 'Alta', 3: 'Pico' };

/** Compara a mediana do dia com a mediana típica da localização. */
export function demandLevel(dayMedian: number, baseline: number, soldOutShare: number): DemandLevel {
  const ratio = dayMedian / baseline;
  let level: DemandLevel = ratio < 0.97 ? 0 : ratio < 1.05 ? 1 : ratio < 1.15 ? 2 : 3;
  if (soldOutShare >= 0.5 && level < 3) level = (level + 1) as DemandLevel;
  return level;
}

/** Mediana de todos os preços de concorrentes do grupo de hotéis no período: o "dia comum" da localização. */
export function baselineFor(hotels: Hotel[], dates: string[], index: RateIndex): number | null {
  const prices: number[] = [];
  for (const hotel of hotels) for (const date of dates) prices.push(...marketFor(hotel, date, index).prices);
  return median(prices);
}

export type CityDay = {
  date: string;
  median: number | null;
  ownAvg: number | null;
  soldOut: number;
  competitorCount: number;
  level: DemandLevel | null;
};

/** Resumo de uma localização (um ou mais hotéis) numa noite. */
export function cityDay(hotels: Hotel[], date: string, index: RateIndex, baseline: number | null): CityDay {
  const markets = hotels.map((h) => marketFor(h, date, index));
  const prices = markets.flatMap((m) => m.prices);
  const own = markets.map((m) => m.ownPrice).filter((p): p is number => p !== null);
  const soldOut = markets.reduce((sum, m) => sum + m.soldOut, 0);
  const competitorCount = markets.reduce((sum, m) => sum + m.competitorCount, 0);
  const dayMedian = median(prices);
  return {
    date,
    median: dayMedian,
    ownAvg: own.length ? own.reduce((a, b) => a + b, 0) / own.length : null,
    soldOut,
    competitorCount,
    level:
      dayMedian !== null && baseline ? demandLevel(dayMedian, baseline, competitorCount ? soldOut / competitorCount : 0) : null,
  };
}

// ---------- datas suspeitas de evento ----------

/** Alta de preço (%) a partir da qual um concorrente conta como "subiu" para a detecção de evento. */
export const EVENT_RISE_PCT = 15;

export type SuspectedEvent = { date: string; city: string; flagged: number; soldOut: number; total: number };

/**
 * Aponta datas comuns (sem feriado nem evento cadastrado) em que pelo menos metade dos concorrentes
 * da localização, e no mínimo 2, subiram mais de 15% sobre o próprio preço típico ou esgotaram.
 */
export function detectSuspectedEvents(
  hotels: Hotel[],
  dates: string[],
  index: RateIndex,
  holidays: Map<string, string>,
  events: CalendarEvent[],
): SuspectedEvent[] {
  const byCity = groupByCity(hotels);
  const found: SuspectedEvent[] = [];

  for (const [city, cityHotels] of byCity) {
    const competitors = cityHotels.flatMap((h) => h.competitors);
    const typical = new Map<string, number | null>();
    for (const c of competitors) {
      const prices = dates
        .map((d) => rateFor(index, c.id, d))
        .filter((r): r is StayRate => r?.status === 'ok' && r.price !== null)
        .map((r) => r.price as number);
      typical.set(c.id, median(prices));
    }

    for (const date of dates) {
      const info = dateInfo(date, city, holidays, events);
      if (info.kind !== 'util' && info.kind !== 'fim_de_semana') continue;
      const dismissed = events.some((e) => e.kind === 'descartado' && e.date === date && appliesTo(e, city));
      if (dismissed) continue;

      let total = 0;
      let flagged = 0;
      let soldOut = 0;
      for (const c of competitors) {
        const r = rateFor(index, c.id, date);
        if (!r) continue;
        total++;
        const base = typical.get(c.id);
        if (r.status === 'sold_out') {
          soldOut++;
          flagged++;
        } else if (base && r.price !== null && r.price > base * (1 + EVENT_RISE_PCT / 100)) {
          flagged++;
        }
      }
      if (flagged >= 2 && flagged * 2 >= total) found.push({ date, city, flagged, soldOut, total });
    }
  }
  return found.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- rede ----------

export const NO_CITY = 'Sem localização';

export function cityOf(hotel: Hotel): string {
  return hotel.city?.trim() || NO_CITY;
}

export function groupByCity(hotels: Hotel[]): Map<string, Hotel[]> {
  const map = new Map<string, Hotel[]>();
  for (const h of hotels) {
    const city = cityOf(h);
    map.set(city, [...(map.get(city) ?? []), h]);
  }
  return map;
}

export function citiesOf(hotels: Hotel[]): string[] {
  return [...groupByCity(hotels).keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export type SpecialDate = {
  date: string;
  info: DateInfo;
  /** Quanto a mediana do mercado nessa data está acima da mediana de um dia comum. */
  risePct: number | null;
  soldOut: number;
  competitorCount: number;
  /** Unidades com diária abaixo da faixa sugerida nessa data. */
  unitsToRaise: Hotel[];
};

/** Próximo feriado ou evento no período, com o efeito no mercado e as unidades que deveriam subir. */
export function nextSpecialDate(
  hotels: Hotel[],
  dates: string[],
  index: RateIndex,
  holidays: Map<string, string>,
  events: CalendarEvent[],
): SpecialDate | null {
  const baseline = baselineFor(hotels, dates, index);
  for (const date of dates) {
    const special = hotels
      .map((h) => ({ h, info: dateInfo(date, h.city, holidays, events) }))
      .filter((x) => isSpecial(x.info));
    if (!special.length) continue;

    const day = cityDay(hotels, date, index, baseline);
    const unitsToRaise = hotels.filter((h) => {
      const s = suggestPrice(marketFor(h, date, index), dateInfo(date, h.city, holidays, events), h.floorPrice);
      return s.action === 'subir';
    });
    return {
      date,
      info: special[0].info,
      risePct: day.median !== null && baseline ? diffPct(day.median, baseline) : null,
      soldOut: day.soldOut,
      competitorCount: day.competitorCount,
      unitsToRaise,
    };
  }
  return null;
}
