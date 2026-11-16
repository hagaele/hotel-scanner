import { useEffect, useState } from 'react';

/**
 * Municípios de uma UF, pela API pública de localidades do IBGE (sem chave, com CORS liberado).
 * As listas ficam guardadas em memória enquanto o app está aberto: trocar de UF e voltar não busca de novo.
 */
const cache = new Map<string, string[]>();
const IBGE_URL = (uf: string) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`;

async function fetchCities(uf: string, signal: AbortSignal): Promise<string[]> {
  const cached = cache.get(uf);
  if (cached) return cached;
  const response = await fetch(IBGE_URL(uf), { signal });
  if (!response.ok) throw new Error(`IBGE respondeu ${response.status}`);
  const data = (await response.json()) as { nome?: unknown }[];
  const names = data.map((m) => m.nome).filter((n): n is string => typeof n === 'string');
  cache.set(uf, names);
  return names;
}

export function useCities(uf: string) {
  const [cities, setCities] = useState<string[]>(() => cache.get(uf) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uf) {
      setCities([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchCities(uf, controller.signal)
      .then((list) => setCities(list))
      .catch((e) => {
        if (controller.signal.aborted) return;
        setCities([]);
        setError(e instanceof Error && /Failed to fetch|Network/i.test(e.message)
          ? 'Sem conexão para buscar as cidades.'
          : 'Não foi possível buscar as cidades no IBGE.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [uf, attempt]);

  return { cities, loading, error, retry: () => setAttempt((n) => n + 1) };
}
