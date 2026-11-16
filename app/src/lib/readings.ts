// Regras do formulário "Registrar leitura de preço" (funções puras, sem React nem Firebase).

import type { LatestCheck } from '@/types';

/** Status que a pessoa pode registrar à mão. */
export type ReadingStatus = 'ok' | 'sold_out' | 'failed';

export type Reading = {
  status: ReadingStatus;
  /** Preço em reais. Só existe quando status = 'ok'. */
  price: number | null;
  /** Data e hora da leitura (ISO 8601). */
  checkedAt: string;
  /** Noite a que o preço se refere ("AAAA-MM-DD"). Hoje = preço do painel; datas futuras = comparativo e calendário. */
  stayDate: string;
};

export const MAX_PRICE = 100_000;
/** Diária abaixo disso quase sempre é erro de digitação (ex.: 1,90 no lugar de 190). */
export const MIN_PRICE = 10;

/**
 * Converte o texto digitado em número, no formato brasileiro:
 * "389" → 389 · "389,90" → 389.9 · "1.234,56" → 1234.56 · "R$ 1.234" → 1234.
 * Devolve null quando não dá para entender.
 */
export function parsePriceInput(text: string): number | null {
  const cleaned = text.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!cleaned) return null;
  // Formato brasileiro: ponto = milhar, vírgula = decimal ("1.234" = mil duzentos e trinta e quatro).
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, '')
      : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Mensagem de erro do preço, ou null se estiver válido. */
export function validateReadingPrice(status: ReadingStatus, priceText: string): string | null {
  if (status !== 'ok') return null; // esgotado e falha não têm preço
  if (!priceText.trim()) return 'Informe o preço da diária.';
  const price = parsePriceInput(priceText);
  if (price === null) return 'Digite só números, como 389 ou 389,90.';
  if (price <= 0) return 'O preço precisa ser maior que zero.';
  if (price < MIN_PRICE) return `Preço baixo demais (mínimo R$ ${MIN_PRICE}). Confira o valor digitado.`;
  if (price > MAX_PRICE) return 'Preço alto demais. Confira o valor digitado.';
  return null;
}

/** Leituras mais antigas que isso ficam fora do gráfico de 7 dias. */
export const MAX_READING_AGE_DAYS = 7;

/** Mensagem de erro da data e hora da leitura, ou null se estiver válida. */
export function validateReadingDate(checkedAt: Date, now: Date): string | null {
  if (Number.isNaN(checkedAt.getTime())) return 'Informe a data e a hora da leitura.';
  // 1 minuto de folga para diferenças de relógio.
  if (checkedAt.getTime() > now.getTime() + 60_000) return 'A leitura não pode ser no futuro.';
  const ageDays = (now.getTime() - checkedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays > MAX_READING_AGE_DAYS) return `A leitura precisa ser dos últimos ${MAX_READING_AGE_DAYS} dias.`;
  return null;
}

/** Até quantos dias à frente uma tarifa pode ser registrada. */
export const MAX_STAY_DAYS_AHEAD = 60;

/** "AAAA-MM-DD" que existe no calendário (recusa 2026-02-30 e 2026-13-45). */
export function isRealDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Mensagem de erro da data de estadia, ou null se estiver válida. Datas como "AAAA-MM-DD". */
export function validateStayDate(stayDate: string, today: string, maxDate: string): string | null {
  if (!stayDate) return 'Informe a data da estadia.';
  if (!isRealDateKey(stayDate)) return 'Essa data não existe. Escolha a noite no calendário.';
  if (stayDate < today) return 'A data da estadia não pode ser no passado.';
  if (stayDate > maxDate) return `Escolha uma data até ${MAX_STAY_DAYS_AHEAD} dias à frente.`;
  return null;
}

/**
 * Calcula o novo "latest" de uma propriedade depois de uma leitura.
 * - ok: grava o preço. previousPrice e changedAt só mudam quando o preço muda.
 * - esgotado: sem preço, marcado como esgotado.
 * - falha: mantém o último preço válido (o app mostra como "desatualizado").
 * Uma leitura mais antiga que a atual entra só no histórico e não altera o "latest".
 */
export function applyReading(latest: LatestCheck, reading: Reading): LatestCheck {
  if (latest.checkedAt && new Date(reading.checkedAt) < new Date(latest.checkedAt)) return latest;

  switch (reading.status) {
    case 'ok': {
      const changed = latest.price !== null && reading.price !== null && latest.price !== reading.price;
      return {
        status: 'ok',
        price: reading.price,
        checkedAt: reading.checkedAt,
        previousPrice: changed ? (latest.price ?? undefined) : latest.previousPrice,
        changedAt: changed ? reading.checkedAt : latest.changedAt,
      };
    }
    case 'sold_out':
      return {
        status: 'sold_out',
        price: null,
        checkedAt: reading.checkedAt,
        previousPrice: latest.previousPrice,
        changedAt: latest.changedAt,
      };
    case 'failed':
      return { ...latest, status: 'failed' };
  }
}
