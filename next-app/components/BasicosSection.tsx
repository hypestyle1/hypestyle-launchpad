'use client';

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import EditorialSlider from "./EditorialSlider";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { fetchGraphQL } from "@/lib/graphql-client";
import { imgSrc } from "@/lib/img";
import { REGULAR_TEES_SLUGS, BASICOS_HOME_FEATURED_SLUG } from "@/lib/regular-tees";

// Pack surtido primero, después el resto en el orden de siempre.
const HOME_ORDER = [
  BASICOS_HOME_FEATURED_SLUG,
  ...REGULAR_TEES_SLUGS.filter(s => s !== BASICOS_HOME_FEATURED_SLUG),
];

// Individuales que le prestan sus fotos a los 3 carruseles de relleno de la
// primera fila (mismo tamaño que una card, junto al pack destacado). El feed
// general (useProducts) solo trae 1 foto por producto — acá se pide la
// galería completa de cada uno, igual que hace la ficha de producto.
const CAROUSEL_SOURCE_SLUGS = ['regular-tee-black', 'regular-tee-white', 'regular-tee-navy'];

function useCarouselImages(slugs: string[]) {
  return useQuery<string[][]>({
    queryKey: ['basicos-carousel-images', slugs],
    queryFn: async () => {
      const query = `query BasicosCarouselImages {\n` +
        slugs.map((slug, i) =>
          `s${i}: product(id: "${slug}", idType: SLUG) {
            ... on SimpleProduct { image { sourceUrl } galleryImages { nodes { sourceUrl } } }
            ... on VariableProduct { image { sourceUrl } galleryImages { nodes { sourceUrl } } }
          }`
        ).join('\n') + `\n}`;
      const data = await fetchGraphQL<Record<string, { image?: { sourceUrl?: string }; galleryImages?: { nodes: { sourceUrl?: string }[] } } | null>>(query);
      return slugs.map((_, i) => {
        const node = data[`s${i}`];
        const images: string[] = [];
        if (node?.image?.sourceUrl) images.push(node.image.sourceUrl);
        (node?.galleryImages?.nodes ?? []).forEach(g => {
          if (g.sourceUrl && !images.includes(g.sourceUrl)) images.push(g.sourceUrl);
        });
        return images;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function BasicosSection() {
  const { data: allProducts = [] } = useProducts(0);
  const { data: carouselImages = [] } = useCarouselImages(CAROUSEL_SOURCE_SLUGS);
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
        {carouselImages.filter(imgs => imgs.length > 0).map((imgs, i) => (
          <Link
            key={i}
            href="/colecciones/regular-tees/"
            className={`reveal rd${i + 3} relative aspect-square overflow-hidden rounded-[8px] bg-bg-alt block`}
          >
            <EditorialSlider images={imgs.map(imgSrc)} alt="Básicos — Regular Tees" />
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
