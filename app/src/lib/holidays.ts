// Feriados nacionais do Brasil, calculados (funções puras).
// Os móveis (Carnaval, Sexta-feira Santa, Corpus Christi) dependem da Páscoa.
// Feriados estaduais e municipais são cadastrados pelo usuário no Calendário.

import { addDays } from './dates';

export type Holiday = { date: string; name: string };

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Feriados nacionais e pontos facultativos de grande impacto na hotelaria. */
export function nationalHolidays(year: number): Holiday[] {
  const fixed = (md: string, name: string): Holiday => ({ date: `${year}-${md}`, name });
  const pascoa = easter(year);
  return [
    fixed('01-01', 'Confraternização Universal'),
    { date: addDays(pascoa, -48), name: 'Carnaval' },
    { date: addDays(pascoa, -47), name: 'Carnaval' },
    { date: addDays(pascoa, -2), name: 'Sexta-feira Santa' },
    fixed('04-21', 'Tiradentes'),
    fixed('05-01', 'Dia do Trabalho'),
    { date: addDays(pascoa, 60), name: 'Corpus Christi' },
    fixed('09-07', 'Independência do Brasil'),
    fixed('10-12', 'Nossa Senhora Aparecida'),
    fixed('11-02', 'Finados'),
    fixed('11-15', 'Proclamação da República'),
    fixed('11-20', 'Consciência Negra'),
    fixed('12-25', 'Natal'),
  ].sort((x, y) => x.date.localeCompare(y.date));
}

/** Mapa data -> nome, cobrindo os anos pedidos (ex.: ano atual e o seguinte). */
export function holidayMap(years: number[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const year of years) for (const h of nationalHolidays(year)) map.set(h.date, h.name);
  return map;
}
