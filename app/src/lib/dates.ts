// Datas de estadia como texto "AAAA-MM-DD" (funções puras).
// A conta é feita em UTC sobre a própria data, então não há erro de fuso nem de horário de verão.

import { dayKeyBrt } from './format';

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
export const WEEKDAY_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;
export const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const toUtc = (key: string) => new Date(`${key}T00:00:00Z`);

/** Data de hoje no fuso de Brasília. */
export function todayKey(now: Date): string {
  return dayKeyBrt(now);
}

export function addDays(key: string, days: number): string {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dias entre duas datas (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado. */
export function weekdayOf(key: string): number {
  return toUtc(key).getUTCDay();
}

/** Lista de datas a partir de start, com count dias. */
export function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** "2026-11-20" -> "20/11/2026" */
export function formatKey(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-11-20" -> "20/11" */
export function formatKeyShort(key: string): string {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

/** "2026-11-20" -> "20/11/2026 (sexta-feira)" */
export function formatKeyWithWeekday(key: string): string {
  return `${formatKey(key)} (${WEEKDAY_LONG[weekdayOf(key)]})`;
}

/** "2026-11" a partir de uma data. */
export function monthOf(key: string): string {
  return key.slice(0, 7);
}

/** Primeiro dia do mês ("2026-11-01"). */
export function monthStart(month: string): string {
  return `${month}-01`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Mês anterior ou seguinte ("2026-11", +1 -> "2026-12"). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-11" -> "Novembro de 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTH_NAMES[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

/** Date ao meio-dia de Brasília da data, para os seletores de data (sem risco de virar o dia). */
export function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00-03:00`);
}
