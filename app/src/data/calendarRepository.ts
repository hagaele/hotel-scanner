import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

import type { EventFormValues } from '@/lib/calendarForm';
import { withTimeout } from '@/lib/firestore';

import { eventRef, eventsCol } from './paths';

/** Cadastra um evento local ou um feriado estadual/municipal no calendário. */
export async function addCalendarEvent(values: EventFormValues, userEmail: string | undefined): Promise<void> {
  await withTimeout(
    addDoc(eventsCol(), {
      date: values.date,
      city: values.city,
      name: values.name.trim().replace(/\s+/g, ' '),
      kind: values.kind,
      createdBy: userEmail ?? null,
      createdAt: serverTimestamp(),
    }),
  );
}

/** Marca uma data suspeita como "não é evento", para o alerta não voltar. */
export async function dismissSuspectedDate(date: string, city: string, userEmail: string | undefined): Promise<void> {
  await withTimeout(
    addDoc(eventsCol(), {
      date,
      city,
      name: 'Não é evento',
      kind: 'descartado',
      createdBy: userEmail ?? null,
      createdAt: serverTimestamp(),
    }),
  );
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await withTimeout(deleteDoc(eventRef(eventId)));
}
