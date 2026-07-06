'use client';

import { useQuery } from '@tanstack/react-query';
import type { Promo3x2Status } from '@/lib/promo-3x2-status';

export type { Promo3x2Status };

// Lee la query string directo de window.location (no useSearchParams): este hook se usa
// desde componentes montados en el layout raíz (Navbar, Promo3x2Bar, CartDrawer) sin
// Suspense boundary, y useSearchParams la exige. No necesita ser reactivo a la URL.
// Reenvía el query string completo (test, secret, testKickoff, testScore, testElapsed,
// testNextMatch) tal cual al endpoint, no solo test/secret.
function readTestQuery(): string {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search);
  return sp.get('test') ? `?${sp.toString()}` : '';
}

// Reemplaza isPromo3x2Active() (fechas hardcodeadas) — la promo ahora depende del
// resultado real del partido de Argentina. Fail-safe: mientras carga o si falla el
// fetch, se trata como inactiva (nunca se muestra/cobra un descuento que después
// desaparece). Propaga ?test=&secret=... de la URL para previsualizar las 3 fases.
export function usePromo3x2Status() {
  const qs = readTestQuery();

  const query = useQuery<Promo3x2Status>({
    queryKey: ['promo-3x2-status', qs],
    queryFn: async () => {
      const res = await fetch(`/api/promo-3x2-status${qs}`);
      if (!res.ok) throw new Error('promo-3x2-status failed');
      return res.json();
    },
    staleTime: 10_000,
    refetchInterval: (q) => {
      switch (q.state.data?.phase) {
        case 'live': return 20_000;
        case 'pre':  return 45_000;
        case 'won':  return 5 * 60_000;
        default:     return 10 * 60_000;
      }
    },
    retry: 2,
  });

  const phase = query.data?.phase ?? null;
  const promoActive = query.data?.promoActive === true;

  return { ...query, phase, promoActive };
}
