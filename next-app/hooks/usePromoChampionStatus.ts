'use client';

import { useQuery } from '@tanstack/react-query';
import type { PromoChampionStatus } from '@/lib/promo-champion-status';

export type { PromoChampionStatus };

// Mismo patrón que usePromo3x2Status: lee ?test=&secret=... de window.location (no
// useSearchParams, este hook se usa en componentes montados sin Suspense boundary).
function readTestQuery(): string {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search);
  return sp.get('test') ? `?${sp.toString()}` : '';
}

export function usePromoChampionStatus() {
  const qs = readTestQuery();

  const query = useQuery<PromoChampionStatus>({
    queryKey: ['promo-champion-status', qs],
    queryFn: async () => {
      const res = await fetch(`/api/promo-champion-status${qs}`);
      if (!res.ok) throw new Error('promo-champion-status failed');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: (q) => {
      switch (q.state.data?.phase) {
        case 'live': return 20_000;
        case 'pre':  return 45_000;
        default:     return 5 * 60_000;
      }
    },
    retry: 2,
  });

  return { ...query, phase: query.data?.phase ?? null, promoActive: query.data?.promoActive ?? false };
}
