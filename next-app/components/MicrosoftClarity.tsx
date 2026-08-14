'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/context/CookieContext';

const PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'xvnqh1tj9v';

declare global {
  interface Window { clarity: any; }
}

function loadClarity() {
  if (window.clarity) return;
  (function (c: any, l: any, a: any, r: any, i: any) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', PROJECT_ID);
}

export default function MicrosoftClarity() {
  const { consent } = useCookieConsent();
  // Mismo modelo opt-out que MetaPixel: trackeamos salvo que el usuario haya
  // elegido explícitamente "Solo necesarias".
  const trackingAllowed = consent !== 'necessary';

  useEffect(() => {
    if (!trackingAllowed) {
      if (window.clarity) window.clarity('consent', false);
      return;
    }

    // Clarity arranca con la primera interacción, o 5 s después de que la
    // página terminó de cargar — lo que pase primero.
    //
    // Es el script que más bloquea el hilo principal de todo el sitio: ~5 s de
    // evaluación en el home mobile, casi todo el blocking time de la página. Y
    // no mide nada que dependa de arrancar temprano — la grabación de sesión y
    // el heatmap registran igual todo el scroll y todos los clicks, porque
    // ninguno de los dos existe antes de que el usuario toque algo.
    //
    // El tope de 5 s post-load mantiene las sesiones sin interacción (los
    // rebotes) dentro de Clarity: si alguien se queda mirando la home sin
    // tocar nada, a los 5 s el hilo ya está libre y cargarlo no le cuesta nada.
    const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
    let timerId: number | undefined;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      EVENTS.forEach(ev => window.removeEventListener(ev, start));
      if (timerId !== undefined) clearTimeout(timerId);
      loadClarity();
    };

    EVENTS.forEach(ev => window.addEventListener(ev, start, { once: true, passive: true }));

    const armFallback = () => { timerId = window.setTimeout(start, 5000); };
    if (document.readyState === 'complete') armFallback();
    else window.addEventListener('load', armFallback, { once: true });

    return () => {
      EVENTS.forEach(ev => window.removeEventListener(ev, start));
      window.removeEventListener('load', armFallback);
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [trackingAllowed]);

  return null;
}
