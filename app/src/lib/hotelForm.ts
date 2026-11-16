// Estado e validação do formulário de cadastro (um hotel por vez): o hotel do usuário ou um concorrente.
// Funções puras: o componente usa com useReducer, e dá para testar sem React.

import { parsePriceInput } from './readings';
import { isUf } from './ufs';

/** Máximo de concorrentes vinculados a cada hotel do usuário. */
export const MAX_COMPETITORS = 5;

/** "own" = hotel do usuário (da rede); "competitor" = concorrente de um ou mais hotéis do usuário. */
export type PropertyKind = 'own' | 'competitor';

export type HotelFormValues = {
  kind: PropertyKind;
  name: string;
  /** Link no Booking.com (opcional). */
  url: string;
  /** Só para hotel do usuário: UF da localização, ex.: "DF". Escolhida antes da cidade. */
  uf: string;
  /** Só para hotel do usuário: cidade escolhida na lista da UF, ex.: "Brasília". Grava como "Brasília/DF". */
  city: string;
  /** Só para hotel do usuário: preço-piso digitado (opcional), ex.: "250" ou "249,90". */
  floorPrice: string;
  /** Só para concorrente: hotéis do usuário com que ele concorre. */
  hotelIds: string[];
};

export type TextField = 'name' | 'url' | 'uf' | 'city' | 'floorPrice';
export type HotelFormErrors = Partial<Record<TextField | 'hotelIds', string>>;

/** Um hotel do usuário, como o formulário precisa enxergar (para os chips de "Concorre com"). */
export type OwnHotelOption = {
  id: string;
  name: string;
  city?: string;
  /** Nomes dos concorrentes já vinculados, sem o que está sendo editado. */
  competitorNames: string[];
};

export type HotelFormContext = {
  /** Hotéis do usuário. Na edição de um hotel do usuário, sem ele mesmo. */
  ownHotels: OwnHotelOption[];
  /** Na edição de concorrente: hotéis a que ele já está vinculado (não contam no limite de 5). */
  linkedHotelIds?: string[];
};

export type HotelFormState = {
  values: HotelFormValues;
  context: HotelFormContext;
  errors: HotelFormErrors;
  /** Depois da primeira tentativa de salvar, os erros passam a ser recalculados a cada digitação. */
  submitted: boolean;
  saving: boolean;
  saveError: string | null;
  saved: boolean;
};

export type HotelFormAction =
  | { type: 'change'; field: TextField; value: string }
  | { type: 'setKind'; kind: PropertyKind }
  | { type: 'toggleHotel'; hotelId: string }
  | { type: 'submit' }
  | { type: 'saving' }
  | { type: 'saveFailed'; message: string }
  | { type: 'saved' }
  | { type: 'reset'; values: HotelFormValues };

export const emptyHotelForm = (kind: PropertyKind = 'own', hotelIds: string[] = []): HotelFormValues => ({
  kind,
  name: '',
  url: '',
  uf: '',
  city: '',
  floorPrice: '',
  hotelIds,
});

export function initialHotelFormState(init: { values?: HotelFormValues; context: HotelFormContext }): HotelFormState {
  return {
    values: init.values ?? emptyHotelForm(),
    context: init.context,
    errors: {},
    submitted: false,
    saving: false,
    saveError: null,
    saved: false,
  };
}

export function hotelFormReducer(state: HotelFormState, action: HotelFormAction): HotelFormState {
  const withValues = (values: HotelFormValues): HotelFormState => ({
    ...state,
    values,
    errors: state.submitted ? validateHotelForm(values, state.context) : state.errors,
    saved: false,
    saveError: null,
  });

  switch (action.type) {
    case 'change':
      // Trocar a UF limpa a cidade: a lista de cidades passa a ser a da nova UF.
      if (action.field === 'uf' && action.value !== state.values.uf)
        return withValues({ ...state.values, uf: action.value, city: '' });
      return withValues({ ...state.values, [action.field]: action.value });
    case 'setKind':
      return withValues({ ...state.values, kind: action.kind });
    case 'toggleHotel': {
      const { hotelIds } = state.values;
      const next = hotelIds.includes(action.hotelId)
        ? hotelIds.filter((id) => id !== action.hotelId)
        : [...hotelIds, action.hotelId];
      return withValues({ ...state.values, hotelIds: next });
    }
    case 'submit':
      return {
        ...state,
        submitted: true,
        errors: validateHotelForm(state.values, state.context),
        saveError: null,
        saved: false,
      };
    case 'saving':
      return { ...state, saving: true, saveError: null };
    case 'saveFailed':
      return { ...state, saving: false, saveError: action.message };
    case 'saved':
      return { ...state, saving: false, saved: true };
    case 'reset':
      return initialHotelFormState({ values: action.values, context: state.context });
  }
}

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 80;
export const MAX_URL_LENGTH = 2048;

