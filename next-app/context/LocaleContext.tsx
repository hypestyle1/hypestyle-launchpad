'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translate } from '@/lib/i18n';
import { FxRates, FX_FALLBACK, mergeRates } from '@/lib/fx';
import { Currency, formatMoney, isCurrency } from '@/lib/currency';
import { readCountryCookie } from '@/lib/geo';

export type Language = 'ES' | 'EN' | 'PT' | 'DE' | 'FR' | 'IT';
// Las monedas viven en lib/currency.ts (lista, símbolos y formato, con tests).
export type { Currency };

/**
 * Idiomas que el sitio realmente traduce. Los selectores (Footer, LocalePopup)
 * tienen que salir de acá y no de una lista propia: el Footer llegó a ofrecer
 * DE/FR/IT, que no existían ni en el tipo Language ni en el diccionario, así
 * que se veían, se podían clickear y no pasaba nada. Desde el 15/09/2026 los
 * tres existen de verdad, con su columna completa en lib/i18n.ts.
 *
 * Sumar un idioma = agregarlo al tipo, a esta lista Y completar su columna en
 * lib/i18n.ts. Si falta lo último, cae a español sin avisar.
 */
export const LANGUAGES: Language[] = ['ES', 'EN', 'PT', 'DE', 'FR', 'IT'];

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
  /**
   * Igual que formatPrice pero en una moneda puntual. El checkout lo usa para
   * decir cuánto se cobra de verdad (pesos o dólares) cuando la persona está
   * mirando los precios en otra moneda.
   */
  formatPriceIn: (arsAmount: number, c: Currency) => string;
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

  // Idioma y moneda: el sitio es español y pesos para todos, personas y
  // buscadores, salvo que la persona haya elegido otra cosa a mano (selector o
  // aceptando la sugerencia de LocaleSuggestion). Hasta el 13/10/2026 acá se
  // aplicaba solo la del país detectado (o la del navegador), y como Googlebot
  // rastrea desde EE.UU. indexaba las páginas en inglés y con US$ mientras el
  // JSON-LD decía ARS. Ver "SEO 2.0 — Etapa 3" en el vault, alternativa A.
  //
  // Lo guardado se aplica después de hidratar para que el HTML del server y el
  // del cliente coincidan.
  useEffect(() => {
    const storedRaw = localStorage.getItem('hs-language');
    const storedLang = (LANGUAGES as string[]).includes(storedRaw ?? '') ? (storedRaw as Language) : null;
    const storedCurrRaw = localStorage.getItem('hs-currency');
    const storedCurr = isCurrency(storedCurrRaw) ? storedCurrRaw : null;

    // El país se sigue leyendo: el checkout lo usa para preseleccionar el
    // destino del envío, y LocaleSuggestion para ofrecer el cambio.
    setCountry(readCountryCookie());

    if (storedLang) setLanguageState(storedLang);
    if (storedCurr) { setCurrencyState(storedCurr); setCurrencyChosen(true); }
  }, []);

  // El server siempre manda <html lang="es"> porque la elección vive en
  // localStorage. Acá se corrige después de hidratar, para lectores de
  // pantalla y para que el navegador no ofrezca traducir una página que ya
  // está en el idioma de la persona.
  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  // Cotización en vivo, la misma con la que después cobra PayPal.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fx-rate')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        // Moneda por moneda: lo que falte o venga roto se queda con el respaldo.
        if (!cancelled && data) setRates(mergeRates(data));
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

  function formatPriceIn(arsAmount: number, c: Currency): string {
    return formatMoney(arsAmount, c, rates);
  }

  function formatPrice(arsAmount: number): string {
    return formatMoney(arsAmount, currency, rates);
  }

  function t(text: string): string {
    return translate(text, language);
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage, currency, setCurrency, currencyChosen, formatPrice, formatPriceIn, t, country }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
