'use client';

import { useQuery } from '@tanstack/react-query';
import { fromWPNode, NormalizedProduct } from '@/lib/products-normalize';

export type { NormalizedProduct };

export function useProducts(limit = 0, category?: string, tag?: string) {
  return useQuery<NormalizedProduct[], Error, NormalizedProduct[]>({
    queryKey: ['products'],
    staleTime: 5 * 60_000,
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
