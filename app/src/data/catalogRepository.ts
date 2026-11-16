import { addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

import { withTimeout } from '@/lib/firestore';
import type { CatalogFilters } from '@/types';

import { savedSearchRef, savedSearchesCol } from './paths';

/** Salva os filtros atuais do catálogo com um nome. */
export async function saveSearch(name: string, filters: CatalogFilters, userEmail: string | undefined): Promise<void> {
  await withTimeout(
    addDoc(savedSearchesCol(), {
      name: name.trim().replace(/\s+/g, ' '),
      filters: {
        text: filters.text.trim(),
        city: filters.city,
        minPrice: filters.minPrice.trim(),
        maxPrice: filters.maxPrice.trim(),
        role: filters.role,
      },
      createdAtIso: new Date().toISOString(),
      createdBy: userEmail ?? null,
      createdAt: serverTimestamp(),
    }),
  );
}

export async function deleteSearch(searchId: string): Promise<void> {
  await withTimeout(deleteDoc(savedSearchRef(searchId)));
}
