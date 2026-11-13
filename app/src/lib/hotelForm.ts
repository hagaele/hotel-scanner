// Estado e validação do formulário de hotel (cadastro e edição).
// Funções puras: o componente usa com useReducer, e dá para testar sem React.

export const COMPETITOR_COUNT = 3;

export type PropertyFields = { name: string; url: string };

export type HotelFormValues = {
  own: PropertyFields;
  competitors: PropertyFields[]; // sempre COMPETITOR_COUNT itens
};

/** Identifica cada bloco do formulário: o hotel próprio ou o concorrente de índice 0, 1 ou 2. */
export type Slot = 'own' | 0 | 1 | 2;
export type FieldName = keyof PropertyFields;
export type FieldKey = `${Slot}.${FieldName}`;
export type HotelFormErrors = Partial<Record<FieldKey, string>>;

export type HotelFormState = {
  values: HotelFormValues;
  errors: HotelFormErrors;
  /** Depois da primeira tentativa de salvar, os erros passam a ser recalculados a cada digitação. */
  submitted: boolean;
  saving: boolean;
  saveError: string | null;
  saved: boolean;
};

export type HotelFormAction =
  | { type: 'change'; slot: Slot; field: FieldName; value: string }
  | { type: 'submit' }
  | { type: 'saving' }
  | { type: 'saveFailed'; message: string }
  | { type: 'saved' };

export const emptyHotelForm = (): HotelFormValues => ({
  own: { name: '', url: '' },
  competitors: Array.from({ length: COMPETITOR_COUNT }, () => ({ name: '', url: '' })),
});

export function initialHotelFormState(values: HotelFormValues = emptyHotelForm()): HotelFormState {
  return { values, errors: {}, submitted: false, saving: false, saveError: null, saved: false };
}

export function hotelFormReducer(state: HotelFormState, action: HotelFormAction): HotelFormState {
  switch (action.type) {
    case 'change': {
      const values = setField(state.values, action.slot, action.field, action.value);
      return {
        ...state,
        values,
        errors: state.submitted ? validateHotelForm(values) : state.errors,
        saved: false,
        saveError: null,
      };
    }
    case 'submit':
      return { ...state, submitted: true, errors: validateHotelForm(state.values), saveError: null, saved: false };
    case 'saving':
      return { ...state, saving: true, saveError: null };
    case 'saveFailed':
      return { ...state, saving: false, saveError: action.message };
    case 'saved':
      return { ...state, saving: false, saved: true };
  }
}

function setField(values: HotelFormValues, slot: Slot, field: FieldName, value: string): HotelFormValues {
  if (slot === 'own') return { ...values, own: { ...values.own, [field]: value } };
  const competitors = values.competitors.map((c, i) => (i === slot ? { ...c, [field]: value } : c));
  return { ...values, competitors };
}

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export function validateUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null; // link é opcional
  if (!value.startsWith('https://') || value.length <= 'https://'.length || /\s/.test(value)) {
    return 'O link deve começar com https:// (ex.: https://www.booking.com/hotel/...).';
  }
  return null;
}

/** Regras: nomes obrigatórios, nenhum nome repetido e link (opcional) começando com https://. */
export function validateHotelForm(values: HotelFormValues): HotelFormErrors {
  const errors: HotelFormErrors = {};
  const slots: { slot: Slot; fields: PropertyFields; label: string }[] = [
    { slot: 'own', fields: values.own, label: 'o nome do seu hotel' },
    ...values.competitors.map((fields, i) => ({ slot: i as Slot, fields, label: `o nome do concorrente ${i + 1}` })),
  ];

  const seen = new Set<string>();
  for (const { slot, fields, label } of slots) {
    const name = normalize(fields.name);
    if (!name) errors[`${slot}.name`] = `Informe ${label}.`;
    else if (seen.has(name)) errors[`${slot}.name`] = 'Nome repetido: cada hotel deve aparecer uma vez só.';
    seen.add(name);

    const urlError = validateUrl(fields.url);
    if (urlError) errors[`${slot}.url`] = urlError;
  }
  return errors;
}

export const hasFormErrors = (errors: HotelFormErrors) => Object.keys(errors).length > 0;
