import { deleteDoc, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

import type { HotelFormValues, PropertyFields } from '@/lib/hotelForm';
import { db, withTimeout } from '@/lib/firestore';
import { applyReading, type Reading } from '@/lib/readings';
import type { Hotel, LatestCheck, Property } from '@/types';

import { checksCol, hotelRef, hotelsCol } from './paths';

/** Até a primeira leitura, a propriedade não tem preço. */
const NO_READING: LatestCheck = { status: 'failed', price: null, checkedAt: null };

function toProperty(id: string, fields: PropertyFields, latest: LatestCheck = NO_READING): Property {
  const url = fields.url.trim();
  return { id, name: fields.name.trim().replace(/\s+/g, ' '), bookingUrl: url || undefined, latest };
}

/** Converte um hotel salvo nos valores do formulário de edição. */
export function hotelToFormValues(hotel: Hotel): HotelFormValues {
  const fields = (p: Property | undefined): PropertyFields => ({ name: p?.name ?? '', url: p?.bookingUrl ?? '' });
  return {
    own: fields(hotel.own),
    competitors: [0, 1, 2].map((i) => fields(hotel.competitors[i])),
  };
}

/** Cadastra um hotel novo com 3 concorrentes. Devolve o id criado. */
export async function createHotel(values: HotelFormValues, order: number): Promise<string> {
  const ref = doc(hotelsCol());
  await withTimeout(setDoc(ref, {
    order,
    own: toProperty(ref.id, values.own),
    competitors: values.competitors.map((c, i) => toProperty(`${ref.id}-${i + 1}`, c)),
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

/**
 * Edita nomes e links. Os preços ("latest") e os ids continuam os mesmos,
 * para o histórico de leituras continuar ligado à propriedade certa.
 */
export async function updateHotel(hotelId: string, values: HotelFormValues): Promise<void> {
  await withTimeout(runTransaction(db, async (tx) => {
    const ref = hotelRef(hotelId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });

    const data = snap.data();
    const oldOwn = data.own as Property;
    const oldCompetitors = (Array.isArray(data.competitors) ? data.competitors : []) as Property[];

    tx.update(ref, {
      own: toProperty(oldOwn?.id ?? hotelId, values.own, oldOwn?.latest ?? NO_READING),
      competitors: values.competitors.map((c, i) => {
        const old = oldCompetitors[i];
        return toProperty(old?.id ?? `${hotelId}-${i + 1}`, c, old?.latest ?? NO_READING);
      }),
      updatedAt: serverTimestamp(),
    });
  }));
}

/**
 * Remove o hotel do painel.
 * O histórico de leituras (subcoleção checks) é preservado de propósito: as regras do
 * Firestore não permitem apagar leituras, porque o histórico é o valor do produto.
 */
export async function deleteHotel(hotelId: string): Promise<void> {
  await withTimeout(deleteDoc(hotelRef(hotelId)));
}

/**
 * Registra uma leitura de preço de uma propriedade (hotel próprio ou concorrente).
 * Numa única transação:
 * 1. cria um documento novo no histórico (checks), que nunca é sobrescrito;
 * 2. atualiza o "latest" da propriedade, que é o que o painel mostra.
 */
export async function registerReading(
  hotelId: string,
  propertyId: string,
  reading: Reading,
  userId: string | undefined,
): Promise<void> {
  await withTimeout(runTransaction(db, async (tx) => {
    const ref = hotelRef(hotelId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });

    const data = snap.data();
    const own = data.own as Property;
    const competitors = (Array.isArray(data.competitors) ? data.competitors : []) as Property[];
    const target = own.id === propertyId ? own : competitors.find((c) => c.id === propertyId);
    if (!target) throw Object.assign(new Error('Propriedade não encontrada'), { code: 'not-found' });

    const update = (p: Property): Property =>
      p.id === propertyId ? { ...p, latest: applyReading(p.latest ?? NO_READING, reading) } : p;

    tx.update(ref, { own: update(own), competitors: competitors.map(update), updatedAt: serverTimestamp() });
    tx.set(doc(checksCol(hotelId)), {
      propertyId,
      propertyName: target.name,
      status: reading.status,
      price: reading.status === 'ok' ? reading.price : null,
      checkedAt: reading.checkedAt,
      source: 'manual',
      createdBy: userId,
      createdAt: serverTimestamp(),
    });
  }));
}
