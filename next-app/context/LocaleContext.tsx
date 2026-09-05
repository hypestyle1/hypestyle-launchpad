'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translate } from '@/lib/i18n';
import { FxRates, FX_FALLBACK } from '@/lib/fx';
import { readCountryCookie, localeForCountry } from '@/lib/geo';

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

const SYMBOLS: Record<Currency, string> = { ARS: '$', USD: 'US$', EUR: '€' };
const NUMBER_LOCALES: Record<Currency, string> = { ARS: 'es-AR', USD: 'en-US', EUR: 'de-DE' };

interface LocaleContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  /**
   * Con `persist = false` cambia la moneda de la sesión sin guardarla como
   * elección de la persona: es lo que hace el checkout al cambiar el país de
   * envío. Una elección explícita (selector) siempre se guarda y manda.
   */
  setCurrency: (c: Currency, persist?: boolean) => void;
  /** True si la persona eligió moneda a mano alguna vez (localStorage). */
  currencyChosen: boolean;
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
  const [currencyChosen, setCurrencyChosen] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  // Arranca con el respaldo de lib/fx para poder pintar precios en el primer
  // render; la cotización real llega enseguida y solo cambia el número, no el
  // layout.
  const [rates, setRates] = useState<FxRates>(FX_FALLBACK);

  // navigator.language viene como 'en-GB', 'pt-BR', 'es-AR'. Solo interesa el
  // prefijo, y solo si es un idioma que realmente tenemos traducido: sumar uno
  // al selector sin poblar su columna del diccionario deja la interfaz en
  // español igual, y encima confunde.
  function idiomaDelNavegador(): Language | null {
    if (typeof navigator === 'undefined') return null;
    const prefs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const p of prefs) {
      const code = p.slice(0, 2).toUpperCase();
      if ((LANGUAGES as string[]).includes(code)) return code as Language;
    }
    return null;
  }

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

    // Orden: la elección explícita manda; después el país que detecta Vercel;
    // y recién ahí el idioma del navegador. Este último escalón es nuevo y es
    // aditivo: antes, alguien de afuera cuyo país no estuviera mapeado veía
    // todo en español aunque tuviera el navegador en inglés. Eso fue lo que
    // dejó a una creadora extranjera sin poder completar el formulario.
    if (storedLang) setLanguageState(storedLang);
    else if (guess) setLanguageState(guess.language);
    else {
      const delNavegador = idiomaDelNavegador();
      if (delNavegador) setLanguageState(delNavegador);
    }

    if (storedCurr) { setCurrencyState(storedCurr); setCurrencyChosen(true); }
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

  function setCurrency(c: Currency, persist = true) {
    setCurrencyState(c);
    if (persist) {
      localStorage.setItem('hs-currency', c);
      setCurrencyChosen(true);
    }
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
    <LocaleContext.Provider value={{ language, setLanguage, currency, setCurrency, currencyChosen, formatPrice, t, country }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
