import { deleteDoc, deleteField, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

import { todayKey } from '@/lib/dates';
import { MAX_COMPETITORS, normalizeName, normalizeUrl, priceToInput, type HotelFormValues } from '@/lib/hotelForm';
import { parsePriceInput } from '@/lib/readings';
import { joinCity, splitCity } from '@/lib/ufs';
import { db, withTimeout } from '@/lib/firestore';
import { applyReading, type Reading } from '@/lib/readings';
import type { Hotel, LatestCheck, Property } from '@/types';

import { checksCol, hotelRef, hotelsCol } from './paths';

/** Até a primeira leitura, a propriedade não tem preço. */
const NO_READING: LatestCheck = { status: 'failed', price: null, checkedAt: null };

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');
const cityOf = (values: HotelFormValues) => joinCity(values.city.trim().replace(/\s+/g, ' '), values.uf);
const floorOf = (values: HotelFormValues) => (values.floorPrice.trim() ? parsePriceInput(values.floorPrice) : null);
const randomId = () => Math.random().toString(36).slice(2, 10);

/**
 * Identifica o mesmo concorrente em todos os hotéis do usuário a que ele está vinculado.
 * Concorrentes antigos (da carga de exemplo) não têm o campo: o id da propriedade faz esse papel.
 */
export const competitorKeyOf = (p: Property) => p.competitorKey ?? p.id;

/** Hotéis do usuário a que um concorrente está vinculado. */
export function hotelsLinkedTo(hotels: Hotel[], key: string): Hotel[] {
  return hotels.filter((h) => h.competitors.some((c) => competitorKeyOf(c) === key));
}

/** Monta o objeto gravado no Firestore, sem campos vazios (o Firestore não aceita undefined). */
function propertyDoc(p: Property): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    ...(p.bookingUrl ? { bookingUrl: p.bookingUrl } : {}),
    latest: p.latest,
    ...(p.competitorKey ? { competitorKey: p.competitorKey } : {}),
  };
}

const readCompetitors = (data: Record<string, unknown>) =>
  (Array.isArray(data.competitors) ? data.competitors : []) as Property[];

// ---------------------------------------------------------------- Hotel do usuário

/** Converte um hotel do usuário nos valores do formulário de edição. */
export function ownToFormValues(hotel: Hotel): HotelFormValues {
  return {
    kind: 'own',
    name: hotel.own.name,
    url: hotel.own.bookingUrl ?? '',
    ...splitCity(hotel.city),
    floorPrice: priceToInput(hotel.floorPrice),
    hotelIds: [],
  };
}

/** Cadastra um hotel do usuário, ainda sem concorrentes. Devolve o id criado. */
export async function createOwnHotel(values: HotelFormValues, order: number): Promise<string> {
  const ref = doc(hotelsCol());
  const floor = floorOf(values);
  const url = normalizeUrl(values.url);
  await withTimeout(
    setDoc(ref, {
      order,
      own: { id: ref.id, name: cleanName(values.name), ...(url ? { bookingUrl: url } : {}), latest: NO_READING },
      competitors: [],
      city: cityOf(values),
      ...(floor !== null ? { floorPrice: floor } : {}),
      createdAt: serverTimestamp(),
    }),
  );
  return ref.id;
}

/** Edita nome, link, localização e preço-piso. O preço atual e o histórico continuam ligados ao mesmo id. */
export async function updateOwnHotel(hotelId: string, values: HotelFormValues): Promise<void> {
  await withTimeout(
    runTransaction(db, async (tx) => {
      const ref = hotelRef(hotelId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });
      const own = snap.data().own as Property;
      const url = normalizeUrl(values.url);
      const floor = floorOf(values);
      tx.update(ref, {
        own: propertyDoc({ ...own, id: own?.id ?? hotelId, name: cleanName(values.name), bookingUrl: url || undefined, latest: own?.latest ?? NO_READING }),
        city: cityOf(values),
        floorPrice: floor ?? deleteField(),
        updatedAt: serverTimestamp(),
      });
    }),
  );
}

/**
 * Remove o hotel do usuário do painel, com os vínculos dos concorrentes dele.
 * O histórico de leituras (subcoleção checks) é preservado de propósito: as regras do
 * Firestore não permitem apagar leituras, porque o histórico é o valor do produto.
 */
