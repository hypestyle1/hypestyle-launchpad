'use client';

import ProductCard from '@/components/ProductCard';
import { useLocale } from '@/context/LocaleContext';
import { useDragScroll } from '@/hooks/useDragScroll';
import type { NormalizedProduct } from '@/hooks/useProducts';

/**
 * Los productos de abajo de la ficha: recomendados y vistos recientemente
 * (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * En el celular es una fila que se pasa con el dedo — ahí el gesto es natural
 * y la grilla de 2x4 eran cuatro pantallas de scroll. En desktop, en cambio,
 * arrastrar de costado no se entiende y no se ve bien, así que se dibuja como
 * grilla de cinco y entra todo de una.
 */
interface Props {
  titulo: string;
  productos: NormalizedProduct[];
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
        className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x cursor-grab select-none
                   lg:grid lg:grid-cols-5 lg:gap-x-3 lg:gap-y-8 lg:overflow-visible lg:cursor-auto">
        {productos.map((p) => (
          <div key={p.slug} className="snap-start shrink-0 w-[44%] sm:w-[30%] lg:w-auto">
            <ProductCard id={p.slug} name={p.name} category={p.category} price={p.price}
              originalPrice={p.originalPrice} badge={p.badge} image={p.image} images={p.images}
              sizes={p.sizes} stock={p.stock} href={p.href} tags={p.tags} />
          </div>
        ))}
      </div>
    </section>
  );
}
