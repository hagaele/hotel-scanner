// Central de notificações: os alertas são calculados a partir dos dados (funções puras).
// Cada alerta tem um id estável, para a marcação de "lida" continuar valendo entre aberturas do app.

import type { AlertRules, CalendarEvent, Client, Hotel, RateCheck } from '@/types';

import { dateRange, formatKey, formatKeyShort } from './dates';
import { formatBRL, formatPct, formatTime } from './format';
import {
  buildRateIndex,
  dateInfo,
  detectSuspectedEvents,
  EVENT_RISE_PCT,
  isSpecial,
  marketFor,
  suggestPrice,
  type RateIndex,
} from './market';
import { diffPct, priceState, summarizeHotel } from './pricing';

export type AlertSeverity = 'alta' | 'media' | 'baixa';

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  /** Unidade ou localização a que o alerta se refere. */
  place: string;
  /** Noite de estadia (DD/MM/AAAA) ou null quando não se aplica. */
  stay: string | null;
  title: string;
  body: string;
  /** Para onde "Abrir" leva. */
  target: { kind: 'hotel'; hotelId: string } | { kind: 'comparativo'; hotelId: string; date: string } | { kind: 'calendario'; date: string; city: string };
  /** Ordenação: mais importante primeiro, depois a data mais próxima. */
  sortKey: string;
};

export const DEFAULT_ALERT_RULES: AlertRules = {
  competitorChangePct: 10,
  outOfRangePct: 10,
  soldOut: true,
  events: true,
  farDates: false,
};

export const COMPETITOR_CHANGE_OPTIONS = [5, 10, 15, 20] as const;
export const OUT_OF_RANGE_OPTIONS = [5, 10, 15, 20] as const;

/**
 * Limite de destaque: diferença para a média do mercado a partir da qual a unidade fica "Em destaque"
 * no painel e gera alerta. É a regra "Unidade fora da média" da aba Alertas (um número só para os dois).
 */
export const highlightPct = (client: Client) => client.alertRules.outOfRangePct;

/** Prioridade alta a partir de 1,5 vez o limite (ex.: limite de 10% -> alta acima de 15%). */
export const HIGH_PRIORITY_FACTOR = 1.5;

/** Dias à frente que os alertas consideram. */
export const horizonDays = (rules: AlertRules) => (rules.farDates ? 60 : 30);

const SEVERITY_ORDER: Record<AlertSeverity, number> = { alta: 0, media: 1, baixa: 2 };

type Input = {
  client: Client;
  hotels: Hotel[];
  checks: RateCheck[];
  index?: RateIndex;
  events: CalendarEvent[];
  holidays: Map<string, string>;
  now: Date;
  today: string;
};

