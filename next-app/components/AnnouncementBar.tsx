'use client';

import { useLocale } from "@/context/LocaleContext";

// El envío gratis es solo para Argentina: a quien entra desde afuera no se le muestra.
const ENVIO_GRATIS = "Envío gratis a sucursal desde $180.000";

const items = [
  ENVIO_GRATIS,
  "Hasta 3 cuotas sin interés",
  "Worldwide Shipping vía FedEx",
  "30 días para cambios y devoluciones",
  "Gift Card · regalá crédito de a $50.000",
];

export default function AnnouncementBar() {
  const { t, country } = useLocale();
  const desdeAfuera = country !== null && country !== 'AR';
  const base = (desdeAfuera ? items.filter((i) => i !== ENVIO_GRATIS) : items).map(t);
  const repeated = [...base, ...base, ...base, ...base];

  return (
    <div
      className="fixed top-2.5 left-4 right-4 z-50 h-[28px] flex items-center overflow-hidden"
      style={{
        borderRadius: "999px",
        background: "rgba(10, 10, 10, 0.55)",
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
