'use client';

import { useQuery } from '@tanstack/react-query';
import { fromWPNode, NormalizedProduct } from '@/lib/products-normalize';

export type { NormalizedProduct };

/**
 * `initial`: catálogo que el listado ya trajo en el servidor (lib/catalog.ts).
 * Va como placeholderData: pinta las cards en el HTML inicial, pero NO entra a
 * la caché compartida — el pedido a /api/products sale igual que siempre y
 * reemplaza al placeholder. Carrito, checkout y el resto de los consumidores
 * siguen viendo solo datos de ese pedido.
 */
export function useProducts(limit = 0, category?: string, tag?: string, initial?: NormalizedProduct[]) {
  return useQuery<NormalizedProduct[], Error, NormalizedProduct[]>({
    queryKey: ['products'],
    staleTime: 5 * 60_000,
    // Una lista vacía mostraría "no hay productos" en vez del spinner.
    placeholderData: initial?.length ? initial : undefined,
    queryFn: async (): Promise<NormalizedProduct[]> => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data: { products: { nodes: any[] } } = await res.json();
      return (data?.products?.nodes ?? []).map(fromWPNode);
    },
    select: (data) => {
      let out = data;
      if (category) out = out.filter(p => p.category.toLowerCase() === category.toLowerCase());
      if (tag) out = out.filter(p => p.tags.includes(tag));
      if (limit > 0) out = out.slice(0, limit);
      return out;
    },
  });
}
