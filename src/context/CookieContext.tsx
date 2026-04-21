import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ConsentLevel = "all" | "necessary" | null;

interface CookieContextType {
  consent: ConsentLevel;
  acceptAll: () => void;
  acceptNecessary: () => void;
  resetConsent: () => void;
}

const STORAGE_KEY = "hy_cookie_consent";

const CookieContext = createContext<CookieContextType | null>(null);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentLevel>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ConsentLevel) ?? null;
  });

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, "all");
    setConsent("all");
  };

  const acceptNecessary = () => {
    localStorage.setItem(STORAGE_KEY, "necessary");
    setConsent("necessary");
  };

  const resetConsent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
  };

  return (
    <CookieContext.Provider value={{ consent, acceptAll, acceptNecessary, resetConsent }}>
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieProvider");
  return ctx;
}
