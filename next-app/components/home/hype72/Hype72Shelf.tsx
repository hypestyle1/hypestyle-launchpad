'use client';

import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import SectionHeader from '@/components/SectionHeader';
import { useProducts } from '@/hooks/useProducts';
import { HOME_GRID, filasCompletas } from '@/lib/home-grid';
import { hype72Bloques } from '@/lib/hype72-home-seleccion';

/**
 * El estante de producto del takeover. UN componente para los seis bloques
 * comerciales (packs, archivo, sleeveless, hoodies/tees, populares,
 * próximamente): cambia la prop, no el componente.
 *
 * NO HAY DISEÑO NUEVO ACÁ. Es exactamente el patrón de las secciones de
 * producto de la home (`BackInStock`, `BasicosSection`, `MasHypeSection`):
 * `SectionHeader` + `HOME_GRID` + `ProductCard` + `filasCompletas`, con el
 * mismo `useProducts(0)` que ya comparten todas (misma query de React Query,
 * ya precargada en el servidor por `app/page.tsx`: ni un fetch extra).
 *
 * PRECIOS: los pone `ProductCard` desde el catálogo de Woo, como en todo el
 * sitio. Acá no se escribe ni se calcula ninguna cifra. `mutedPrice` va a
 * propósito: el precio final en negro, sin el rojo de oferta y sin porcentaje
 * (ver el bloque de precios de `lib/hype72-home.ts`).
 */

export type Hype72BloqueId = 'packs' | 'archivo' | 'sleeveless' | 'hoodiesTees' | 'populares' | 'proximamente';

interface Props {
  /** Ancla de la sección (`hype72-packs`, …). El CTA de la banda apunta acá. */
  id: string;
  titulo: string;
  /** Cuál de los bloques de `hype72Bloques` se muestra. */
  bloque: Hype72BloqueId;
  /** "Ver todo" opcional. Solo rutas que existen hoy en `main`. */
  link?: string;
  linkLabel?: string;
  /** Techo de cards. Sin esto, "archivo" solo puede traer 60 productos. */
  max?: number;
  /** Bajada corta. Sin cifras. */
  nota?: string;
  /**
   * Vidriera: sin "agregar rápido". No hace falta pasarlo para
   * `proximamente` — ProductCard ya lo deduce del tag de Woo.
   */
  vidriera?: boolean;
}

export default function Hype72Shelf({ id, titulo, bloque, link, linkLabel, max = 16, nota, vidriera }: Props) {
  const { data: catalogo = [] } = useProducts(0);

  const products = useMemo(() => {
    // Los seis bloques se resuelven juntos porque cada uno excluye lo que ya
    // mostraron los anteriores (si no, la misma card salía tres veces en el
    // mismo scroll). Es una pasada sobre ~142 productos, memoizada: que los
    // seis estantes la repitan no se mide.
    const items = hype72Bloques(catalogo)[bloque];
    // Filas completas y después el techo, también a múltiplo de la grilla: la
    // grilla es de 2 y 4 columnas, así que cortar en cualquier número deja
    // huecos en algún ancho.
    return filasCompletas(items).slice(0, Math.floor(max / 4) * 4 || max);
  }, [catalogo, bloque, max]);

  // Sin productos la sección no existe: un título con la grilla vacía es peor
  // que no mostrar nada. Es lo que hace hoy cada estante de la home.
  if (products.length === 0) return null;

  return (
    <section id={id} className="max-w-[1400px] mx-auto px-4 py-8 md:py-12 scroll-mt-[var(--offset)]">
      <SectionHeader title={titulo} link={link} linkLabel={linkLabel}>
        {nota && (
          <span className="text-[11px] md:text-[12px] text-muted-foreground">{nota}</span>
        )}
      </SectionHeader>
      <div className={HOME_GRID}>
        {products.map((p) => (
          <ProductCard
            key={p.slug}
            {...p}
            href={`/producto/${p.slug}`}
            // ── LAS TRES COSAS QUE EL EVENTO NO MUESTRA ──────────────────────
            // `badge` del catálogo es SIEMPRE el porcentaje de descuento
            // (lib/products-normalize: `−35%`, pintado con bg-sale, el rojo de
            // liquidación). `originalPrice` es el precio de lista tachado.
            //
            // Los dos se apagan acá porque el precio de lista de 89 de los 145
            // productos es un `sale_price` permanente sin fecha de fin: no es
            // un precio que se haya transado, así que el % contra él y el
            // tachado son un precio de referencia manipulado. El evento
            // comunica por PRECIO FINAL y por el regalo.
            //
            // Fuera del takeover el catálogo sigue mostrando badge y tachado
            // como siempre: esto es local a estos estantes.
            badge={undefined}
            originalPrice={undefined}
            // Y el precio final en negro, no en el rojo de oferta.
            mutedPrice
            disableLink={vidriera}
          />
        ))}
      </div>
    </section>
  );
}
