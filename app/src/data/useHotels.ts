import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { CLIENT_ID, firestoreErrorMessage } from '@/lib/firestore';
import type { CheckStatus, Client, Hotel, LatestCheck, Property } from '@/types';

import { clientRef, hotelsCol } from './paths';

type HotelsData = {
  client: Client;
  hotels: Hotel[];
  /** Relógio real (atualizado a cada minuto) para calcular "desatualizado" e o cabeçalho. */
  now: Date;
  loading: boolean;
  error: string | null;
};

const DEFAULT_THRESHOLD_PCT = 10;

/**
 * Único ponto de acesso aos dados das telas.
 * Lê do Firestore em tempo real (onSnapshot): quando alguém cadastra um hotel ou registra
 * uma leitura, todas as telas abertas se atualizam sozinhas, sem botão de recarregar.
 * O formato devolvido é o mesmo da versão com dados de exemplo, então as telas não mudaram.
 */
export function useHotels(): HotelsData {
  const [client, setClient] = useState<Client>({ id: CLIENT_ID, name: '', alertThresholdPct: DEFAULT_THRESHOLD_PCT });
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [hotelsLoaded, setHotelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const unsubscribeClient = onSnapshot(
      clientRef(),
      (snap) => {
        const data = snap.data();
        setClient({
          id: CLIENT_ID,
          name: typeof data?.name === 'string' ? data.name : 'Rede sem nome',
          alertThresholdPct:
            typeof data?.alertThresholdPct === 'number' ? data.alertThresholdPct : DEFAULT_THRESHOLD_PCT,
        });
        setClientLoaded(true);
      },
      (err) => setError(firestoreErrorMessage(err)),
    );

    const unsubscribeHotels = onSnapshot(
      query(hotelsCol(), orderBy('order')),
      (snap) => {
        setHotels(snap.docs.map((d) => toHotel(d.id, d.data())));
        setHotelsLoaded(true);
        setError(null);
      },
      (err) => setError(firestoreErrorMessage(err)),
    );

    // Cancela os "ouvintes" quando a tela sai, para não gastar leituras nem memória.
    return () => {
      unsubscribeClient();
      unsubscribeHotels();
    };
  }, []);

  // Atualiza o relógio a cada minuto: é o que faz um preço virar "desatualizado" sozinho.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return { client, hotels, now, loading: !error && !(clientLoaded && hotelsLoaded), error };
}

// ---------- conversão do documento do Firestore para os tipos do app ----------

const STATUSES: CheckStatus[] = ['ok', 'sold_out', 'blocked', 'failed'];

function toLatest(raw: unknown): LatestCheck {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    status: STATUSES.includes(r.status as CheckStatus) ? (r.status as CheckStatus) : 'failed',
    price: typeof r.price === 'number' ? r.price : null,
    checkedAt: typeof r.checkedAt === 'string' ? r.checkedAt : null,
    previousPrice: typeof r.previousPrice === 'number' ? r.previousPrice : undefined,
    changedAt: typeof r.changedAt === 'string' ? r.changedAt : undefined,
  };
}

function toProperty(raw: unknown, fallbackId: string): Property {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : fallbackId,
    name: typeof r.name === 'string' ? r.name : 'Sem nome',
    bookingUrl: typeof r.bookingUrl === 'string' && r.bookingUrl ? r.bookingUrl : undefined,
    latest: toLatest(r.latest),
  };
}

function toHotel(id: string, data: Record<string, unknown>): Hotel {
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  return {
    id,
    order: typeof data.order === 'number' ? data.order : 0,
    own: toProperty(data.own, id),
    competitors: competitors.map((c, i) => toProperty(c, `${id}-${i + 1}`)),
  };
}
