import { SALE_END_LABEL, saleDaysLeft } from "@/lib/sale";

/**
 * Héroe del Winter Sale — dirección "Marcador".
 *
 * Server component a propósito: los días restantes se calculan en el servidor y
 * viajan ya resueltos. Si el contador se calculara en el cliente, el HTML del
 * servidor y el del navegador podrían diferir y React vuelve a renderizar la
 * página entera — es exactamente lo que pasó con la fecha de las reseñas en el
 * home. Con `revalidate = 60` en la página, el número se refresca solo.
 */
export default function SaleHero({ maxOff, total }: { maxOff: number; total: number }) {
  const dias = saleDaysLeft();
  const items = [`${maxOff}% OFF`, 'WINTER SALE', `TERMINA ${SALE_END_LABEL}`, `${total} PRODUCTOS`];
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

        <h1 className="mt-3 text-[38px] md:text-[64px] font-black uppercase leading-[0.9] tracking-[-0.04em]">
          Winter Sale
        </h1>

        <div className="mt-4 flex items-baseline gap-2 md:gap-3">
          <span className="text-[76px] md:text-[128px] font-black leading-[0.82] tracking-[-0.06em]">
            {maxOff}
          </span>
          <span className="text-[28px] md:text-[44px] font-black tracking-[-0.03em] pb-1 md:pb-2">
            % OFF
          </span>
        </div>

        <p className="mt-1 text-[13px] md:text-[15px] text-white/85">
          hasta, en {total} productos
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/25 pt-5">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Termina</dt>
            <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em] tabular-nums">{SALE_END_LABEL}</dd>
          </div>
          {dias !== null && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Quedan</dt>
              <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em] tabular-nums">
                {dias === 0 ? 'último día' : `${dias} días`}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-white/60">Con transferencia</dt>
            <dd className="text-[20px] md:text-[24px] font-bold tracking-[-0.02em] tabular-nums">10% extra</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
