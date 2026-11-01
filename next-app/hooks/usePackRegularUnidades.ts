'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  unidadesPackRegularDeStatus,
  type PackRegularUnidades,
} from '@/lib/promo-pack-regular';

export interface PackRegularStatus {
  unidades: PackRegularUnidades;
  x4: boolean;
  desde: string;
  hasta: string;
  serverTime: string;
}

/**
 * Tamaño del pack libre de Regular Tees, resuelto con la hora del servidor
 * (/api/pack-regular-status). El reloj del navegador no decide nada: la ventana
 * del evento HYPE 72 no se puede abrir adelantando la hora de la máquina.
 *
 * Fail-safe hacia el comportamiento de siempre (grupos de 3) mientras carga o
 * si el fetch falla — la decisión vive en unidadesPackRegularDeStatus, que está
 * testeada. Nunca al revés: con el fallback el carrito muestra el descuento más
 * chico y el servidor, que sí sabe la hora, cobra el del evento — se cobra de
 * menos, no de más.
 *
 * Refresca cada 15 segundos y programa una consulta al llegar a cada frontera
 * usando el intervalo informado por el servidor. También invalida el catálogo
 * al cambiar de ventana para actualizar las individuales y la referencia x3.
 */
export function usePackRegularUnidades(): PackRegularUnidades {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery<PackRegularStatus>({
    queryKey: ['pack-regular-status'],
    queryFn: async () => {
      const res = await fetch('/api/pack-regular-status', { cache: 'no-store' });
      if (!res.ok) throw new Error('pack-regular-status failed');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 15_000,
    retry: 2,
  });

  useEffect(() => {
    if (!data) return;
    // El reloj de referencia es el del servidor; el browser solo espera el
    // intervalo restante y vuelve a consultar, nunca activa la promo solo.
    const serverTime = Date.parse(data.serverTime);
    const boundary = [Date.parse(data.desde), Date.parse(data.hasta)]
      .find(t => t > serverTime);
    if (!Number.isFinite(serverTime) || !boundary || boundary - serverTime > 60_000) return;
    const timer = setTimeout(() => {
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    }, boundary - serverTime + 50);
    return () => clearTimeout(timer);
  }, [data, refetch, queryClient]);

  return unidadesPackRegularDeStatus(data);
}
