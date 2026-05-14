'use client';

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLocale, Language, Currency } from "@/context/LocaleContext";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "ES", label: "Español" },
  { code: "EN", label: "English" },
  { code: "PT", label: "Português" },
];

const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "ARS", symbol: "$", label: "Pesos argentinos" },
  { code: "USD", symbol: "US$", label: "Dólares" },
  { code: "EUR", symbol: "€", label: "Euros" },
];

const glassStyle = {
  background: "rgba(240, 238, 232, 0.96)",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
} as React.CSSProperties;

export default function LocalePopup({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { language, setLanguage, currency, setCurrency } = useLocale();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150"
        aria-label="Idioma y moneda"
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={1.2} />
        <span className="hidden lg:inline text-[11px] tracking-[0.06em]">{language}</span>
        <span className="hidden lg:inline text-foreground/25 text-[10px]">·</span>
        <span className="hidden lg:inline text-[11px] tracking-[0.06em]">{currency}</span>
        <ChevronDown
          className="hidden lg:inline w-2.5 h-2.5 transition-transform duration-200"
          strokeWidth={1.2}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[210px] animate-in fade-in duration-150 rounded-[12px] overflow-hidden z-50"
          style={glassStyle}
        >
          {/* Idioma */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-2">
              Idioma
            </p>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className="w-full flex items-center justify-between py-1.5 text-[12px] transition-colors hover:text-foreground"
                style={{ color: language === lang.code ? "inherit" : "rgba(0,0,0,0.45)" }}
              >
                <span>
                  <span className="font-semibold mr-2">{lang.code}</span>
                  <span className="font-normal">{lang.label}</span>
                </span>
                {language === lang.code && (
                  <Check className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                )}
              </button>
            ))}
          </div>

          <div className="mx-4 my-2 h-px bg-foreground/8" />

          {/* Moneda */}
          <div className="px-4 pb-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-2">
              Moneda
            </p>
            {CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                onClick={() => setCurrency(cur.code)}
                className="w-full flex items-center justify-between py-1.5 text-[12px] transition-colors hover:text-foreground"
                style={{ color: currency === cur.code ? "inherit" : "rgba(0,0,0,0.45)" }}
              >
                <span>
                  <span className="font-semibold mr-1">{cur.symbol}</span>
                  <span className="font-semibold mr-2">{cur.code}</span>
                  <span className="font-normal">{cur.label}</span>
                </span>
                {currency === cur.code && (
                  <Check className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
