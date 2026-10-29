'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { CYBER_PRODUCTOS_EVENTO } from '@/lib/cyber-cartelera';

/**
 * "Disponible ahora" — el catálogo real dentro de la página del evento.
 *
 * Las cards son las MISMAS del sitio (ProductCard + useProducts): precio y
 * stock salen de Woo en vivo, acá no se escribe ningún monto ni se inventa
 * ninguna oferta. La curaduría de qué se muestra vive en
 * lib/cyber-cartelera.ts (CYBER_PRODUCTOS_EVENTO), un solo lugar.
 *
 * La banda es CLARA a propósito: las cards del sitio están diseñadas sobre
 * fondo crema y acá no se les cambia nada — la página del evento alterna
 * bandas oscuras (identidad) y claras (producto), como la home del preview
 * del 27/10 que Valentín vio.
 */
export default function CyberEventoProductos() {
  const { data } = useProducts();

  const productos = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    return CYBER_PRODUCTOS_EVENTO.map((s) => bySlug.get(s)).filter(
      Boolean,
    ) as NormalizedProduct[];
  }, [data]);

  if (productos.length === 0) return null;

  return (
    <section className="bg-background px-4 py-12 text-foreground sm:px-6 md:py-16">
      <div className="mx-auto max-w-[1120px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em]">
            Disponible ahora
          </h2>
          <p className="text-[12px] text-text-light">
            Sumá 4 Regular al carrito y pagás 3: el precio se ajusta solo.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4">
          {productos.map((p) => (
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
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/colecciones/regular-tees"
            className="flex h-[54px] flex-1 items-center justify-center bg-foreground px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-85"
          >
            Armá tu 4 PACK
          </Link>
          <Link
            href="/productos"
            className="flex h-[54px] flex-1 items-center justify-center border border-foreground/25 px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
