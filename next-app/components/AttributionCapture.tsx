'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution } from '@/lib/attribution';

// Guarda el origen de la visita (utm/fbclid/referrer/landing) en cada página,
// para que el checkout lo mande al crear el pedido. Ver lib/attribution.ts.
export default function AttributionCapture() {
  const pathname = usePathname();
  useEffect(() => {
    captureAttribution();
  }, [pathname]);
  return null;
}
