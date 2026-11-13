// Formatação brasileira feita à mão, sem depender de Intl,
// para o resultado ser idêntico em Android, iOS e web.

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // Brasília não tem horário de verão.

function toBrt(date: Date): Date {
  return new Date(date.getTime() + BRT_OFFSET_MS);
}

/** 1234.5 -> "R$ 1.234,50" */
export function formatBRL(value: number): string {
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}R$ ${grouped},${dec}`;
}

/** 17.72 -> "+17,7%" · -0.68 -> "−0,7%" */
export function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toFixed(1).replace('.', ',')}%`;
}

/** Hora no fuso de Brasília: "14:00" */
export function formatTime(iso: string | Date): string {
  const d = toBrt(typeof iso === 'string' ? new Date(iso) : iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Hora cheia (0 a 23) no fuso de Brasília. */
export function hourInBrt(date: Date): number {
  return toBrt(date).getUTCHours();
}
