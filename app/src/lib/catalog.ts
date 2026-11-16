// Catálogo e pesquisa: hotéis próprios e concorrentes cadastrados (funções puras).

import type { CatalogFilters, Hotel, Property, SavedSearch } from '@/types';

import { cityOf } from './market';
import { diffPct, priceState } from './pricing';
import { parsePriceInput } from './readings';

export type CatalogEntry = {
  property: Property;
  hotel: Hotel;
  role: 'own' | 'competitor';
  city: string;
  /** Preço de hoje, quando a leitura está válida. */
  price: number | null;
};

export const EMPTY_FILTERS: CatalogFilters = { text: '', city: '', minPrice: '', maxPrice: '', role: 'all' };

/** Todas as propriedades cadastradas: as unidades da rede e os concorrentes de cada uma. */
export function catalogEntries(hotels: Hotel[], now: Date): CatalogEntry[] {
  const priceOf = (p: Property) => (priceState(p, now) === 'ok' ? p.latest.price : null);
  return hotels.flatMap((hotel) => [
    { property: hotel.own, hotel, role: 'own' as const, city: cityOf(hotel), price: priceOf(hotel.own) },
    ...hotel.competitors.map((c) => ({ property: c, hotel, role: 'competitor' as const, city: cityOf(hotel), price: priceOf(c) })),
  ]);
}

export type FilterErrors = { minPrice?: string; maxPrice?: string };

/** Valida a faixa de preço da pesquisa (os dois campos são opcionais). */
export function validateFilters(filters: CatalogFilters): FilterErrors {
  const errors: FilterErrors = {};
  const min = filters.minPrice.trim() ? parsePriceInput(filters.minPrice) : null;
  const max = filters.maxPrice.trim() ? parsePriceInput(filters.maxPrice) : null;
  if (filters.minPrice.trim() && min === null) errors.minPrice = 'Digite só números, como 220.';
  if (filters.maxPrice.trim() && max === null) errors.maxPrice = 'Digite só números, como 420.';
  if (min !== null && max !== null && min > max) errors.maxPrice = 'O valor máximo precisa ser maior que o mínimo.';
  return errors;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Filtra por nome, localização, faixa de preço e tipo. Com uma unidade de referência,
 * ordena pela semelhança com ela: mesma localização primeiro, depois o preço mais próximo.
 */
export function searchCatalog(entries: CatalogEntry[], filters: CatalogFilters, reference?: Hotel): CatalogEntry[] {
  const text = normalize(filters.text);
  const min = filters.minPrice.trim() ? parsePriceInput(filters.minPrice) : null;
  const max = filters.maxPrice.trim() ? parsePriceInput(filters.maxPrice) : null;

  const result = entries.filter((e) => {
    if (reference && e.property.id === reference.own.id) return false;
    if (text && !normalize(e.property.name).includes(text)) return false;
    if (filters.city && e.city !== filters.city) return false;
    if (filters.role !== 'all' && e.role !== filters.role) return false;
    if ((min !== null || max !== null) && e.price === null) return false;
    if (min !== null && e.price !== null && e.price < min) return false;
    if (max !== null && e.price !== null && e.price > max) return false;
    return true;
  });

  if (!reference) return result.sort((a, b) => a.property.name.localeCompare(b.property.name, 'pt-BR'));

  const refCity = cityOf(reference);
  const refPrice = reference.own.latest.price;
  const distance = (e: CatalogEntry) =>
    e.price !== null && refPrice !== null ? Math.abs(diffPct(e.price, refPrice)) : Number.POSITIVE_INFINITY;
  return result.sort(
    (a, b) => Number(b.city === refCity) - Number(a.city === refCity) || distance(a) - distance(b),
  );
}

export const MAX_SEARCH_NAME = 60;

/** Nome da pesquisa salva: obrigatório, até 60 caracteres e sem repetir outra pesquisa. */
export function validateSearchName(name: string, saved: SavedSearch[]): string | null {
  const value = name.trim();
  if (!value) return 'Dê um nome para a pesquisa.';
  if (value.length > MAX_SEARCH_NAME) return `Use até ${MAX_SEARCH_NAME} caracteres.`;
  if (saved.some((s) => normalize(s.name) === normalize(value))) return 'Já existe uma pesquisa com esse nome.';
  return null;
}

/** Resumo legível dos filtros, para a lista de pesquisas salvas. */
export function describeFilters(f: CatalogFilters): string {
  const parts: string[] = [];
  if (f.text.trim()) parts.push(`nome contém "${f.text.trim()}"`);
  parts.push(f.city || 'todas as localizações');
  if (f.role === 'own') parts.push('só unidades da rede');
  if (f.role === 'competitor') parts.push('só concorrentes');
  if (f.minPrice.trim() || f.maxPrice.trim()) {
    parts.push(`diária ${f.minPrice.trim() ? `de R$ ${f.minPrice.trim()}` : ''}${f.maxPrice.trim() ? ` até R$ ${f.maxPrice.trim()}` : ''}`.trim());
  }
  return parts.join(' · ');
}
