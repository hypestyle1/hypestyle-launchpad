import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, Language, Currency } from "@/context/LocaleContext";

interface Suggestion {
  country: string;
  language: Language;
  currency: Currency;
  flag: string;
  label: string;
}

function getSuggestion(countryCode: string): Suggestion | null {
  const US_LIKE = ["US", "CA", "AU", "NZ", "GB", "IE", "SG", "HK"];
  const EU_LIKE = ["DE", "FR", "IT", "NL", "BE", "AT", "CH", "PT", "FI", "SE", "NO", "DK", "PL", "GR", "CZ", "HU", "RO"];
  const ES_LATAM = ["MX", "CO", "CL", "PE", "UY", "PY", "BO", "EC", "VE", "CR", "GT", "HN", "SV", "NI", "PA", "DO", "CU", "PR", "ES"];

  if (countryCode === "AR") return null;

  if (US_LIKE.includes(countryCode)) {
    return { country: countryCode, language: "EN", currency: "USD", flag: "🌎", label: "English · US Dollar" };
  }
  if (EU_LIKE.includes(countryCode)) {
    const isPortuguese = countryCode === "PT" || countryCode === "BR";
    return { country: countryCode, language: isPortuguese ? "PT" : "EN", currency: "EUR", flag: "🌍", label: `${isPortuguese ? "Português" : "English"} · Euro` };
  }
  if (countryCode === "BR") {
    return { country: countryCode, language: "PT", currency: "USD", flag: "🌎", label: "Português · Dólar" };
  }
  if (ES_LATAM.includes(countryCode)) {
    return { country: countryCode, language: "ES", currency: "USD", flag: "🌎", label: "Español · Dólar" };
  }

  return { country: countryCode, language: "EN", currency: "USD", flag: "🌐", label: "English · US Dollar" };
}

const STORAGE_KEY = "hs-locale-prompted";

export default function LocaleSuggestion() {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [visible, setVisible] = useState(false);
  const { setLanguage, setCurrency } = useLocale();

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const code = data?.country_code as string;
        if (!code) return;
        const s = getSuggestion(code);
        if (s) {
          setSuggestion(s);
          setTimeout(() => setVisible(true), 1200);
        } else {
          localStorage.setItem(STORAGE_KEY, "1");
        }
      })
      .catch(() => {});
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
          <p className="text-[14px] font-semibold text-foreground">Elegí tu idioma y moneda</p>
          <button onClick={dismiss} className="text-foreground/30 hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-[12px] text-muted-foreground mb-4">Podés cambiarlo cuando quieras.</p>

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
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
