'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/context/CookieContext';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window { dataLayer: any[]; gtag: (...args: any[]) => void; }
}

function loadGA() {
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
}

export default function GoogleAnalytics() {
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  // Mismo modelo opt-out que MetaPixel/Clarity.
  const trackingAllowed = consent !== 'necessary';

  useEffect(() => {
    if (!GA_ID || !trackingAllowed) return;
    loadGA();
  }, [trackingAllowed]);

  useEffect(() => {
    if (GA_ID && trackingAllowed && window.gtag) {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname, trackingAllowed]);

  return null;
}
