// Validação do cadastro de evento ou feriado local no calendário (funções puras).

import type { CalendarEvent, CalendarEventKind } from '@/types';

export const MIN_EVENT_NAME = 3;
export const MAX_EVENT_NAME = 60;

export type EventFormValues = {
  name: string;
  kind: Exclude<CalendarEventKind, 'descartado'>;
  /** Localização do evento, ou vazio para toda a rede. */
  city: string;
  /** "AAAA-MM-DD" */
  date: string;
};

/** Mensagem de erro do nome, ou null se puder salvar. */
export function validateEventForm(values: EventFormValues, existing: CalendarEvent[]): string | null {
  const name = values.name.trim().replace(/\s+/g, ' ');
  if (!name) return 'Informe o nome do evento ou feriado.';
  if (name.length < MIN_EVENT_NAME) return `Use pelo menos ${MIN_EVENT_NAME} letras.`;
  if (name.length > MAX_EVENT_NAME) return `Use até ${MAX_EVENT_NAME} caracteres.`;
  const duplicate = existing.some(
    (e) =>
      e.kind !== 'descartado' &&
      e.date === values.date &&
      e.city === values.city &&
      e.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
  );
  if (duplicate) return 'Esse evento já está cadastrado nessa data.';
  return null;
}
