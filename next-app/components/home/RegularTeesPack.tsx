'use client';

import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import HomeSectionHeader from './HomeSectionHeader';
import HomePhotoCarousel, { type HomeSlide } from './HomePhotoCarousel';
import PackPasosAnimados from './PackPasosAnimados';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';
import { REGULAR_TEES_GROUPS } from '@/lib/regular-tees';
import { PACK_REGULAR_REF_SLUG, PACK_REGULAR_UNIDADES } from '@/lib/promo-pack-regular';

/**
 * Regular Tees — Pack x3 a tu gusto (post-Cyber, 9/11). Reemplaza a
 * Esenciales en la home: explica la promo y muestra los colores, sin la grilla
 * de packs armados (con cada colorway nuevo las combinaciones crecen; que el
 * cliente arme el suyo).
 *
 * La promo (lib/promo-pack-regular + lib/precio-servidor), verificada el 9/11:
 * - cada 3 Regular sueltas, de cualquier color y talle, se cobran al precio del
 *   3 PACK del catálogo: 3 × $28.900 = $86.700 → $66.300;
 * - se repite cada 3 (6 Regular = 2 packs);
 * - el 10% por transferencia se calcula DESPUÉS del pack (→ $59.670);
 * - solo envíos dentro de Argentina (en internacional no aplica).
 *
 * Ningún precio está escrito acá: todo sale del catálogo. Si falta un dato,
 * la línea que lo usa se omite.
 *
 * Panel "cómo funciona" (9/11, pedido de Valentín: "las dos en una"): los tres
 * pasos animados con el carrito adentro — ver PackPasosAnimados.
 *
 * Fotos: estudio SS27 con Taylor (Redes & Pauta/CONTENT SS27/ESTUDIO/REGULAR
 * TEES). En desktop el carrusel es vertical (4:5) para no recortar las fotos.
 */

const SLIDES: HomeSlide[] = [
  { src: '/home/regular/c-flatlay-trio.webp', alt: 'Regular Tees black, white y navy sobre el piso', posicion: '50% 50%' },
  { src: '/home/regular/c-black-pose.webp', alt: 'Regular Tee black puesta', posicion: '50% 25%' },
  { src: '/home/regular/c-white-cerca.webp', alt: 'Regular Tee white puesta', posicion: '50% 25%' },
  { src: '/home/regular/c-navy-pose.webp', alt: 'Regular Tee navy puesta', posicion: '50% 25%' },
  { src: '/home/regular/c-flatlay-diagonal.webp', alt: 'Regular Tees black, navy y white apiladas', posicion: '50% 50%' },
];

const EJEMPLO_SLUGS = ['regular-tee-black', 'regular-tee-white', 'regular-tee-red'];

export default function RegularTeesPack() {
  const { data: allProducts = [] } = useProducts(0);

  const { colores, precioPack, ejemplo } = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    const colores = REGULAR_TEES_GROUPS[0].slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
    const preferidos = EJEMPLO_SLUGS.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
    const ejemplo = [...preferidos, ...colores.filter((c) => !preferidos.includes(c))].slice(0, PACK_REGULAR_UNIDADES);
    return { colores, precioPack: bySlug.get(PACK_REGULAR_REF_SLUG)?.price ?? null, ejemplo };
  }, [allProducts]);

  if (colores.length === 0) return null;

  const u = PACK_REGULAR_UNIDADES;

  return (
    <section id="basicos" className="px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14 scroll-mt-[var(--offset)]">
      <HomeSectionHeader
        eyebrow="Regular Tees"
        title={`Pack x${u}, a tu gusto`}
        cta={{ href: '/colecciones/regular-tees', label: 'Ver colores' }}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <HomePhotoCarousel
          slides={SLIDES}
          href="/colecciones/regular-tees"
          chip="Regular Tees"
          className="aspect-[4/5] lg:col-span-5"
        />

        {/* Pasos + carrito en uno: PackPasosAnimados. */}
        <div className="lg:col-span-7">
          <PackPasosAnimados ejemplo={ejemplo} precioPack={precioPack} unidades={u} totalColores={colores.length} />
        </div>
      </div>

      {/* Los colores: tira deslizable en mobile, cinco columnas en desktop. */}
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:mt-8 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {colores.map((p) => (
          <li key={p.slug} className="w-[40%] shrink-0 snap-start md:w-auto">
            <ProductCard
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
              dense
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
