'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import CollectionIndex from '@/components/collection/CollectionIndex';
import { useScrollSpy } from '@/components/collection/useScrollSpy';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { REGULAR_TEES_GROUPS } from '@/lib/regular-tees';
import { filasCompletas } from '@/lib/home-grid';

/**
 * Esenciales — el programa permanente (reemplaza al bloque FW26 del home en la
 * propuesta). Mismo lenguaje que el feed SS27: índice sticky propio (el
 * handoff con SS27 y FW26 es el comportamiento nativo de sticky), grilla con
 * aire, pieza editorial con foto real dentro de la grilla, precios mudos y
 * cero badges — es programa, no liquidación.
 *
 * Curaduría 12/10 (ver _rediseno-2026-10-12/04): Regular Tees individuales +
 * packs. Gorras y medias entran acá cuando vuelvan a tener stock.
 */

// Foto real de estudio del programa (la misma galería que usan las fichas).
// regular-1 es la toma con modelo; regular-2 (producto solo) quedaba lavada
// contra el fondo blanco de la grilla.
const EDITORIAL_SRC =
  'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-1-ed46655595ec84c28e17644450925696-1024-1024.jpg';

const GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9 [grid-auto-flow:row_dense]';

const NAV = [
  { id: 'remeras', label: 'Remeras' },
  { id: 'packs', label: 'Packs' },
];

export default function EsencialesShelf() {
  const { data: allProducts = [] } = useProducts(0);
  const { active, onAnchorClick } = useScrollSpy(NAV.map((n) => n.id), 'esen-');

  const { individuales, packs } = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    const pick = (slugs: string[]) => slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
    return {
      individuales: pick(REGULAR_TEES_GROUPS[0].slugs),
      packs: filasCompletas(pick(REGULAR_TEES_GROUPS[1].slugs)),
    };
  }, [allProducts]);

  if (individuales.length === 0 && packs.length === 0) return null;

  const card = (p: NormalizedProduct) => (
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
  );

  return (
    <section id="basicos" className="px-4 md:px-6 pt-8 md:pt-10 pb-6 scroll-mt-[var(--offset)]">
      <CollectionIndex
        title="Esenciales"
        items={NAV}
        active={active}
        prefix="esen-"
        cta={{ href: '/colecciones/regular-tees/', label: 'Ver todo' }}
        onSelect={onAnchorClick}
      />

      {/* ── Remeras: la editorial con foto real + los 4 colores ── */}
      <div id="esen-remeras" className="scroll-mt-[calc(var(--offset)+120px)] mb-12 md:mb-16">
        <ShelfTitle label="Remeras" count={individuales.length} />
        <div className={GRID}>
          <Link
            href="/colecciones/regular-tees/"
            className="group relative col-span-2 row-span-1 lg:row-span-2 aspect-[4/5] lg:aspect-auto lg:min-h-full overflow-hidden rounded-[4px] bg-bg-alt block"
          >
            <Image
              src={EDITORIAL_SRC}
              alt="Regular Tees — programa permanente"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={70}
              className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="pointer-events-none absolute left-4 bottom-4 md:left-5 md:bottom-5 text-white">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 mb-1">Regular Tees</p>
              <p className="text-[17px] md:text-[20px] font-semibold leading-tight">La base de todo</p>
            </div>
          </Link>
          {individuales.map(card)}
        </div>
      </div>

      {/* ── Packs: surtidos primero (mayor ticket), después los mono ── */}
      {packs.length > 0 && (
        <div id="esen-packs" className="scroll-mt-[calc(var(--offset)+120px)]">
          <ShelfTitle label="3-Packs" count={packs.length} />
          <div className={GRID}>{packs.map(card)}</div>
        </div>
      )}
    </section>
  );
}

function ShelfTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-4 md:mb-5">
      <h3 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{label}</h3>
      <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}
