'use client';

import ProductCard from '@/components/ProductCard';
import { useLocale } from '@/context/LocaleContext';
import { useDragScroll } from '@/hooks/useDragScroll';
import type { NormalizedProduct } from '@/hooks/useProducts';

/**
 * Una fila de productos que se arrastra, abajo de la ficha
 * (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Reemplaza a la grilla de 2x4: en el celular esa grilla eran cuatro filas de
 * scroll antes de llegar al pie. Así entran diez productos en una sola fila y
 * se pasan con el dedo.
 */
interface Props {
  titulo: string;
  productos: NormalizedProduct[];
  /** Para no dibujar un título con la fila vacía. */
  className?: string;
}

export default function TiraProductos({ titulo, productos, className = '' }: Props) {
  const { t } = useLocale();
  const ref = useDragScroll([productos.length]);

  if (productos.length === 0) return null;

  return (
    <section className={`max-w-[1400px] mx-auto px-4 ${className}`}>
      <h2 className="text-lg font-bold uppercase tracking-tight mb-5">{t(titulo)}</h2>
      <div ref={ref}
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x cursor-grab select-none">
        {productos.map((p) => (
          <div key={p.slug} className="snap-start shrink-0 w-[44%] sm:w-[30%] lg:w-[19%]">
            <ProductCard id={p.slug} name={p.name} category={p.category} price={p.price}
              originalPrice={p.originalPrice} badge={p.badge} image={p.image} images={p.images}
              sizes={p.sizes} stock={p.stock} href={p.href} tags={p.tags} />
          </div>
        ))}
      </div>
    </section>
  );
}
