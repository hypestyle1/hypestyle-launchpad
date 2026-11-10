'use client';

import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import HomeSectionHeader from './HomeSectionHeader';
import HomePhotoCarousel, { type HomeSlide } from './HomePhotoCarousel';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { CAMO_TAG } from '@/lib/home-curaduria';

/**
 * New In — Camo Sets (post-Cyber, 9/11).
 *
 * Productos: NADA escrito a mano. Salen del catálogo por el tag de Woo
 * `camo-set-drop`, con stock, en el orden zip hoodie → jort, olive → brown.
 * Si mañana se carga otra prenda camo con ese tag y stock, aparece sola.
 * Se muestran hasta 4 (2×2 al lado del carrusel en desktop).
 *
 * Fotos: reales, ninguna IA. Arranca con el flatlay del conjunto olive (pedido
 * de Valentín) y sigue con una selección variada — look completo olive, look
 * completo brown, primer plano y detalle del jort. Originales en
 * Redes & Pauta/CAMO OLIVE - FLATLAYS 2026-11-08 y CAMI AGRAZ/fotos-jpg,
 * exportadas a 1600×2000 en public/home/camo.
 */

const COLECCION_HREF = '/colecciones/camo-drop';

const SLIDES: HomeSlide[] = [
  { src: '/home/camo/01-flatlay-olive.webp', alt: 'Conjunto Camo Olive — zip hoodie y jort sobre asfalto', posicion: '50% 45%' },
  { src: '/home/camo/02-look-olive-pasaje.webp', alt: 'Conjunto Camo Olive puesto, en un pasaje', posicion: '50% 35%' },
  { src: '/home/camo/03-look-brown-puerta.webp', alt: 'Conjunto Camo Brown puesto, frente a una puerta verde', posicion: '50% 35%' },
  { src: '/home/camo/04-capucha-olive.webp', alt: 'Zip Hoodie Camo Olive con capucha', posicion: '50% 30%' },
  { src: '/home/camo/05-jort-brown-detalle.webp', alt: 'Jort Camo Brown, detalle del estampado HYP3', posicion: '50% 50%' },
];

const tieneStock = (p: NormalizedProduct) => Object.values(p.stock ?? {}).some((s) => s !== 'out');
const orden = (p: NormalizedProduct) =>
  (/zip|hoodie/i.test(p.name) ? 0 : /jort/i.test(p.name) ? 10 : 20) + (/olive/i.test(p.name) ? 0 : 1);

export default function CamoColeccionHome() {
  const { data: allProducts = [] } = useProducts(0);

  const items = useMemo(
    () =>
      allProducts
        .filter((p) => p.tags.includes(CAMO_TAG) && tieneStock(p))
        .sort((a, b) => orden(a) - orden(b))
        .slice(0, 4),
    [allProducts],
  );

  return (
    <section id="camo" className="px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14 scroll-mt-[var(--offset)]">
      <HomeSectionHeader
        eyebrow="New In"
        title="Camo Sets"
        sub="Olive & Brown. Zip hoodie y jort."
        cta={{ href: COLECCION_HREF, label: 'Ver colección' }}
      />

      <div className="grid grid-cols-2 gap-x-2 gap-y-7 md:gap-x-3 lg:grid-cols-4 lg:gap-y-9 [grid-auto-flow:row_dense]">
        <HomePhotoCarousel
          slides={SLIDES}
          href={COLECCION_HREF}
          chip="Camo Sets"
          className="col-span-2 aspect-[4/5] lg:row-span-2 lg:aspect-auto lg:min-h-full"
        />
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
            href={`/producto/${p.slug}`}
            badge="New In"
            mutedPrice
          />
        ))}
      </div>
    </section>
  );
}
