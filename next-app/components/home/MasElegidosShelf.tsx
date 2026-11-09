'use client';

import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import HomeSectionHeader from './HomeSectionHeader';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { MAS_ELEGIDOS_SLUGS } from '@/lib/home-curaduria';

/**
 * Lo más elegido — lo que más factura, arriba en la home (curaduría y números
 * en lib/home-curaduria). Si un producto se agota, la card desaparece sola: la
 * sección es para vender, no para avisar un restock.
 */

const sinStock = (p: NormalizedProduct) => {
  const valores = Object.values(p.stock ?? {});
  return valores.length > 0 && valores.every((s) => s === 'out');
};

export default function MasElegidosShelf() {
  const { data: allProducts = [] } = useProducts(0);

  const items = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    const lista = MAS_ELEGIDOS_SLUGS.map((s) => bySlug.get(s)).filter(
      (p): p is NormalizedProduct => !!p && !sinStock(p),
    );
    // Filas completas: 2 columnas en mobile, 4 en desktop.
    return lista.slice(0, lista.length - (lista.length % 4 === 0 ? 0 : lista.length % 2));
  }, [allProducts]);

  if (items.length === 0) return null;

  return (
    <section id="mas-elegidos" className="px-4 pb-6 pt-10 md:px-6 md:pb-10 md:pt-14 scroll-mt-[var(--offset)]">
      <HomeSectionHeader
        eyebrow="Best sellers"
        title="Lo más elegido"
        sub="Lo que más se llevaron en los últimos meses."
        cta={{ href: '/productos', label: 'Ver todo' }}
      />
      <div className="grid grid-cols-2 gap-x-2 gap-y-7 md:gap-x-3 lg:grid-cols-4 lg:gap-y-9">
        {items.map((p, i) => (
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
            href={`/producto/${p.slug}`}
            mutedPrice
            imagePriority={i < 2 ? 'eager' : undefined}
          />
        ))}
      </div>
    </section>
  );
}
