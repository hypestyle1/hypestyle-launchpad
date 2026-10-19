'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { useLocale } from '@/context/LocaleContext';
import { useProducts } from '@/hooks/useProducts';
import { LOOKS, lookFoto } from '@/data/looks';

/**
 * Shop the look en la ficha: la foto del look al que pertenece la prenda y el
 * resto de lo que lleva puesto el modelo, con precio y link vivos
 * (referencia: coldcultureworldwide.com, 19/10/2026).
 *
 * Usa los mismos datos que la sección del home (data/looks.ts): no hay que
 * cargar nada nuevo. Si la prenda no está en ningún look, o el look no tiene
 * otra prenda publicada, la sección no se dibuja.
 */
export default function ShopTheLookProducto({ slug }: { slug: string }) {
  const { t } = useLocale();
  const { data: catalogo = [] } = useProducts(0);

  // Si aparece en varios looks (el y ella), gana el que tiene más prendas.
  const look = useMemo(
    () => [...LOOKS.filter((l) => l.items.some((i) => i.slug === slug))]
      .sort((a, b) => b.items.length - a.items.length)[0] ?? null,
    [slug],
  );

  const otras = useMemo(() => {
    if (!look) return [];
    const bySlug = new Map(catalogo.map((p) => [p.slug, p]));
    return look.items
      .filter((i) => i.slug !== slug)
      .map((i) => bySlug.get(i.slug))
      .filter((p): p is NonNullable<typeof p> => !!p);
  }, [look, slug, catalogo]);

  if (!look || otras.length === 0) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 pb-16">
      <h2 className="text-lg font-bold uppercase tracking-tight mb-6">{t('Shop the look')}</h2>
      <div className="grid gap-5 md:gap-8 md:grid-cols-[minmax(0,300px)_1fr] items-start">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-bg-alt">
          <Image src={lookFoto(look, 'frente')} alt={look.etiqueta} fill
            sizes="(max-width: 768px) 100vw, 300px" className="object-contain object-bottom" />
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground mb-4">{t('Lo que lleva puesto')}</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-2 md:gap-x-3 gap-y-6">
            {otras.map((p) => (
              <ProductCard key={p.slug} id={p.slug} name={p.name} category={p.category} price={p.price}
                originalPrice={p.originalPrice} badge={p.badge} image={p.image} images={p.images}
                sizes={p.sizes} stock={p.stock} href={p.href} tags={p.tags} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
