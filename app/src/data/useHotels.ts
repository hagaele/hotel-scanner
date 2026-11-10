import { useEffect, useState } from 'react';

import type { Client, Hotel } from '@/types';

import { MOCK_NOW, mockClient, mockHotels } from './mock';

type HotelsData = {
  client: Client;
  hotels: Hotel[];
  /** Horário de referência para calcular "desatualizado" e o cabeçalho. */
  now: Date;
  loading: boolean;
  error: string | null;
};

/**
 * Único ponto de acesso aos dados das telas.
 * Hoje devolve os dados de exemplo depois de um pequeno atraso (para exercitar o estado de carregamento).
 * Na integração com o Firestore, só o corpo deste hook muda: as telas continuam iguais.
 */
export function useHotels(): HotelsData {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return { client: mockClient, hotels: loading ? [] : mockHotels, now: MOCK_NOW, loading, error: null };
}
