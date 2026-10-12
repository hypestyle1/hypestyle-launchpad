'use client';

import { useSyncExternalStore } from 'react';

/**
 * ¿Ya se pintó lo importante de la página? Se considera que sí con lo primero
 * que pase de:
 *  - el LCP pinta una imagen (en la colección, la foto del hero);
 *  - la persona empieza a scrollear (quiere ver lo de abajo);
 *  - el evento `load`.
 *
 * Lo usan las cards con `mountMargin` (ProductCard): antes de esto montan solo
 * las cercanas, para no sacarle banda al hero; después precargan con un margen
 * amplio, para que un scroll rápido no encuentre cards vacías (11/10: con 4G
 * lento y un margen fijo de 400 px quedaban hasta 12 cards sin foto ~2 s).
 */
let listo = false;
const listeners = new Set<() => void>();

function marcar() {
  if (listo) return;
  listo = true;
  listeners.forEach((l) => l());
}

let iniciado = false;
function iniciar() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  if (document.readyState === 'complete') return marcar();
  window.addEventListener('load', marcar, { once: true });
  window.addEventListener('scroll', marcar, { once: true, passive: true });
  try {
    const po = new PerformanceObserver((l) => {
      // Una imagen grande (el hero), no el logo ni un ícono que pinte antes.
      const grande = window.innerWidth * window.innerHeight * 0.2;
      if (l.getEntries().some((e) => (e as any).element?.tagName === 'IMG' && (e as any).size >= grande)) { po.disconnect(); marcar(); }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Safari y Firefox no tienen LCP: quedan el scroll y el load.
  }
}

function subscribe(l: () => void) {
  iniciar();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useCriticalPainted(): boolean {
  return useSyncExternalStore(subscribe, () => listo, () => false);
}
