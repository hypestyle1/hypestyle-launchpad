'use client';

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { SALE_END_LABEL, SALE_MAX_OFF, isSaleActive } from "@/lib/sale";

// Mientras dura el Winter Sale estos dos mensajes van adelante de los fijos, y
// la pildora se pinta con el rojo de campana. Cuando el sale vence vuelve sola
// a la version neutra: no hay que acordarse de revertir nada.
const SALE_ITEMS = [
  `Winter Sale · hasta ${SALE_MAX_OFF}% OFF`,
  `Termina el ${SALE_END_LABEL}`,
];

const items = [
  "Envío gratis desde $180.000",
  "Hasta 3 cuotas sin interés",
  "Worldwide Shipping vía FedEx",
  "30 días para cambios y devoluciones",
];

export default function AnnouncementBar() {
  const { t } = useLocale();
  // Igual que SaleBanner: se renderiza en modo sale desde el servidor y el
  // cliente lo apaga si la fecha ya paso, para no parpadear de negro a rojo.
  const [enSale, setEnSale] = useState(true);
  useEffect(() => { if (!isSaleActive()) setEnSale(false); }, []);

  // Los mensajes del sale ya llevan el numero adentro, asi que no pasan por t():
  // no son claves del diccionario y traducirlos los dejaria igual.
  const base = enSale ? [...SALE_ITEMS, ...items.map(t)] : items.map(t);
  const repeated = [...base, ...base, ...base, ...base];

  return (
    <div
      className="fixed top-2.5 left-4 right-4 z-50 h-[28px] flex items-center overflow-hidden"
      style={{
        borderRadius: "999px",
        background: enSale ? "hsl(var(--sale) / 0.88)" : "rgba(10, 10, 10, 0.55)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="animate-marquee-fast flex whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-5 mx-5">
            <span className="text-[10px] font-normal tracking-[0.12em] text-white/80">
              {item}
            </span>
            <span
              className="inline-block w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.25)" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
