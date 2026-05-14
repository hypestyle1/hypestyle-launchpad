'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/context/CookieContext';

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

  useEffect(() => {
    if (consent !== 'all') return;
    loadPixel();
  }, [consent]);

  useEffect(() => {
    if (consent === 'all' && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, consent]);

  return null;
}
