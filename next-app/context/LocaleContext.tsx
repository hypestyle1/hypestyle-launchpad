'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translate } from '@/lib/i18n';
import { FxRates, FX_FALLBACK } from '@/lib/fx';
import { readCountryCookie, localeForCountry } from '@/lib/geo';

export type Language = 'ES' | 'EN' | 'PT';
export type Currency = 'ARS' | 'USD' | 'EUR';

const SYMBOLS: Record<Currency, string> = { ARS: '$', USD: 'US$', EUR: '€' };
const NUMBER_LOCALES: Record<Currency, string> = { ARS: 'es-AR', USD: 'en-US', EUR: 'de-DE' };

interface LocaleContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (arsAmount: number) => string;
  /** Traduce un texto de interfaz al idioma activo (cae a español si falta). */
  t: (text: string) => string;
  /**
   * País detectado por el middleware (ISO-2), o null si no se pudo resolver.
   * El checkout lo usa para preseleccionar el destino en vez de asumir AR.
   */
  country: string | null;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ES');
  const [currency, setCurrencyState] = useState<Currency>('ARS');
  const [country, setCountry] = useState<string | null>(null);
  // Arranca con el respaldo de lib/fx para poder pintar precios en el primer
  // render; la cotización real llega enseguida y solo cambia el número, no el
  // layout.
  const [rates, setRates] = useState<FxRates>(FX_FALLBACK);

  // Idioma y moneda: la elección explícita de la persona manda siempre. Si
  // nunca eligió, se toma la del país detectado. El estado inicial se deja en
  // ES/ARS para que el HTML del server y el del cliente coincidan, y el ajuste
  // pasa acá, después de hidratar.
  useEffect(() => {
    const storedLang = localStorage.getItem('hs-language') as Language | null;
    const storedCurr = localStorage.getItem('hs-currency') as Currency | null;

    const detected = readCountryCookie();
    setCountry(detected);
    const guess = localeForCountry(detected);

    if (storedLang) setLanguageState(storedLang);
    else if (guess) setLanguageState(guess.language);

    if (storedCurr) setCurrencyState(storedCurr);
    else if (guess) setCurrencyState(guess.currency);
  }, []);

  // Cotización en vivo, la misma con la que después cobra PayPal.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fx-rate')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FxRates | null) => {
        if (!cancelled && data && data.USD > 0 && data.EUR > 0) setRates(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function setLanguage(l: Language) {
    setLanguageState(l);
    localStorage.setItem('hs-language', l);
  }

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem('hs-currency', c);
  }

  function formatPrice(arsAmount: number): string {
    if (currency === 'ARS') {
      // Deterministic ARS format: integer with dot as thousands separator
      return `$ ${Math.round(arsAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
    const converted = arsAmount / rates[currency];
    return `${SYMBOLS[currency]} ${converted.toFixed(2)}`;
  }

  function t(text: string): string {
    return translate(text, language);
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage, currency, setCurrency, formatPrice, t, country }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
