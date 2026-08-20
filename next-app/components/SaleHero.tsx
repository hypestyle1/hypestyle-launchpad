import { SALE_DESCRIPTOR, SALE_NOMBRE, SALE_URGENCIA } from "@/lib/sale";

/**
 * Héroe de Cold Archive — dirección "Marcador".
 *
 * Server component a propósito: los días restantes se calculan en el servidor y
 * viajan ya resueltos. Si el contador se calculara en el cliente, el HTML del
 * servidor y el del navegador podrían diferir y React vuelve a renderizar la
 * página entera — es exactamente lo que pasó con la fecha de las reseñas en el
 * home. Con `revalidate = 60` en la página, el número se refresca solo.
 */
export default function SaleHero({ maxOff, total }: { maxOff: number; total: number }) {
  const items = [`HASTA ${maxOff}% OFF`, SALE_NOMBRE.toUpperCase(), SALE_URGENCIA.toUpperCase(), `${total} PRODUCTOS`];
  // Se duplica la tira para que el loop del marquee no muestre el corte.
  const tira = [...items, ...items, ...items];

  return (
    <section className="bg-sale text-sale-foreground">
      {/* ---- ticker ---- */}
      <div className="overflow-hidden border-b border-white/20">
        <div className="flex whitespace-nowrap py-2 hs-marquee" aria-hidden="true">
          {tira.map((t, i) => (
            <span key={i} className="px-5 text-[10.5px] font-bold uppercase tracking-[0.16em] shrink-0">
              {t}
              {/* En llaves: suelto, `///` lo lee como comentario de JSX. */}
              <span className="pl-5 opacity-40">{'///'}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---- bloque principal ---- */}
      <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-16">
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/70">
          Cierre de temporada · Otoño Invierno 26
        </p>

        <h1 className="mt-3 text-[38px] md:text-[64px] font-black italic uppercase leading-[0.9] tracking-[-0.045em]">
          {SALE_NOMBRE}<span className="text-white/55">.</span>
        </h1>
        <p className="mt-3 text-[11px] md:text-[13px] font-medium uppercase tracking-[0.3em] text-white/65">
          {SALE_DESCRIPTOR}
        </p>

        <p className="mt-6 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.28em] text-white/65">
          Hasta
        </p>
        <div className="mt-1 flex items-baseline gap-2 md:gap-3">
          <span className="text-[76px] md:text-[128px] font-black leading-[0.82] tracking-[-0.06em]">
            {maxOff}
          </span>
          <span className="text-[28px] md:text-[44px] font-black tracking-[-0.03em] pb-1 md:pb-2">
            % OFF
          </span>
        </div>

        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/25 pt-5">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Duración</dt>
            <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em]">{SALE_URGENCIA}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Envío gratis</dt>
            <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em] tabular-nums">desde $180.000</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Con transferencia</dt>
            <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em] tabular-nums">10% extra</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
