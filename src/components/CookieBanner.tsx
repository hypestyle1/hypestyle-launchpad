import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "@/context/CookieContext";

export default function CookieBanner() {
  const { consent, acceptAll, acceptNecessary } = useCookieConsent();
  const [dismissed, setDismissed] = useState(false);

  if (consent !== null || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-4 md:right-4 md:left-auto z-[200] animate-in slide-in-from-bottom-2 fade-in duration-300 md:w-[380px]">

      <div
        className="rounded-none md:rounded-[14px] px-5 py-5"
        style={{
          background: "rgba(26, 26, 26, 0.96)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            Cookies
          </p>
          <button
            onClick={() => { acceptNecessary(); setDismissed(true); }}
            className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 -mt-0.5"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-[12px] text-white/50 leading-relaxed mb-4">
          Usamos cookies para mejorar tu experiencia, recordar tu carrito y medir el
          rendimiento del sitio.{" "}
          <Link to="/politicas-de-devolucion/" className="underline underline-offset-2 text-white/60 hover:text-white transition-colors">
            Más info
          </Link>
          .
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 text-[11px] font-semibold uppercase tracking-[0.1em] bg-white text-black rounded-[8px] py-2.5 hover:bg-white/90 transition-colors"
          >
            Aceptar todo
          </button>
          <button
            onClick={acceptNecessary}
            className="flex-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-[8px] py-2.5 transition-colors"
          >
            Solo necesarias
          </button>
        </div>
      </div>
    </div>
  );
}
