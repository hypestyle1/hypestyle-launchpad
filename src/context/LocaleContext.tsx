import { createContext, useContext, useState, ReactNode } from "react";

export type Language = "ES" | "EN" | "PT";
export type Currency = "ARS" | "USD" | "EUR";

const RATES: Record<Currency, number> = {
  ARS: 1,
  USD: 1 / 1250,
  EUR: 1 / 1380,
};

const SYMBOLS: Record<Currency, string> = {
  ARS: "$",
  USD: "US$",
  EUR: "€",
};

const NUMBER_LOCALES: Record<Currency, string> = {
  ARS: "es-AR",
  USD: "en-US",
  EUR: "de-DE",
};

interface LocaleContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (arsAmount: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("hs-language") as Language) || "ES"
  );
  const [currency, setCurrency] = useState<Currency>(
    () => (localStorage.getItem("hs-currency") as Currency) || "ARS"
  );

  function handleSetLanguage(l: Language) {
    setLanguage(l);
    localStorage.setItem("hs-language", l);
  }

  function handleSetCurrency(c: Currency) {
    setCurrency(c);
    localStorage.setItem("hs-currency", c);
  }

  function formatPrice(arsAmount: number): string {
    const converted = arsAmount * RATES[currency];
    const formatted = converted.toLocaleString(NUMBER_LOCALES[currency], {
      minimumFractionDigits: currency === "ARS" ? 0 : 2,
      maximumFractionDigits: currency === "ARS" ? 0 : 2,
    });
    return `${SYMBOLS[currency]} ${formatted}`;
  }

  return (
    <LocaleContext.Provider value={{ language, setLanguage: handleSetLanguage, currency, setCurrency: handleSetCurrency, formatPrice }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
