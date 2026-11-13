// Monta as séries do gráfico de 7 dias a partir do histórico de leituras (funções puras).

import type { Property } from '@/types';

import { dayKeyBrt, formatDayMonth } from './format';

export const HISTORY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Uma leitura do histórico (documento da subcoleção checks). */
export type HistoryCheck = {
  propertyId: string;
  status: string;
  price: number | null;
  /** Data e hora da leitura (ISO 8601). */
  checkedAt: string;
};

export type HistorySeries = {
  propertyId: string;
  name: string;
  /** true para o hotel próprio (linha destacada no gráfico). */
  own: boolean;
  /** Um valor por dia, do mais antigo para hoje. null = sem preço válido no dia. */
  points: (number | null)[];
};

export type HistoryChartData = {
  /** Rótulos dos dias, "dd/mm", do mais antigo para hoje. */
  days: string[];
  series: HistorySeries[];
  /** false quando nenhuma propriedade tem preço no período. */
  hasData: boolean;
};

/** Início da janela do gráfico: 7 dias atrás, com folga para o fuso. */
export function historyStart(now: Date): Date {
  return new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
}

/**
 * Para cada propriedade, pega o último preço válido de cada um dos últimos 7 dias
 * (dias contados no fuso de Brasília). Esgotado e falha não geram ponto.
 */
export function buildHistoryChart(checks: HistoryCheck[], own: Property, competitors: Property[], now: Date): HistoryChartData {
  const dayDates = Array.from({ length: HISTORY_DAYS }, (_, i) => new Date(now.getTime() - (HISTORY_DAYS - 1 - i) * DAY_MS));
  const dayKeys = dayDates.map(dayKeyBrt);

  // Último preço válido de cada propriedade em cada dia.
  const latestByCell = new Map<string, { price: number; at: number }>();
  for (const check of checks) {
    if (check.status !== 'ok' || check.price === null) continue;
    const at = new Date(check.checkedAt).getTime();
    if (Number.isNaN(at)) continue;
    const cell = `${check.propertyId}|${dayKeyBrt(new Date(at))}`;
    const current = latestByCell.get(cell);
    if (!current || at > current.at) latestByCell.set(cell, { price: check.price, at });
  }

  const toSeries = (property: Property, isOwn: boolean): HistorySeries => ({
    propertyId: property.id,
    name: property.name,
    own: isOwn,
    points: dayKeys.map((key) => latestByCell.get(`${property.id}|${key}`)?.price ?? null),
  });

  const series = [toSeries(own, true), ...competitors.map((c) => toSeries(c, false))];
  return {
    days: dayDates.map(formatDayMonth),
    series,
    hasData: series.some((s) => s.points.some((p) => p !== null)),
  };
}

/** Menor e maior preço do gráfico, com uma margem para a linha não encostar na borda. */
export function priceRange(series: HistorySeries[]): { min: number; max: number } {
  const values = series.flatMap((s) => s.points).filter((p): p is number => p !== null);
  if (!values.length) return { min: 0, max: 1 };
  const low = Math.min(...values);
  const high = Math.max(...values);
  const margin = Math.max((high - low) * 0.1, high * 0.02, 1);
  return { min: Math.max(0, low - margin), max: high + margin };
}
