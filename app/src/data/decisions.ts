import { addDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firestoreErrorMessage, withTimeout } from '@/lib/firestore';
import type { DecisionChoice, PriceDecision } from '@/types';

import { decisionsCol } from './paths';

type NewDecision = {
  stayDate: string;
  choice: DecisionChoice;
  low: number | null;
  high: number | null;
  ownPrice: number | null;
};

/** Registra a decisão sobre a sugestão de uma data. O app não altera preços nos canais de venda. */
export async function registerDecision(hotelId: string, decision: NewDecision, userEmail: string | undefined): Promise<void> {
  await withTimeout(
    addDoc(decisionsCol(hotelId), {
      ...decision,
      decidedAt: new Date().toISOString(),
      decidedBy: userEmail ?? '',
      createdAt: serverTimestamp(),
    }),
  );
}

/** Decisões de um hotel para as datas a partir de "from", em tempo real. */
export function useDecisions(hotelId: string | undefined, from: string) {
  const [decisions, setDecisions] = useState<PriceDecision[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hotelId) return;
    const unsubscribe = onSnapshot(
      query(decisionsCol(hotelId), where('stayDate', '>=', from)),
      (snap) => {
        setDecisions(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              stayDate: String(data.stayDate ?? ''),
              choice: data.choice === 'ignorar' ? 'ignorar' : 'aplicar',
              low: typeof data.low === 'number' ? data.low : null,
              high: typeof data.high === 'number' ? data.high : null,
              ownPrice: typeof data.ownPrice === 'number' ? data.ownPrice : null,
              decidedAt: String(data.decidedAt ?? ''),
              decidedBy: String(data.decidedBy ?? ''),
            };
          }),
        );
        setError(null);
      },
      (err) => setError(firestoreErrorMessage(err)),
    );
    return unsubscribe;
  }, [hotelId, from]);

  /** Decisão mais recente de cada data. */
  const latestFor = (stayDate: string) =>
    decisions.filter((d) => d.stayDate === stayDate).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0] ?? null;

  return { decisions, latestFor, error };
}
