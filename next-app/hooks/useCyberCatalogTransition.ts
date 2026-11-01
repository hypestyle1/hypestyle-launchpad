'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CYBER_START } from '@/lib/cyber-hype';
import type { NormalizedProduct } from '@/lib/products-normalize';

export function cyberTransitionDelay(serverTime: number): number {
  return Math.max(0, Date.parse(CYBER_START) - serverTime);
}

export function useCyberCatalogTransition(preview: boolean, serverTime: number) {
  const [checkLive, setCheckLive] = useState(!preview);
  useEffect(() => {
    if (!preview) { setCheckLive(true); return; }
    const started = performance.now();
    const delay = cyberTransitionDelay(serverTime);
    const activate = () => setCheckLive(true);
    const timer = setTimeout(activate, delay + 50);
    // Una pestaña suspendida también se actualiza al volver al primer plano.
    const wake = () => {
      if (performance.now() - started >= delay || Date.now() >= Date.parse(CYBER_START)) activate();
    };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { clearTimeout(timer); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
  }, [preview, serverTime]);
  const query = useQuery<{ active: boolean; serverTime: number; products: NormalizedProduct[] }>({
    queryKey: ['cyber-products-live'],
    enabled: checkLive,
    queryFn: async () => {
      const res = await fetch('/api/cyber-products-live', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron actualizar los precios');
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: q => q.state.data?.active ? 60_000 : 1000,
    retry: 2,
  });
  return {
    preview: preview && !checkLive,
    products: checkLive && query.data?.active ? query.data.products : undefined,
    updating: checkLive && !query.data?.active,
    error: query.isError,
    retry: query.refetch,
  };
}
