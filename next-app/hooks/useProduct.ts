'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type Product } from '@/data/products';
import { fetchProductDetail } from '@/lib/product-detail';
import { CYBER_START, CYBER_END } from '@/lib/cyber-hype';

// La query, la normalización (fromWPNode) y las colorways viven ahora en
// lib/product-detail.ts, que no es client-only: la ficha de producto las
// necesita del lado del servidor para el <title>, el canonical y el JSON-LD.

/**
 * `initialData` es el producto que ya trajo el servidor en page.tsx. Con eso el
 * primer render no espera al fetch del browser (antes la ficha salía vacía y el
 * <h1> aparecía recién después de hidratar, así que el crawler no lo veía).
 */
export function useProduct(slug: string | undefined, initialData?: Product) {
  const product = useQuery<Product | undefined>({
    queryKey: ['product', slug],
    enabled: !!slug,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: () => Date.now() >= Date.parse(CYBER_START) && Date.now() < Date.parse(CYBER_END) ? 30_000 : false,
    initialData,
    queryFn: async (): Promise<Product | undefined> => {
      if (!slug) return undefined;
      return fetchProductDetail(slug, { fresh: true });
    },
  });
  // Hora de servidor independiente de la query del carrito. No activa ofertas:
  // al cruzar la frontera únicamente vuelve a leer el precio efectivo de Woo.
  const clock = useQuery<{ serverTime: string; desde: string }>({
    queryKey: ['product-cyber-clock'],
    enabled: !!slug,
    queryFn: async () => {
      const response = await fetch('/api/pack-regular-status', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo leer la hora del servidor');
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: q => q.state.data && Date.parse(q.state.data.serverTime) < Date.parse(q.state.data.desde) ? 15_000 : false,
  });
  useEffect(() => {
    if (!slug || !clock.data) return;
    const delay = Date.parse(clock.data.desde) - Date.parse(clock.data.serverTime);
    if (!Number.isFinite(delay)) return;
    if (delay <= 0) { void product.refetch(); return; }
    if (delay > 60_000) return;
    const timer = setTimeout(() => void product.refetch(), delay + 50);
    return () => clearTimeout(timer);
  }, [slug, clock.data, product.refetch]);
  return product;
}
