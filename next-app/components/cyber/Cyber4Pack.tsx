'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';

/* 4 PACK REGULAR TEES — la primera sección de producto de la página y el best
   seller de la marca.

   ── Qué se arregló el 29/10 ─────────────────────────────────────────────────
   1. **El beneficio no se leía de un vistazo.** El título competía con un
      párrafo largo y los pasos estaban en letra chica al pie. Ahora el título
      es lo más grande de la sección, abajo va una línea que lo explica y los
      tres pasos son una banda propia, numerada y corta. En tres segundos:
      qué es, cómo funciona, qué entra, dónde se compra.
   2. **El aire muerto en desktop.** Con la Regular Red son CINCO remeras y la
      grilla era de cuatro columnas: la quinta caía sola en una fila nueva con
      tres huecos al lado. La grilla pasa a cinco columnas exactas, que es
      justo el número de colores — se cierra sin sobras y, de paso, el pack se
      lee como lo que es: la familia completa.
   3. **El largo en mobile.** Las cinco cards apiladas eran tres pantallas de
      scroll antes de llegar al botón. Ahora van en una tira deslizable: se
      ven todas, ocupan una franja y el CTA queda cerca.
   4. **La foto.** Era un flatlay suelto que no vendía nada. Ahora es la del
      posteo del pack —las tres remeras sobre hormigón, que muestra
      literalmente el producto— y comparte bloque con el texto en vez de
      ocupar media pantalla sola.

   El motor no se toca: `lib/promo-pack-regular.ts` ya cobra cada 4 Regular al
   precio del 3 PACK dentro de la ventana. Esta sección solo lo explica y
   acerca las remeras. */

const PASOS = [
  { n: '1', t: 'Elegí 4 Regular', d: 'Black, White, Melange, Navy y Red.' },
  { n: '2', t: 'Sumalas al carrito', d: 'Mezclá colores y talles como quieras.' },
  { n: '3', t: 'Pagás 3', d: 'El descuento se aplica solo. Sin código.' },
];

export default function Cyber4Pack({ slugs }: { slugs: string[] }) {
  const { data } = useProducts();

  const productos = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
  }, [data, slugs]);

  return (
    <section id="pack" className="bg-background px-4 py-12 text-foreground md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        {/* ── Bloque principal: el mensaje y la foto, juntos ──────────────── */}
        <div className="grid grid-cols-1 overflow-hidden rounded-[16px] bg-[#0a0a0a] text-white md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col justify-between px-5 py-7 md:px-9 md:py-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
                Solo durante el evento
              </p>
              <h2 className="mt-2.5 text-[40px] font-black uppercase leading-[0.86] tracking-[-0.02em] md:text-[62px]">
                Pagás 3,
                <br />
                llevás 4
              </h2>
              <p className="mt-3.5 max-w-[42ch] text-[14px] leading-[1.5] text-white/65 md:text-[15px]">
                Las Regular de siempre, ahora con precio de 3 PACK. Elegís cuatro y se descuenta
                solo.
              </p>
            </div>

            {/* Los tres pasos, en banda */}
            <ol className="mt-7 grid grid-cols-3 gap-3 border-t border-white/12 pt-5 md:mt-9 md:gap-4">
              {PASOS.map((p) => (
                <li key={p.n}>
                  <span className="block text-[11px] font-black text-white/30 md:text-[12px]">
                    {p.n}
                  </span>
                  <p className="mt-1 text-[11.5px] font-bold uppercase leading-[1.15] tracking-[0.04em] text-white md:text-[13px]">
                    {p.t}
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.4] text-white/50 md:text-[12.5px]">
                    {p.d}
                  </p>
                </li>
              ))}
            </ol>

            <Link
              href="/colecciones/regular-tees"
              className="mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] transition-transform duration-300 hover:scale-[1.02] md:mt-8 md:w-auto md:self-start md:px-10"
            >
              Armá tu 4 PACK
              <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true">
                <path
                  d="M9.6.7 13.9 5 9.6 9.3M13.3 5H.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {/* La foto del posteo del pack: las tres sobre hormigón. En mobile
              va debajo del texto, en una franja ancha que no roba scroll. */}
          <div className="relative min-h-[240px] md:min-h-[460px]">
            <Image
              src="/cyber/pack/flatlay.webp"
              alt="Regular Tees — black, white y navy"
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover"
              style={{ objectPosition: '50% 45%' }}
            />
          </div>
        </div>

        {/* ── Las cinco Regular ───────────────────────────────────────────
            Cinco columnas exactas en desktop (una por color, sin sobras) y
            tira deslizable en mobile. */}
        {productos.length > 0 && (
          <>
            <p className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-light md:mb-4 md:mt-10">
              Los {productos.length} colores
            </p>
            <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
              {productos.map((p) => (
                <li key={p.slug} className="w-[150px] shrink-0 snap-start md:w-auto">
                  <ProductCard
                    id={p.slug}
                    name={p.name}
                    category={p.category}
                    price={p.price}
                    /* Sin `originalPrice`: ese precio anterior es un
                       `sale_price` permanente, no uno que se haya cobrado. */
                    image={p.images[0]}
                    images={p.images}
                    sizes={p.sizes}
                    stock={p.stock}
                    href={`/producto/${p.slug}`}
                    mutedPrice
                    dense
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
