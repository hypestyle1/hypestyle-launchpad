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

export default function Cyber4Pack({ slugs }: { slugs: string[] }) {
  const { data } = useProducts();

  const productos = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
  }, [data, slugs]);

  return (
    <section
      id="pack"
      className="bg-[linear-gradient(180deg,#e7e6df_0%,#f1f0ec_38%,hsl(var(--background))_100%)] px-4 pb-10 pt-6 text-foreground md:px-10 md:pb-14 md:pt-10"
    >
      <div className="mx-auto max-w-[1400px]">
        {/* ── Bloque principal (rediseño 3/11) ─────────────────────────────
            Fuera el panel negro gigante: la sección vive en claro, con una
            foto REAL de campaña (modelo con la Regular negra sobre ladrillo
            blanco) y el texto en un panel del mismo tono que el fondo de la
            foto. El vidrio aparece una sola vez, como chip sobre la imagen. */}
        {/* Banner 4/11: contenedor redondeado con vidrio SUTIL — blanco
            translúcido, borde claro, brillo arriba a la izquierda y sombra en
            capas (una corta de contacto + una larga y difusa) para que se
            despegue apenas de la página. La foto va adentro, también
            redondeada, y sigue siendo la protagonista. */}
        <div className="cyber-pack-glass relative grid grid-cols-1 rounded-[26px] p-1.5 md:grid-cols-2 md:items-stretch md:rounded-[32px] md:p-2">
          <div className="relative aspect-[5/6] overflow-hidden rounded-[20px] bg-[#f4f4f2] md:aspect-auto md:min-h-[540px] md:rounded-[25px]">
            <Image
              src="/cyber/pack/modelo.webp"
              alt="Regular Tee black — campaña Hype"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
              style={{ objectPosition: '50% 20%' }}
            />
            <span className="cyber-glass-light absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#0a0a0a] md:left-4 md:top-4 md:text-[10px]">
              Solo durante Cyber Hype
            </span>
          </div>

          <div className="relative flex flex-col justify-center px-4 pb-4 pt-5 md:px-12 md:py-10">
            <h2 className="text-[34px] font-black uppercase leading-[0.86] tracking-[-0.02em] md:text-[56px]">
              Llevás 4,
              <br />
              pagás 3.
            </h2>
            <p className="mt-2.5 max-w-[42ch] text-[13px] leading-[1.5] text-foreground/65 md:mt-3.5 md:text-[15px]">
              Elegí 4 Regular Tees, combiná colores y talles como quieras y pagá solamente 3.
            </p>
            {/* El precio cerrado del pack: el mismo que cobra
                `lib/promo-pack-regular.ts` dentro de la ventana. Sin precio
                tachado ni porcentaje, como el resto del evento. */}
            <p className="mt-4 text-[17px] font-black uppercase tracking-[0.02em] md:text-[20px]">
              4 Regular Tees por $ 66.300
            </p>
            {/* El salto contra el 3 PACK, que es el argumento del upsell.
                $6.400 y no $6.300: el 3 PACK bajó a $59.900 (66.300 −
                59.900). Si se vuelve a mover alguno de los dos, este número
                tiene que moverse con ellos. */}
            <p className="mt-1.5 max-w-[44ch] text-[13px] font-semibold leading-[1.4] text-foreground/75 md:text-[14.5px]">
              Sumá una cuarta por solo $ 6.400 más. Descuento automático en el carrito, sin código.
            </p>

            <Link
              href="/colecciones/regular-tees"
              className="mt-5 inline-flex h-[48px] w-full items-center justify-center gap-2.5 rounded-full bg-[#0a0a0a] px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-85 md:mt-7 md:w-auto md:self-start md:px-10"
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
        </div>

        {/* ── Las cinco Regular ───────────────────────────────────────────
            Cinco columnas exactas en desktop (una por color, sin sobras) y
            tira deslizable en mobile. */}
        {productos.length > 0 && (
          <>
            <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-light md:mb-4 md:mt-10">
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
