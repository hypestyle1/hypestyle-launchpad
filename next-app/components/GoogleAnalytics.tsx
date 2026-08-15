'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/context/CookieContext';
import { onIdle } from '@/lib/defer-third-party';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window { dataLayer: any[]; gtag: (...args: any[]) => void; }
}

function loadGA(initialPath: string) {
  if (!GA_ID || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  window.gtag('js', new Date());
  // send_page_view en false porque ya mandamos un page_view manual por cada
  // cambio de pathname (mismo modelo que MetaPixel con las SPA routes).
  window.gtag('config', GA_ID, { send_page_view: false });
  // El page_view de la primera carga sale de acá y no del efecto de pathname:
  // cuando ese efecto corre en el mount, gtag todavía no existe porque la
  // carga está diferida. `initialPath` es la ruta al momento de cargar, que
  // puede no ser la del mount si el usuario navegó dentro de los 2 s.
  window.gtag('event', 'page_view', { page_path: initialPath });
}

export default function GoogleAnalytics() {
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  // Mismo modelo opt-out que MetaPixel/Clarity.
  const trackingAllowed = consent !== 'necessary';

  // El diferido puede disparar después de una navegación, así que la ruta se
  // lee al ejecutar y no al programar.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!GA_ID || !trackingAllowed) return;
    // Mismo criterio que el pixel: idle con tope de 2 s. Ver
    // lib/defer-third-party.ts.
    return onIdle(() => loadGA(pathnameRef.current));
  }, [trackingAllowed]);

  useEffect(() => {
    if (GA_ID && trackingAllowed && window.gtag) {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname, trackingAllowed]);

  return null;
}
