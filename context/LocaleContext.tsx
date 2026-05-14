'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ES' | 'EN' | 'PT';
export type Currency = 'ARS' | 'USD' | 'EUR';

const RATES: Record<Currency, number> = { ARS: 1, USD: 1 / 1250, EUR: 1 / 1380 };
const SYMBOLS: Record<Currency, string> = { ARS: '$', USD: 'US$', EUR: '€' };
const NUMBER_LOCALES: Record<Currency, string> = { ARS: 'es-AR', USD: 'en-US', EUR: 'de-DE' };

interface LocaleContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (arsAmount: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ES');
  const [currency, setCurrencyState] = useState<Currency>('ARS');

  useEffect(() => {
    const l = localStorage.getItem('hs-language') as Language;
    const c = localStorage.getItem('hs-currency') as Currency;
    if (l) setLanguageState(l);
    if (c) setCurrencyState(c);
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
    const converted = arsAmount * RATES[currency];
    if (currency === 'ARS') {
      // Deterministic ARS format: integer with dot as thousands separator
      return `$ ${Math.round(converted).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
    return `${SYMBOLS[currency]} ${converted.toFixed(2)}`;
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage, currency, setCurrency, formatPrice }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
