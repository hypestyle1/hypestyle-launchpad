'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { type Product } from '@/data/products';
import { fetchProductDetail } from '@/lib/product-detail';
import { CYBER_START, CYBER_END } from '@/lib/cyber-hype';

// La query, la normalización (fromWPNode) y las colorways viven ahora en
// lib/product-detail.ts, que no es client-only: la ficha de producto las
// necesita del lado del servidor para el <title>, el canonical y el JSON-LD.

/**
 * Edad máxima del precio/stock en pantalla antes de volver a pedirlos a Woo.
 * El precio que se COBRA no sale de acá: el stock se valida en vivo al agregar
 * al carrito (checkStock) y el pedido se arma con precios del servidor
 * (pedido-servidor). En las fronteras del Cyber se refresca al instante igual.
 *
 * Incidente MariaDB/Hostinger 2–4/11/2026: antes cada ficha re-pedía el
 * producto al montarse (staleTime 0), otra vez por el reloj de frontera, en
 * cada foco de pestaña y cada 30 s durante todo el Cyber — 2 consultas
 * GraphQL sin caché (producto + colorways) contra WordPress/MySQL cada vez.
 */
export const PRODUCT_STALE_MS = 180_000;

function enCyber(ahora: number): boolean {
  return ahora >= Date.parse(CYBER_START) && ahora < Date.parse(CYBER_END);
}

/**
 * `initialData` es el producto que ya trajo el servidor en page.tsx. Con eso el
 * primer render no espera al fetch del browser (antes la ficha salía vacía y el
 * <h1> aparecía recién después de hidratar, así que el crawler no lo veía).
 *
 * `initialDataUpdatedAt` es la edad (peor caso) de ese dato. Si es reciente no
 * se vuelve a pedir; si es viejo o no viene, se pide como antes.
 */
export function useProduct(slug: string | undefined, initialData?: Product, initialDataUpdatedAt?: number) {
  const product = useQuery<Product | undefined>({
    queryKey: ['product', slug],
    enabled: !!slug,
    staleTime: PRODUCT_STALE_MS,
    initialData,
    initialDataUpdatedAt: initialData ? (initialDataUpdatedAt ?? 0) : undefined,
    // Solo si el dato ya está viejo (antes: 'always', en cada foco).
    refetchOnWindowFocus: true,
    // Durante el Cyber, una ficha abierta mucho tiempo se mantiene al día cada
    // 3 min (antes 30 s), y solo con la pestaña visible.
    refetchInterval: () => (enCyber(Date.now()) ? PRODUCT_STALE_MS : false),
    queryFn: async (): Promise<Product | undefined> => {
      if (!slug) return undefined;
      return fetchProductDetail(slug, { fresh: true });
    },
  });
  // Hora de servidor independiente de la query del carrito. No activa ofertas:
  // al cruzar una frontera únicamente vuelve a leer el precio efectivo de Woo.
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
  // Cuándo se armó el dato que se está mostrando, sin re-disparar el efecto.
  const actualizadoRef = useRef(0);
  actualizadoRef.current = product.dataUpdatedAt ?? 0;
  useEffect(() => {
    if (!slug || !clock.data) return;
    const server = Date.parse(clock.data.serverTime);
    if (!Number.isFinite(server)) return;
    // Fronteras de precio: apertura del pack, inicio y fin del Cyber (sin repetir).
    const fronteras = Array.from(new Set([clock.data.desde, CYBER_START, CYBER_END].map(f => Date.parse(f))))
      .filter(Number.isFinite);
    let refrescar = false;
    let proxima = Infinity;
    for (const f of fronteras) {
      const delay = f - server;
      // Ya pasó: solo hace falta releer si el dato en pantalla es de antes.
      if (delay <= 0) { if (actualizadoRef.current < f) refrescar = true; }
      else proxima = Math.min(proxima, delay);
    }
    if (refrescar) { void product.refetch(); return; }
    if (proxima > 60_000) return;
    const timer = setTimeout(() => void product.refetch(), proxima + 50);
    return () => clearTimeout(timer);
  }, [slug, clock.data, product.refetch]);
  return product;
}
