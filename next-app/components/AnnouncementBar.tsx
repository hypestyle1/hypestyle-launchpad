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

interface AnnouncementBarProps {
  /**
   * Reemplaza los avisos de siempre. Lo usa el takeover de HYPE 72 para poner
   * las fechas del evento en el marquee sin sumar otra barra fija: el stack de
   * barras (`FlashSaleBar` es `fixed top-0 h-[40px]` y se apila ARRIBA de esta)
   * está atado a `--offset`, y una barra más obligaría a mover ese offset y a
   * revisar el `scroll-margin-top` de todo el sitio.
   *
   * El filtro de envío gratis para quien entra de afuera sigue valiendo: si la
   * lista nueva incluye ese mismo texto, se saca igual.
   */
  items?: readonly string[];
  /**
   * Contenido fijo a la izquierda de la pastilla, fuera del marquee (la cuenta
   * regresiva del evento). Sin esto el contador viajaría con el scroll del
   * marquee y los dígitos saltarían al cambiar de ancho.
   */
  lead?: React.ReactNode;
}

export default function AnnouncementBar({ items: itemsProp, lead }: AnnouncementBarProps = {}) {
  const { t, country } = useLocale();
  const desdeAfuera = country !== null && country !== 'AR';
  const source = itemsProp ?? items;
  const base = (desdeAfuera ? source.filter((i) => i !== ENVIO_GRATIS) : source).map(t);
  const repeated = [...base, ...base, ...base, ...base];

  const marquee = (
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
  );

  return (
    <div
      className="fixed top-2.5 left-4 right-4 z-50 h-[28px] flex items-center overflow-hidden"
      style={{
        borderRadius: "999px",
        // Material glass único (globals.css, --glass-announce-*): la versión
        // oscura del mismo beige del navbar y el índice sticky.
        background: "var(--glass-announce-bg)",
        backdropFilter: "var(--glass-announce-filter)",
        WebkitBackdropFilter: "var(--glass-announce-filter)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Sin `lead` el árbol queda EXACTAMENTE como estaba: el marquee es hijo
          directo de la pastilla. Con `lead` necesita un contenedor propio con
          `min-w-0 overflow-hidden`, porque si no el marquee (que es anchísimo)
          empuja el contador fuera de la pastilla. */}
      {lead ? (
        <>
          {lead}
          <div className="flex-1 min-w-0 overflow-hidden">{marquee}</div>
        </>
      ) : (
        marquee
      )}
    </div>
  );
}
