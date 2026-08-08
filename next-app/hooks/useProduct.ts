'use client';

import { useQuery } from '@tanstack/react-query';
import { type Product } from '@/data/products';
import { fetchProductDetail } from '@/lib/product-detail';

// La query, la normalización (fromWPNode) y las colorways viven ahora en
// lib/product-detail.ts, que no es client-only: la ficha de producto las
// necesita del lado del servidor para el <title>, el canonical y el JSON-LD.

/**
 * `initialData` es el producto que ya trajo el servidor en page.tsx. Con eso el
 * primer render no espera al fetch del browser (antes la ficha salía vacía y el
 * <h1> aparecía recién después de hidratar, así que el crawler no lo veía).
 */
export function useProduct(slug: string | undefined, initialData?: Product) {
  return useQuery<Product | undefined>({
    queryKey: ['product', slug],
    enabled: !!slug,
    staleTime: 0,
    initialData,
    queryFn: async (): Promise<Product | undefined> => {
      if (!slug) return undefined;
      return fetchProductDetail(slug);
    },
  });
}