export async function deleteHotel(hotelId: string): Promise<void> {
  await withTimeout(deleteDoc(hotelRef(hotelId)));
}

// ---------------------------------------------------------------- Concorrentes

/** Converte um concorrente nos valores do formulário de edição (com os hotéis a que está vinculado). */
export function competitorToFormValues(competitor: Property, hotels: Hotel[]): HotelFormValues {
  return {
    kind: 'competitor',
    name: competitor.name,
    url: competitor.bookingUrl ?? '',
    uf: '',
    city: '',
    floorPrice: '',
    hotelIds: hotelsLinkedTo(hotels, competitorKeyOf(competitor)).map((h) => h.id),
  };
}

/**
 * Cadastra um concorrente e vincula aos hotéis do usuário escolhidos.
 * Se um concorrente com o mesmo nome já estiver vinculado a outro hotel do usuário, reaproveita a
 * identidade e o preço atual dele: é o mesmo hotel, e a mesma leitura passa a valer para todos os vínculos.
 */
export async function createCompetitor(values: HotelFormValues, hotels: Hotel[]): Promise<void> {
  const typed = cleanName(values.name);
  const existing = hotels.flatMap((h) => h.competitors).find((c) => normalizeName(c.name) === normalizeName(typed));
  // Mesmo hotel já cadastrado: mantém o nome como já está escrito, para não ficar "hotel VENEZA" num e "Hotel Veneza" no outro.
  const name = existing?.name ?? typed;
  const key = existing ? competitorKeyOf(existing) : `c-${randomId()}`;
  const url = normalizeUrl(values.url) ?? existing?.bookingUrl;

  await withTimeout(
    runTransaction(db, async (tx) => {
      const refs = values.hotelIds.map((id) => hotelRef(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      snaps.forEach((snap, i) => {
        if (!snap.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });
        const competitors = readCompetitors(snap.data());
        if (competitors.length >= MAX_COMPETITORS)
          throw new Error(`Esse hotel já tem ${MAX_COMPETITORS} concorrentes. Remova um antes de vincular outro.`);
        const property: Property = {
          id: `${snap.id}-${randomId()}`,
          name,
          bookingUrl: url,
          latest: existing?.latest ?? NO_READING,
          competitorKey: key,
        };
        tx.update(refs[i], {
          competitors: [...competitors.map(propertyDoc), propertyDoc(property)],
          updatedAt: serverTimestamp(),
        });
      });
    }),
  );
}

/**
 * Edita um concorrente em todos os vínculos: troca nome e link, vincula aos hotéis marcados agora
 * e desfaz o vínculo com os desmarcados. Preço atual e ids dos vínculos que continuam são mantidos.
 */
export async function updateCompetitor(competitor: Property, values: HotelFormValues, hotels: Hotel[]): Promise<void> {
  const key = competitorKeyOf(competitor);
  const name = cleanName(values.name);
  const url = normalizeUrl(values.url) ?? undefined;
  const linked = hotelsLinkedTo(hotels, key).map((h) => h.id);
  const affected = [...new Set([...linked, ...values.hotelIds])];

  await withTimeout(
    runTransaction(db, async (tx) => {
      const refs = affected.map((id) => hotelRef(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      snaps.forEach((snap, i) => {
        if (!snap.exists()) return; // hotel removido no meio do caminho: nada a fazer nele
        const competitors = readCompetitors(snap.data());
        const keep = values.hotelIds.includes(snap.id);
        const index = competitors.findIndex((c) => competitorKeyOf(c) === key);
        let next: Property[];
        if (index >= 0 && keep) {
          next = competitors.map((c, j) => (j === index ? { ...c, name, bookingUrl: url, competitorKey: key } : c));
        } else if (index >= 0) {
          next = competitors.filter((_, j) => j !== index);
        } else if (keep) {
          if (competitors.length >= MAX_COMPETITORS)
            throw new Error(`Um dos hotéis já tem ${MAX_COMPETITORS} concorrentes. Remova um antes de vincular outro.`);
          next = [...competitors, { id: `${snap.id}-${randomId()}`, name, bookingUrl: url, latest: competitor.latest, competitorKey: key }];
        } else {
          return;
        }
        tx.update(refs[i], { competitors: next.map(propertyDoc), updatedAt: serverTimestamp() });
      });
    }),
  );
}

/** Desfaz o vínculo de um concorrente com um hotel do usuário. Os outros vínculos e o histórico continuam. */
export async function removeCompetitorLink(hotelId: string, propertyId: string): Promise<void> {
  await withTimeout(
    runTransaction(db, async (tx) => {
      const ref = hotelRef(hotelId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });
      const competitors = readCompetitors(snap.data()).filter((c) => c.id !== propertyId);
      tx.update(ref, { competitors: competitors.map(propertyDoc), updatedAt: serverTimestamp() });
    }),
  );
}

// ---------------------------------------------------------------- Leituras de preço

/**
 * Registra uma leitura de preço de uma propriedade (hotel do usuário ou concorrente) para uma noite.
 * Numa única transação:
 * 1. cria um documento novo no histórico (checks), com a data de estadia, que nunca é sobrescrito;
 * 2. se a noite for hoje, atualiza o "latest" da propriedade, que é o que o painel mostra.
 * Um concorrente vinculado a mais de um hotel do usuário recebe a mesma leitura em todos os vínculos
 * (linkedHotelIds são os outros hotéis a que ele está vinculado).
 */
export async function registerReading(
  hotelId: string,
  propertyId: string,
  reading: Reading,
  userId: string | undefined,
  linkedHotelIds: string[] = [],
): Promise<void> {
  await withTimeout(
    runTransaction(db, async (tx) => {
      const ids = [hotelId, ...linkedHotelIds.filter((id) => id !== hotelId)];
      const refs = ids.map((id) => hotelRef(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

      const first = snaps[0];
      if (!first.exists()) throw Object.assign(new Error('Hotel não encontrado'), { code: 'not-found' });
      const firstData = first.data();
      const firstOwn = firstData.own as Property;
      const target =
        firstOwn.id === propertyId ? firstOwn : readCompetitors(firstData).find((c) => c.id === propertyId);
      if (!target) throw Object.assign(new Error('Propriedade não encontrada'), { code: 'not-found' });
      const key = target === firstOwn ? null : competitorKeyOf(target);
      const isToday = reading.stayDate === todayKey(new Date());

      snaps.forEach((snap, i) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const own = data.own as Property;
        const competitors = readCompetitors(data);
        // No hotel de origem, a propriedade é a escolhida; nos outros vínculos, o mesmo concorrente.
        const match = (p: Property) => (i === 0 ? p.id === propertyId : key !== null && competitorKeyOf(p) === key);
        const local = match(own) ? own : competitors.find(match);
        if (!local) return;

        if (isToday) {
          const update = (p: Property) => (match(p) ? { ...p, latest: applyReading(p.latest ?? NO_READING, reading) } : p);
          tx.update(refs[i], {
            own: propertyDoc(update(own)),
            competitors: competitors.map((c) => propertyDoc(update(c))),
            updatedAt: serverTimestamp(),
          });
        }
        tx.set(doc(checksCol(snap.id)), {
          propertyId: local.id,
          propertyName: local.name,
          status: reading.status,
          price: reading.status === 'ok' ? reading.price : null,
          checkedAt: reading.checkedAt,
          stayDate: reading.stayDate,
          source: 'manual',
          createdBy: userId,
          createdAt: serverTimestamp(),
        });
      });
    }),
  );
}

// ---------------------------------------------------------------- Contexto do formulário

/**
 * Hotéis da rede como o formulário precisa: nome, localização e concorrentes já vinculados.
 * - exceptHotelId: na edição de um hotel da rede, tira ele mesmo (para o nome não acusar repetição).
 * - exceptKey: na edição de um concorrente, tira ele mesmo das listas (para não acusar repetição nem contar no limite).
 */
export function formContextFor(hotels: Hotel[], opts: { exceptHotelId?: string; exceptKey?: string } = {}) {
  return {
    ownHotels: hotels
      .filter((h) => h.id !== opts.exceptHotelId)
      .map((h) => ({
        id: h.id,
        name: h.own.name,
        city: h.city,
        competitorNames: h.competitors.filter((c) => competitorKeyOf(c) !== opts.exceptKey).map((c) => c.name),
      })),
    linkedHotelIds: opts.exceptKey ? hotelsLinkedTo(hotels, opts.exceptKey).map((h) => h.id) : undefined,
  };
}
