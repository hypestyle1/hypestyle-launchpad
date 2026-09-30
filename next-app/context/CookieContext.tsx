'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isGdprCountry, readCountryCookie } from '@/lib/geo';

type ConsentLevel = 'all' | 'necessary' | null;

interface CookieContextType {
  consent: ConsentLevel;
  acceptAll: () => void;
  acceptNecessary: () => void;
  resetConsent: () => void;
  /** Cerró el cartel sin elegir: no vuelve en esta visita, la medición sigue como estaba. */
  dismiss: () => void;
  /** El cartel está en pantalla. */
  bannerOpen: boolean;
  /** El visitante entra desde donde rige el RGPD: cartel completo, con opción de rechazar. */
  gdpr: boolean;
  /** El cartel completo está en pantalla y hay que elegir: el popup de newsletter espera. */
  bannerBlocking: boolean;
}

const STORAGE_KEY = 'hy_cookie_consent';
const CookieContext = createContext<CookieContextType | null>(null);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentLevel>(null);
  const [dismissed, setDismissed] = useState(false);
  // Hasta leer localStorage no se sabe si hay que mostrar el cartel: en ese
  // instante se considera cerrado para no frenar nada por un render.
  const [ready, setReady] = useState(false);
  const [gdpr, setGdpr] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setConsent((saved as ConsentLevel) ?? null);
    setGdpr(isGdprCountry(readCountryCookie()));
    setReady(true);
  }, []);

  const acceptAll = () => { localStorage.setItem(STORAGE_KEY, 'all'); setConsent('all'); };
  const acceptNecessary = () => { localStorage.setItem(STORAGE_KEY, 'necessary'); setConsent('necessary'); };
  const resetConsent = () => { localStorage.removeItem(STORAGE_KEY); setConsent(null); setDismissed(false); };
  const dismiss = () => setDismissed(true);
  const bannerOpen = ready && consent === null && !dismissed;
  const bannerBlocking = bannerOpen && gdpr;

  return (
    <CookieContext.Provider value={{ consent, acceptAll, acceptNecessary, resetConsent, dismiss, bannerOpen, gdpr, bannerBlocking }}>
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieProvider');
  return ctx;
}
