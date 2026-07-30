'use client';

import { useMemo } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import EditorialSlider from "./EditorialSlider";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { imgSrc } from "@/lib/img";
import { REGULAR_TEES_SLUGS, BASICOS_HOME_FEATURED_SLUG, BASICOS_HOME_CAROUSELS } from "@/lib/regular-tees";

// Pack surtido primero, después el resto en el orden de siempre.
const HOME_ORDER = [
  BASICOS_HOME_FEATURED_SLUG,
  ...REGULAR_TEES_SLUGS.filter(s => s !== BASICOS_HOME_FEATURED_SLUG),
];

export default function BasicosSection() {
  const { data: allProducts = [] } = useProducts(100);
  const ref = useReveal([allProducts]);

  const { featured, rest } = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    const ordered = HOME_ORDER.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts;
    return { featured: ordered[0], rest: ordered.slice(1) };
  }, [allProducts]);

  if (!featured) return null;

  return (
    <section id="basicos" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Básicos" link="/colecciones/regular-tees/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {/* Primera fila: el pack destacado + 3 carruseles de fotos (mismo tamaño de card) */}
        <div key={featured.slug} className="reveal rd2">
          <ProductCard
            id={featured.slug}
            name={featured.name}
            category={featured.category}
            price={featured.price}
            originalPrice={featured.originalPrice}
            badge={featured.originalPrice ? `−${Math.round((1 - featured.price / featured.originalPrice) * 100)}%` : undefined}
            image={featured.images[0]}
            images={featured.images}
            sizes={featured.sizes}
            stock={featured.stock}
            href={`/producto/${featured.slug}/`}
          />
        </div>
        {BASICOS_HOME_CAROUSELS.map((c) => (
          <Link
            key={c.slug}
            href={`/producto/${c.slug}/`}
            className="reveal rd3 relative aspect-square overflow-hidden rounded-[8px] bg-bg-alt block"
          >
            <EditorialSlider images={c.images.map(imgSrc)} alt="Básicos — Regular Tees" />
          </Link>
        ))}

        {/* Resto de los productos, en la grilla normal */}
        {rest.map((p, i) => (
          <div key={p.slug} className={`reveal rd${Math.min(i + 5, 8)}`}>
            <ProductCard
              id={p.slug}
              name={p.name}
              category={p.category}
              price={p.price}
              originalPrice={p.originalPrice}
              badge={p.originalPrice ? `−${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined}
              image={p.images[0]}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={`/producto/${p.slug}/`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
