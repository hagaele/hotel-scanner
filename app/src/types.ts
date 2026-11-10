// Espelha o modelo de dados do Firestore descrito no CLAUDE.md (seção 3).
// Hoje os dados vêm de src/data/mock.ts; a troca para o Firestore não muda estes tipos.

export type CheckStatus = 'ok' | 'sold_out' | 'blocked' | 'failed';

export type LatestCheck = {
  status: CheckStatus;
  /** Último preço válido em reais. null quando nunca houve leitura válida ou está esgotado. */
  price: number | null;
  /** Horário da última leitura válida (ISO 8601). */
  checkedAt: string | null;
  previousPrice?: number;
  /** Horário em que o preço mudou pela última vez (ISO 8601). */
  changedAt?: string;
};

export type Property = {
  id: string;
  name: string;
  bookingUrl?: string;
  latest: LatestCheck;
};

export type Hotel = {
  id: string;
  order: number;
  own: Property;
  competitors: Property[];
};

export type Client = {
  id: string;
  name: string;
  alertThresholdPct: number;
};
