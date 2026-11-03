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
  // Durante el evento los precios ya vienen hidratados desde Woo por el servidor
  // (revalidate 60s). Evitamos una segunda consulta no-store por cada visita:
  // con Hostinger saturado dejaba las cards indefinidamente sin precios.
  // Solo una pestaña que estaba abierta ANTES del lanzamiento debe refrescarse
  // al entrar en la ventana Cyber para no enseñar precios de la previa.
  const query = useQuery<{ active: boolean; serverTime: number; products: NormalizedProduct[] }>({
    queryKey: ['cyber-products-live'],
    enabled: preview && checkLive,
    queryFn: async () => {
      const res = await fetch('/api/cyber-products-live', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron actualizar los precios');
      return res.json();
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    // Carrera de relojes en la frontera: si el servidor todavía contesta
    // active:false, reintenta hasta que confirme. Solo corre en pestañas
    // preview; las visitas del evento no habilitan esta query.
    refetchInterval: (q) => (q.state.data && !q.state.data.active ? 2_000 : false),
    retry: 1,
  });
  return {
    preview: preview && !checkLive,
    products: checkLive && query.data?.active ? query.data.products : undefined,
    updating: preview && checkLive && !query.data?.active,
    error: query.isError,
    retry: query.refetch,
  };
}
