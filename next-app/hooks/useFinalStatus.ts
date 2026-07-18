'use client';

import { useQuery } from '@tanstack/react-query';
import type { FinalStatus } from '@/lib/final-status';

export type { FinalStatus };

// Mismo patrón que useMaradonaEnglandStatus: lee ?test=&secret=... de window.location
// (no useSearchParams, este hook se usa en componentes montados sin Suspense boundary).
function readTestQuery(): string {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search);
  return sp.get('test') ? `?${sp.toString()}` : '';
}

export function useFinalStatus() {
  const qs = readTestQuery();

  const query = useQuery<FinalStatus>({
    queryKey: ['final-status', qs],
    queryFn: async () => {
      const res = await fetch(`/api/final-status${qs}`);
      if (!res.ok) throw new Error('final-status failed');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: (q) => {
      switch (q.state.data?.phase) {
        case 'live': return 20_000;
        case 'pre':  return 45_000;
        default:     return 10 * 60_000;
      }
    },
    retry: 2,
  });

  return { ...query, phase: query.data?.phase ?? null };
}
