'use client';

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import Link from "next/link";
import { useCookieConsent } from "@/context/CookieContext";
import { useLocale } from "@/context/LocaleContext";
import { isGdprCountry, readCountryCookie } from "@/lib/geo";
import { useBottomShift } from "@/lib/bottom-shift";

/**
 * Dos carteles según de dónde entra el visitante:
 *
 * - Europa (RGPD): el cartel completo, con la opción de apagar la medición.
 * - El resto (Argentina casi siempre): un aviso de una línea con "Entendido".
 *   Acá la ley no exige pedir permiso, y cada "Solo necesarias" era una venta
 *   que Meta y GA4 no veían. El aviso no da la opción; quien quiera, tiene
 *   el link a la política.
 *
 * La X solo cierra el cartel por esta visita: antes contaba como "Solo
 * necesarias" y apagaba el pixel a cualquiera que la cerrara sin leer.
 */
export default function CookieBanner() {
  const { bannerOpen, acceptAll, acceptNecessary, dismiss } = useCookieConsent();
  const { t } = useLocale();
  const pathname = usePathname();
  const [gdpr, setGdpr] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const isAdmin = !!pathname?.startsWith("/admin");
  // Mientras el cartel está abajo, WhatsApp, el reproductor y la pastilla de reseñas suben.
  useBottomShift(boxRef, bannerOpen && !isAdmin);

  useEffect(() => {
    setGdpr(isGdprCountry(readCountryCookie()));
  }, []);

  // El panel es interno y no tiene visitantes a los que pedirles
  // consentimiento. El cartel es fijo al pie, así que desde el teléfono
  // tapaba justo los botones de cada fila.
  if (isAdmin) return null;

  if (!bannerOpen) return null;

  const policy = (
    <Link href="/politica-de-privacidad/" className="underline underline-offset-2 text-white/60 hover:text-white transition-colors">
      {t('Más info')}
    </Link>
  );

  if (!gdpr) {
    // Centrado abajo: a los costados están el reproductor y el botón de WhatsApp.
    return (
      <div ref={boxRef} className="fixed bottom-0 left-0 right-0 md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[520px] z-[200] animate-in slide-in-from-bottom-2 fade-in duration-300">
        <div
          className="flex items-center gap-3 rounded-none md:rounded-[12px] px-4 py-2.5"
          style={{
            background: "rgba(26, 26, 26, 0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          }}
        >
          <p className="flex-1 text-[11.5px] text-white/60 leading-snug">
            {t('Usamos cookies para mejorar tu experiencia y medir el rendimiento de nuestros anuncios.')}{" "}
            {policy}.
          </p>
          <button
            onClick={acceptAll}
            className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] bg-white text-black rounded-[8px] px-3.5 py-2 hover:bg-white/90 transition-colors"
          >
            {t('Entendido')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="fixed bottom-0 left-0 right-0 md:bottom-4 md:right-4 md:left-auto z-[200] animate-in slide-in-from-bottom-2 fade-in duration-300 md:w-[380px]">
      <div
        className="rounded-none md:rounded-[14px] px-4 py-3.5 md:px-5 md:py-5"
        style={{
          background: "rgba(26, 26, 26, 0.96)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-2 md:mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            {t('Cookies')}
          </p>
          <button
            onClick={dismiss}
            className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 -mt-0.5"
            aria-label={t('Cerrar')}
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-[12px] text-white/50 leading-snug md:leading-relaxed mb-2.5 md:mb-4">
          {t('Usamos cookies para mejorar tu experiencia y medir el rendimiento del sitio.')}{" "}
          {policy}.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={acceptAll}
            className="flex-1 text-[11px] font-semibold uppercase tracking-[0.1em] bg-white text-black rounded-[8px] py-2 md:py-2.5 hover:bg-white/90 transition-colors"
          >
            {t('Aceptar todo')}
          </button>
          <button
            onClick={acceptNecessary}
            className="flex-1 text-[11px] font-medium uppercase tracking-[0.1em] text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-[8px] py-2 md:py-2.5 transition-colors"
          >
            {t('Solo necesarias')}
          </button>
        </div>
      </div>
    </div>
  );
}
