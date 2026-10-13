'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import CollectionIndex from '@/components/collection/CollectionIndex';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';

/**
 * FW26 — estante editorial condensado (aprobado 12/10): la colección anterior
 * no desaparece del home, queda como UN estante corto debajo de Esenciales,
 * con foto de campaña real y una curaduría fija de 8 productos. Su encabezado
 * sticky entra con el handoff natural al terminar el de Esenciales.
 *
 * Reglas: precios mudos, sin tachados ni badges rojos (liquidación ≠
 * lanzamiento), fotos de campaña/estudio — nunca mockups sobre blanco.
 *
 * Curaduría por ventas 90d + stock del 12/10 (ver _rediseno-2026-10-12/04):
 * H-STARS (14% del revenue), LAMB OF GOD (top 2 en unidades), Only God Blanca
 * y las Napoli. Afuera: Hoodie Pink (solo XL) y todo lo que está en stock 0.
 */

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/';

// La foto con más tracción de la campaña (la misma que abre el carrusel de
// Conjuntos en el bloque actual).
const EDITORIAL_SRC = WP + '2026/08/nicki-nicole-hoodie-grey-hstars-01-scaled.jpg';

// 16 curados (+ la editorial = 5 filas completas de 4). Prioridad: lo que más
// vende y más stock tiene (pedido 12/10). Stock Woo al 12/10 entre paréntesis.
// Los polos entraron el 12/10 con el restock cargado (5 por talle, pedido del
// dueño). La Lettering longsleeve se fue al grupo Lettering de Best sellers
// para no repetirse en el mismo scroll.
const CURADOS = [
  'hoodie-grey-hstars',            // 19u · conjuntos = 41% del revenue
  'sweatpant-grey-hstars',         // 19u
  'hoodie-black-hstars',           // 7u
  'sweatpant-black-hstars',        // 26u
  'half-zip-polo-navy',            // 20u · abrigo y polos = 17% del revenue
  'half-zip-polo-melange',         // 20u
  'half-zip-polo-black',           // 20u
  'sweatpant-pink',                // 21u
  'lamb-of-god-pink-tee',          // 29u · top 2 en unidades 90d
  'only-god-can-judge-me-blanca',  // 34u
  'faith-over-everything-camo-hoodie', // 22u · familia Faith 16%
  'lion-of-judah-stone-wash-hoodie',   // 14u
  'ladytribal-black-longsleeve',   // 26u · pre-venta
  // El dueño prefiere mostrar el GREY (12/10). Ojo con los números de Woo:
  // grey figura con 11u y el melange (slug hs-co-green-hoodie) con 14u — si el
  // físico dice otra cosa, cargar el conteo real.
  'hs-co-grey-hoodie',             // 11u
  'napoli-tee-azul',               // 102u
  'napoli-tee-blanca',             // 33u
];

const GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9 [grid-auto-flow:row_dense]';

export default function Fw26Shelf() {
  const { data: allProducts = [] } = useProducts(0);

  const items = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return CURADOS.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
  }, [allProducts]);

  if (items.length === 0) return null;

  return (
    <section id="new-in-fw26" className="px-4 md:px-6 pt-8 md:pt-10 pb-6 scroll-mt-[var(--offset)]">
      <CollectionIndex
        title="Fall Winter 26"
        shortTitle="FW26"
        prefix="fw26-"
        cta={{ href: '/colecciones/fw26/', label: 'Ver FW26' }}
      />
      <div className={GRID}>
        <Link
          href="/colecciones/fw26/"
          className="group relative col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full overflow-hidden rounded-[4px] bg-bg-alt block"
        >
          <Image
            src={EDITORIAL_SRC}
            alt="Campaña FW26 — conjuntos HStars"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={70}
            className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="pointer-events-none absolute left-4 bottom-4 md:left-5 md:bottom-5 text-white">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 mb-1">Campaña FW26</p>
            <p className="text-[17px] md:text-[20px] font-semibold leading-tight">H-Stars y Fe</p>
          </div>
        </Link>
        {items.map((p) => (
          <ProductCard
            key={p.slug}
            id={p.slug}
            name={p.name}
            category={p.category}
            price={p.price}
            originalPrice={p.originalPrice}
            image={p.images[0]}
            images={p.images}
            sizes={p.sizes}
            stock={p.stock}
            href={`/producto/${p.slug}/`}
            mutedPrice
          />
        ))}
      </div>
    </section>
  );
}
