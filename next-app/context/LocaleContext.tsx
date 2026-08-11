'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translate } from '@/lib/i18n';

export type Language = 'ES' | 'EN' | 'PT';
export type Currency = 'ARS' | 'USD' | 'EUR';

/**
 * Idiomas que el sitio realmente traduce. Los selectores (Footer, LocalePopup)
 * tienen que salir de acá y no de una lista propia: el Footer llegó a ofrecer
 * DE/FR/IT, que no existían ni en el tipo Language ni en el diccionario, así
 * que se veían, se podían clickear y no pasaba nada.
 *
 * Sumar un idioma = agregarlo al tipo, a esta lista Y completar su columna en
 * lib/i18n.ts. Si falta lo último, cae a español sin avisar.
 */
export const LANGUAGES: Language[] = ['ES', 'EN', 'PT'];

const RATES: Record<Currency, number> = { ARS: 1, USD: 1 / 1250, EUR: 1 / 1380 };
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

  function t(text: string): string {
    return translate(text, language);
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage, currency, setCurrency, formatPrice, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
