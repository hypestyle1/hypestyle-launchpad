'use client';

import { useQuery } from '@tanstack/react-query';
import type { MaradonaEnglandStatus } from '@/lib/maradona-england-status';

export type { MaradonaEnglandStatus };

// Mismo patrón que usePromo3x2Status: lee ?test=&secret=... de window.location (no
// useSearchParams, este hook se usa en componentes montados sin Suspense boundary).
function readTestQuery(): string {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search);
  return sp.get('test') ? `?${sp.toString()}` : '';
}

export function useMaradonaEnglandStatus() {
  const qs = readTestQuery();

  const query = useQuery<MaradonaEnglandStatus>({
    queryKey: ['maradona-england-status', qs],
    queryFn: async () => {
      const res = await fetch(`/api/maradona-england-status${qs}`);
      if (!res.ok) throw new Error('maradona-england-status failed');
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
