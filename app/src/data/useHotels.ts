import { useHotelsData } from '@/context/HotelsContext';
import type { Client, Hotel } from '@/types';

type HotelsData = {
  client: Client;
  hotels: Hotel[];
  /** Relógio real (atualizado a cada minuto) para calcular "desatualizado" e o cabeçalho. */
  now: Date;
  loading: boolean;
  error: string | null;
};

/**
 * Hotéis e cliente, lidos do estado global (HotelsProvider).
 * A leitura em tempo real do Firestore fica no provider: todas as telas compartilham a mesma
 * assinatura, e uma leitura registrada atualiza o painel, o calendário e os alertas ao mesmo tempo.
 * O formato devolvido é o mesmo de antes, então as telas existentes não mudaram.
 */
export function useHotels(): HotelsData {
  const { client, hotels, now, loading, error } = useHotelsData();
  return { client, hotels, now, loading, error };
}
