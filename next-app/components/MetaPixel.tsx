'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/context/CookieContext';
import { onIdle } from '@/lib/defer-third-party';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '412944573148639';

declare global {
  interface Window { fbq: any; _fbq: any; }
}

function loadPixel() {
  if (window.fbq) return;
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true;
    t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

export default function MetaPixel() {
  const { consent } = useCookieConsent();
  const pathname = usePathname();

  // Modelo opt-out: trackeamos por defecto (consentimiento implícito mientras
  // el usuario no decide). Solo NO cargamos el pixel si eligió explícitamente
  // "Solo necesarias". Antes era opt-in puro (consent === 'all'), lo que dejaba
  // sin PageView/AddToCart a casi todo el tráfico (default + quienes rechazan).
  const trackingAllowed = consent !== 'necessary';

  useEffect(() => {
    if (!trackingAllowed) {
      // Si ya se había cargado y luego el usuario opta por salir, revocamos.
      if (window.fbq) window.fbq('consent', 'revoke');
      return;
    }
    // Diferido al primer hueco libre del hilo principal, con tope de 2 s.
    // fbevents.js son ~300-500 ms de blocking en mobile y no hay nada que
    // medir en los primeros 2 s más allá del PageView, que igual sale porque
    // el timeout lo garantiza. Ver lib/defer-third-party.ts.
    return onIdle(loadPixel);
  }, [trackingAllowed]);

  useEffect(() => {
    // En el primer render fbq todavía no existe (está diferido): ese PageView
    // inicial lo manda loadPixel(). Acá solo salen los de navegación SPA.
    if (trackingAllowed && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, trackingAllowed]);

  return null;
}
