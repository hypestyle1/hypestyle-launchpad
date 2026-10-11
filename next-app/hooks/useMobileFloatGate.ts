'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { getBuyBarVisible, subscribeBuyBar } from '@/lib/bottom-shift';

// Cuándo se muestran los flotantes (WhatsApp, reproductor) en mobile.
//
// En la home, recién después del hero: en celulares de pantalla baja (iPhone SE)
// caían a la altura de "SS27-01 · Ya disponible" y del CTA.
// En la ficha, recién cuando aparece la barra fija de compra (y por encima de
// ella): antes tapaban las cuotas, los talles y "Guía de talles".
// En el resto del sitio, como siempre. En desktop no cambia nada (las clases
// son `max-md:`).
//
// Vive en hooks/ y no en lib/ a propósito: Tailwind solo escanea app/,
// components/, context/ y hooks/, y las clases de acá tienen que generarse.

function subscribeScroll(l: () => void) {
  window.addEventListener('scroll', l, { passive: true });
  window.addEventListener('resize', l);
  return () => {
    window.removeEventListener('scroll', l);
    window.removeEventListener('resize', l);
  };
}

const pastHero = () => window.scrollY > window.innerHeight * 0.85;

/**
 * Clases para esconder un flotante en mobile mientras no corresponde mostrarlo.
 * `invisible` lo saca también del orden de foco y del árbol de accesibilidad.
 * Arranca escondido desde el servidor en la home y en la ficha, así que no
 * aparece y desaparece al hidratar.
 */
export function useMobileFloatGate(): string {
  const pathname = usePathname() ?? '';
  const isHome = pathname === '/';
  const isFicha = pathname.startsWith('/producto/');
  const scrolledPastHero = useSyncExternalStore(subscribeScroll, pastHero, () => false);
  const buyBarVisible = useSyncExternalStore(subscribeBuyBar, getBuyBarVisible, () => false);
  const hidden = (isHome && !scrolledPastHero) || (isFicha && !buyBarVisible);
  return hidden ? 'max-md:invisible max-md:opacity-0 max-md:translate-y-3 max-md:pointer-events-none' : '';
}
