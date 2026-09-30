'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ConsentLevel = 'all' | 'necessary' | null;

interface CookieContextType {
  consent: ConsentLevel;
  acceptAll: () => void;
  acceptNecessary: () => void;
  resetConsent: () => void;
  /** Cerró el cartel sin elegir: no vuelve en esta visita, la medición sigue como estaba. */
  dismiss: () => void;
  /** El cartel está en pantalla. El popup de newsletter espera a que se vaya. */
  bannerOpen: boolean;
}

const STORAGE_KEY = 'hy_cookie_consent';
const CookieContext = createContext<CookieContextType | null>(null);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentLevel>(null);
  const [dismissed, setDismissed] = useState(false);
  // Hasta leer localStorage no se sabe si hay que mostrar el cartel: en ese
  // instante se considera cerrado para no frenar nada por un render.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setConsent((saved as ConsentLevel) ?? null);
    setReady(true);
  }, []);

  const acceptAll = () => { localStorage.setItem(STORAGE_KEY, 'all'); setConsent('all'); };
  const acceptNecessary = () => { localStorage.setItem(STORAGE_KEY, 'necessary'); setConsent('necessary'); };
  const resetConsent = () => { localStorage.removeItem(STORAGE_KEY); setConsent(null); setDismissed(false); };
  const dismiss = () => setDismissed(true);
  const bannerOpen = ready && consent === null && !dismissed;

  return (
    <CookieContext.Provider value={{ consent, acceptAll, acceptNecessary, resetConsent, dismiss, bannerOpen }}>
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieProvider');
  return ctx;
}
