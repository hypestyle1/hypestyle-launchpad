'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { useLocale } from '@/context/LocaleContext';
import { useProducts } from '@/hooks/useProducts';
import { useDragScroll } from '@/hooks/useDragScroll';
import { leerVistos } from '@/lib/vistos-recientemente';

/**
 * Tira de lo último que miró la persona, abajo de la ficha. Quien entra desde
 * un anuncio, mira tres prendas y quiere volver a la segunda, hoy no tiene
 * cómo: esto es ese camino.
 *
 * Los slugs salen de localStorage y los datos del catálogo ya cargado, así que
 * no agrega ni un pedido a la red.
 */
export default function VistosRecientemente({ slugActual }: { slugActual: string }) {
  const { t } = useLocale();
  const [slugs, setSlugs] = useState<string[]>([]);
  const { data: catalogo = [] } = useProducts(0);

  // En un efecto y no en el primer render: en el servidor no hay localStorage
  // y el HTML tiene que ser el mismo de los dos lados.
  useEffect(() => {
    setSlugs(leerVistos().filter((s) => s !== slugActual));
  }, [slugActual]);

  const productos = useMemo(() => {
    const bySlug = new Map(catalogo.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [slugs, catalogo]);

  const ref = useDragScroll([productos.length]);

  if (productos.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 pb-20">
      <h2 className="text-lg font-bold uppercase tracking-tight mb-6">{t('Vistos recientemente')}</h2>
      <div ref={ref} className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
        {productos.map((p) => (
          <div key={p.slug} className="snap-start shrink-0 w-[44%] sm:w-[30%] lg:w-[22%]">
            <ProductCard id={p.slug} name={p.name} category={p.category} price={p.price}
              originalPrice={p.originalPrice} badge={p.badge} image={p.image} images={p.images}
              sizes={p.sizes} stock={p.stock} href={p.href} tags={p.tags} />
          </div>
        ))}
      </div>
    </section>
  );
}