export function buildAlerts({ client, hotels, checks, index = buildRateIndex(checks), events, holidays, now, today }: Input): AlertItem[] {
  const rules = client.alertRules;
  const dates = dateRange(today, horizonDays(rules));
  const alerts: AlertItem[] = [];
  const push = (a: Omit<AlertItem, 'sortKey'>, date: string) =>
    alerts.push({ ...a, sortKey: `${SEVERITY_ORDER[a.severity]}|${date}|${a.id}` });

  for (const hotel of hotels) {
    const name = hotel.own.name;
    const summary = summarizeHotel(hotel, highlightPct(client), now);

    // 1. Unidade fora da média hoje.
    if (summary.highlighted && summary.diffPct !== null && summary.competitorAvg !== null && hotel.own.latest.price !== null) {
      const above = summary.diffPct > 0;
      push(
        {
          id: `faixa|${hotel.id}|${today}|${above ? 'acima' : 'abaixo'}`,
          severity: Math.abs(summary.diffPct) > rules.outOfRangePct * HIGH_PRIORITY_FACTOR ? 'alta' : 'media',
          place: name,
          stay: formatKey(today),
          title: `Sua diária está ${formatPct(Math.abs(summary.diffPct)).replace('+', '')} ${above ? 'acima' : 'abaixo'} da média`,
          body: `${formatBRL(hotel.own.latest.price)} contra média de ${formatBRL(summary.competitorAvg)} dos concorrentes.`,
          target: { kind: 'hotel', hotelId: hotel.id },
        },
        today,
      );
    }

    // 2. Concorrente mudou o preço de hoje acima do limite.
    for (const c of hotel.competitors) {
      const { price, previousPrice, changedAt } = c.latest;
      if (price === null || previousPrice === undefined || !changedAt) continue;
      if (priceState(c, now) !== 'ok') continue;
      const change = diffPct(price, previousPrice);
      if (Math.abs(change) <= rules.competitorChangePct) continue;
      push(
        {
          id: `mudanca|${c.id}|${changedAt}`,
          severity: 'media',
          place: name,
          stay: formatKey(today),
          title: `${c.name} ${change > 0 ? 'subiu' : 'baixou'} ${formatPct(Math.abs(change)).replace('+', '')}`,
          body: `De ${formatBRL(previousPrice)} para ${formatBRL(price)} às ${formatTime(changedAt)}.`,
          target: { kind: 'hotel', hotelId: hotel.id },
        },
        today,
      );
    }

    // 3. Concorrentes esgotados em datas futuras (agrupado por unidade, para não lotar a central).
    if (rules.soldOut) {
      const soldDates = dates.filter((d) => {
        const m = marketFor(hotel, d, index);
        return m.soldOut > 0 && m.soldOut * 2 >= m.competitorCount;
      });
      if (soldDates.length) {
        const first = soldDates[0];
        const m = marketFor(hotel, first, index);
        push(
          {
            id: `esgotado|${hotel.id}|${soldDates.join(',')}`,
            severity: 'alta',
            place: name,
            stay: formatKey(first),
            title:
              soldDates.length === 1
                ? `${m.soldOut} de ${m.competitorCount} concorrentes esgotados`
                : `Concorrentes esgotados em ${soldDates.length} datas`,
            body:
              soldDates.length === 1
                ? 'Demanda alta nessa noite. Confira a faixa sugerida no comparativo.'
                : `Datas: ${soldDates.slice(0, 5).map(formatKeyShort).join(', ')}${soldDates.length > 5 ? '...' : ''}. Demanda alta: confira a faixa sugerida.`,
            target: { kind: 'comparativo', hotelId: hotel.id, date: first },
          },
          first,
        );
      }
    }

    // 4. Feriados e eventos com a diária abaixo da faixa sugerida.
    const toRaise = dates.filter((d) => {
      const info = dateInfo(d, hotel.city, holidays, events);
      if (!isSpecial(info)) return false;
      return suggestPrice(marketFor(hotel, d, index), info, hotel.floorPrice).action === 'subir';
    });
    if (toRaise.length) {
      const first = toRaise[0];
      const info = dateInfo(first, hotel.city, holidays, events);
      const s = suggestPrice(marketFor(hotel, first, index), info, hotel.floorPrice);
      push(
        {
          id: `subir|${hotel.id}|${toRaise.join(',')}`,
          severity: 'alta',
          place: name,
          stay: formatKey(first),
          title: `Diária de dia comum em ${info.name ?? info.label}`,
          body: `Sugestão: ${formatBRL(s.low ?? 0)} a ${formatBRL(s.high ?? 0)}.${toRaise.length > 1 ? ` ${toRaise.length - 1 === 1 ? 'Outra data especial está' : `Outras ${toRaise.length - 1} datas especiais estão`} na mesma situação.` : ''}`,
          target: { kind: 'comparativo', hotelId: hotel.id, date: first },
        },
        first,
      );
    }

    // 5. Sem leitura atual da própria unidade.
    const state = priceState(hotel.own, now);
    if (state === 'failed' || state === 'stale' || state === 'none') {
      push(
        {
          id: `leitura|${hotel.id}|${today}|${state}`,
          severity: 'baixa',
          place: name,
          stay: null,
          title: state === 'stale' ? 'Preço desatualizado' : 'Sem leitura de preço hoje',
          body: 'Registre uma leitura para a unidade voltar a ser comparada no painel.',
          target: { kind: 'hotel', hotelId: hotel.id },
        },
        today,
      );
    }
  }

  // 6. Possível evento na localização.
  if (rules.events) {
    for (const s of detectSuspectedEvents(hotels, dates, index, holidays, events)) {
      push(
        {
          id: `evento|${s.city}|${s.date}`,
          severity: 'media',
          place: s.city,
          stay: formatKey(s.date),
          title: 'Possível evento detectado',
          body: `${s.flagged} de ${s.total} concorrentes subiram mais de ${EVENT_RISE_PCT}% ou esgotaram, sem feriado cadastrado. Confirme no calendário.`,
          target: { kind: 'calendario', date: s.date, city: s.city },
        },
        s.date,
      );
    }
  }

  return alerts.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export type AlertFilter = 'all' | 'unread' | 'high';

export function filterAlerts(alerts: AlertItem[], filter: AlertFilter, read: Record<string, boolean>): AlertItem[] {
  if (filter === 'unread') return alerts.filter((a) => !read[a.id]);
  if (filter === 'high') return alerts.filter((a) => a.severity === 'alta');
  return alerts;
}

/** Converte o documento do Firestore em regras, com os padrões para campos ausentes. */
export function toAlertRules(raw: unknown): AlertRules {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pick = (value: unknown, allowed: readonly number[], fallback: number) =>
    typeof value === 'number' && allowed.includes(value) ? value : fallback;
  return {
    competitorChangePct: pick(r.competitorChangePct, COMPETITOR_CHANGE_OPTIONS, DEFAULT_ALERT_RULES.competitorChangePct),
    outOfRangePct: pick(r.outOfRangePct, OUT_OF_RANGE_OPTIONS, DEFAULT_ALERT_RULES.outOfRangePct),
    soldOut: typeof r.soldOut === 'boolean' ? r.soldOut : DEFAULT_ALERT_RULES.soldOut,
    events: typeof r.events === 'boolean' ? r.events : DEFAULT_ALERT_RULES.events,
    farDates: typeof r.farDates === 'boolean' ? r.farDates : DEFAULT_ALERT_RULES.farDates,
  };
}
