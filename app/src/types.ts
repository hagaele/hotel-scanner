// Tipos do app, espelhando o modelo de dados do Firestore (ver README, "Modelo de dados").

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
  /**
   * Só em concorrentes: identifica o mesmo hotel concorrente nos vários hotéis do usuário a que ele
   * está vinculado. A mesma leitura de preço vale para todos os vínculos.
   */
  competitorKey?: string;
};

export type Hotel = {
  id: string;
  order: number;
  own: Property;
  competitors: Property[];
  /** Localização do hotel, ex.: "Brasília/DF". Agrupa o calendário e os filtros. */
  city?: string;
  /** Menor diária que a rede aceita praticar nesta unidade. Nenhuma sugestão fica abaixo dele. */
  floorPrice?: number;
};

/** Regras que decidem quais alertas aparecem na central de notificações. */
export type AlertRules = {
  /** Avisar quando um concorrente mudar o preço em mais de X%. */
  competitorChangePct: number;
  /** Prioridade alta quando a unidade estiver mais de X% fora da média do mercado. */
  outOfRangePct: number;
  /** Avisar quando concorrentes esgotarem em datas futuras. */
  soldOut: boolean;
  /** Avisar sobre datas com cara de evento sem feriado cadastrado. */
  events: boolean;
  /** Olhar até 60 dias à frente (em vez de 30). */
  farDates: boolean;
};

export type Client = {
  id: string;
  name: string;
  alertThresholdPct: number;
  alertRules: AlertRules;
};

/**
 * Uma leitura do histórico (subcoleção checks).
 * stayDate é a noite a que o preço se refere ("AAAA-MM-DD"). Leituras antigas,
 * de antes da data de estadia existir, não têm o campo: valem para o dia da leitura.
 */
export type RateCheck = {
  propertyId: string;
  status: string;
  price: number | null;
  /** Quando o preço foi consultado (ISO 8601). */
  checkedAt: string;
  stayDate?: string;
};

export type CalendarEventKind = 'evento' | 'feriado' | 'descartado';

/**
 * Data especial cadastrada pelo usuário: evento local, feriado estadual/municipal,
 * ou uma data marcada como "não é evento" (descartado) para o alerta não voltar.
 */
export type CalendarEvent = {
  id: string;
  /** "AAAA-MM-DD" */
  date: string;
  /** Localização do evento. Vazio = vale para toda a rede. */
  city: string;
  name: string;
  kind: CalendarEventKind;
};

export type CatalogRole = 'all' | 'own' | 'competitor';

export type CatalogFilters = {
  text: string;
  /** Vazio = todas as localizações. */
  city: string;
  minPrice: string;
  maxPrice: string;
  role: CatalogRole;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: CatalogFilters;
  /** ISO 8601 */
  createdAt: string;
};

export type DecisionChoice = 'aplicar' | 'ignorar';

/** Decisão do usuário sobre a sugestão de preço de uma data. O app não altera preços nos canais. */
export type PriceDecision = {
  id: string;
  stayDate: string;
  choice: DecisionChoice;
  low: number | null;
  high: number | null;
  ownPrice: number | null;
  /** ISO 8601 */
  decidedAt: string;
  decidedBy: string;
};
