'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PACK_REGULAR_UNIDADES,
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
 * si el fetch falla. Nunca al revés: con el fallback el carrito muestra el
 * descuento más chico y el servidor, que sí sabe la hora, cobra el del evento
 * — se cobra de menos, no de más.
 *
 * Mismo patrón que usePromo3x2Status. Se refresca cada 5 minutos para que un
 * carrito abierto cruzando la medianoche del 2/11 (o la del 9/11) se entere.
 */
export function usePackRegularUnidades(): PackRegularUnidades {
  const { data } = useQuery<PackRegularStatus>({
    queryKey: ['pack-regular-status'],
    queryFn: async () => {
      const res = await fetch('/api/pack-regular-status');
      if (!res.ok) throw new Error('pack-regular-status failed');
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });

  return data?.unidades === 4 ? 4 : PACK_REGULAR_UNIDADES;
}
