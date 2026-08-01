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
    loadClarity();
  }, [trackingAllowed]);

  return null;
}
