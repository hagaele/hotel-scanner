import { limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firestoreErrorMessage } from '@/lib/firestore';
import { historyStart, type HistoryCheck } from '@/lib/history';

import { checksCol } from './paths';

/** Teto de leituras lidas por hotel. 4 propriedades x 7 dias cabem com muita folga. */
const MAX_CHECKS = 400;

type HotelHistory = {
  checks: HistoryCheck[];
  loading: boolean;
  error: string | null;
};

/**
 * Histórico de leituras de um hotel nos últimos 7 dias, para o gráfico do detalhe.
 * Só é carregado na tela de detalhe, com filtro de data e limite, para ler o mínimo do Firestore.
 * Usa onSnapshot: uma leitura registrada agora aparece no gráfico na hora.
 */
export function useHotelHistory(hotelId: string | undefined): HotelHistory {
  const [checks, setChecks] = useState<HistoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);

    const since = historyStart(new Date()).toISOString();
    const unsubscribe = onSnapshot(
      query(checksCol(hotelId), where('checkedAt', '>=', since), orderBy('checkedAt', 'desc'), limit(MAX_CHECKS)),
      (snap) => {
        setChecks(snap.docs.map((d) => toCheck(d.data())).filter((c): c is HistoryCheck => c !== null));
        setLoading(false);
      },
      (err) => {
        setError(firestoreErrorMessage(err));
        setLoading(false);
      },
    );

    // Cancela o "ouvinte" ao sair do detalhe.
    return unsubscribe;
  }, [hotelId]);

  return { checks, loading, error };
}

function toCheck(data: Record<string, unknown>): HistoryCheck | null {
  if (typeof data.propertyId !== 'string' || typeof data.checkedAt !== 'string') return null;
  return {
    propertyId: data.propertyId,
    status: typeof data.status === 'string' ? data.status : 'failed',
    price: typeof data.price === 'number' ? data.price : null,
    checkedAt: data.checkedAt,
  };
}