/**
 * Link seguro para abrir: só https, com um domínio de verdade (com ponto) e sem espaços ou aspas.
 * Usado no cadastro e de novo na hora de abrir, para um dado gravado direto no banco não abrir um "javascript:".
 */
export function isSafeHttpsUrl(url: string | undefined): boolean {
  return normalizeUrl(url) !== null;
}

/** Caracteres aceitos num link salvo (os mesmos das regras do Firestore). */
const URL_CHARS = /^https:\/\/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+$/;

/**
 * Link no formato em que é gravado: esquema e domínio em minúsculas, acentos e espaços codificados
 * (ex.: "HTTPS://Booking.com/hotel/São" vira "https://booking.com/hotel/S%C3%A3o"). null se não for um link https válido.
 */
export function normalizeUrl(url: string | undefined): string | null {
  const value = (url ?? '').trim();
  if (!value || /[\s"'<>`]/.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(parsed.hostname)) return null;
    // Caracteres que o navegador não codifica sozinho ([ ] | ^ { } \) viram %XX.
    const href = parsed.href.replace(/[[\]|^{}\\]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return href.length <= MAX_URL_LENGTH && URL_CHARS.test(href) ? href : null;
  } catch {
    return null;
  }
}

export function validateUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null; // link é opcional
  if (value.length > MAX_URL_LENGTH) return `O link pode ter até ${MAX_URL_LENGTH} caracteres.`;
  if (!isSafeHttpsUrl(value)) return 'O link deve começar com https:// (ex.: https://www.booking.com/hotel/...).';
  return null;
}

export const MAX_FLOOR_PRICE = 100_000;

/** Hotel do usuário que já tem o máximo de concorrentes (e ainda não tem este vinculado). */
export function isHotelFull(hotel: OwnHotelOption, context: HotelFormContext): boolean {
  return hotel.competitorNames.length >= MAX_COMPETITORS && !context.linkedHotelIds?.includes(hotel.id);
}

/**
 * Regras:
 * - nome obrigatório e link (opcional) começando com https://;
 * - hotel do usuário: nome que não repete outro hotel da rede, localização obrigatória, preço-piso (opcional) válido;
 * - concorrente: não pode ser um hotel da rede (unidades da rede não concorrem entre si), precisa de pelo menos
 *   um hotel do usuário escolhido, não pode repetir um concorrente já vinculado e respeita o limite de 5 por hotel.
 */
export function validateHotelForm(values: HotelFormValues, context: HotelFormContext): HotelFormErrors {
  const errors: HotelFormErrors = {};
  const name = normalizeName(values.name);
  const network = new Set(context.ownHotels.map((h) => normalizeName(h.name)));

  if (!name) errors.name = values.kind === 'own' ? 'Informe o nome do seu hotel.' : 'Informe o nome do concorrente.';
  else if (name.length < MIN_NAME_LENGTH) errors.name = `Use pelo menos ${MIN_NAME_LENGTH} letras.`;
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Use até ${MAX_NAME_LENGTH} caracteres.`;
  else if (network.has(name))
    errors.name =
      values.kind === 'own'
        ? 'Já existe um hotel da rede com esse nome.'
        : 'Esse hotel é da sua rede: unidades da rede não concorrem entre si.';

  const urlError = validateUrl(values.url);
  if (urlError) errors.url = urlError;

  if (values.kind === 'own') {
    if (!isUf(values.uf)) errors.uf = 'Escolha a UF do hotel.';
    else if (!values.city.trim()) errors.city = 'Escolha a cidade na lista.';

    if (values.floorPrice.trim()) {
      const floor = parsePriceInput(values.floorPrice);
      if (floor === null) errors.floorPrice = 'Digite só números, como 250 ou 249,90.';
      else if (floor <= 0) errors.floorPrice = 'O preço-piso precisa ser maior que zero.';
      else if (floor > MAX_FLOOR_PRICE) errors.floorPrice = 'Valor alto demais. Confira o preço-piso.';
    }
    return errors;
  }

  const chosen = context.ownHotels.filter((h) => values.hotelIds.includes(h.id));
  if (chosen.length === 0) errors.hotelIds = 'Escolha pelo menos um hotel seu com que ele concorre.';
  else if (name && !errors.name) {
    const repeated = chosen.find((h) => h.competitorNames.some((c) => normalizeName(c) === name));
    const full = chosen.find((h) => isHotelFull(h, context));
    if (repeated) errors.hotelIds = `${repeated.name} já tem um concorrente com esse nome.`;
    else if (full) errors.hotelIds = `${full.name} já tem ${MAX_COMPETITORS} concorrentes. Remova um antes de vincular outro.`;
  }
  return errors;
}

/** Preço em número para o campo de texto: 249.9 -> "249,90"; 250 -> "250". */
export function priceToInput(value: number | undefined): string {
  if (value === undefined) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

export const hasFormErrors = (errors: HotelFormErrors) => Object.keys(errors).length > 0;
