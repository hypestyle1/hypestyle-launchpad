'use client';

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, Language } from "@/context/LocaleContext";
import { readCountryCookie, localeForCountry, LocaleGuess } from "@/lib/geo";

const STORAGE_KEY = "hs-locale-prompted";

// El aviso estaba escrito en español justo para quien probablemente no lo lea.
// Ahora se muestra en el idioma que se está ofreciendo.
const COPY: Record<Language, { title: string; note: string; dismiss: string }> = {
  ES: {
    title: "Elegí tu idioma y moneda",
    note: "Podés cambiarlo cuando quieras.",
    dismiss: "Mantener así",
  },
  EN: {
    title: "Choose your language and currency",
    note: "You can change this whenever you want.",
    dismiss: "Keep as is",
  },
  PT: {
    title: "Escolha seu idioma e moeda",
    note: "Você pode mudar quando quiser.",
    dismiss: "Manter assim",
  },
};

export default function LocaleSuggestion() {
  const [suggestion, setSuggestion] = useState<LocaleGuess | null>(null);
  const [visible, setVisible] = useState(false);
  const { setLanguage, setCurrency } = useLocale();

  // LocaleContext ya aplicó el idioma y la moneda sugeridos al cargar. Este
  // aviso existe para que la persona sepa que cambiaron y pueda volver atrás,
  // así que solo aparece si nunca eligió a mano.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (localStorage.getItem("hs-language") || localStorage.getItem("hs-currency")) return;

    const guess = localeForCountry(readCountryCookie());
    if (!guess) {
      localStorage.setItem(STORAGE_KEY, "1");
      return;
    }
    setSuggestion(guess);
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function accept() {
    if (!suggestion) return;
    setLanguage(suggestion.language);
    setCurrency(suggestion.currency);
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible || !suggestion) return null;

  const copy = COPY[suggestion.language];

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{
        background: "rgba(245, 243, 237, 0.55)",
        backdropFilter: "blur(60px) saturate(280%) brightness(1.15)",
        WebkitBackdropFilter: "blur(60px) saturate(280%) brightness(1.15)",
        border: "1px solid rgba(255,255,255,0.55)",
        boxShadow: "0 16px 60px rgba(0,0,0,0.18), inset 0 1.5px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.04)",
        borderRadius: "20px",
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-[14px] font-semibold text-foreground">{copy.title}</p>
          <button onClick={dismiss} className="text-foreground/30 hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-[12px] text-muted-foreground mb-4">{copy.note}</p>

        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 bg-foreground text-primary-foreground py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] hover:bg-foreground/85 transition-colors rounded-[10px]"
          >
            {suggestion.label}
          </button>
          <button
            onClick={dismiss}
            className="flex-1 border border-border py-2.5 text-[12px] font-medium text-foreground/60 hover:text-foreground hover:border-foreground/40 transition-colors rounded-[10px]"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
