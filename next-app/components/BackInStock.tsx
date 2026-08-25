'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { BEST_SELLERS_SLUGS } from "@/lib/best-sellers";
import { HOME_GRID, filasCompletas } from "@/lib/home-grid";

export default function BackInStock() {
  const { data: allProducts = [] } = useProducts(0);
  const ref = useReveal([allProducts]);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    const vigentes = BEST_SELLERS_SLUGS
      .map(s => bySlug.get(s))
      .filter(Boolean)
      // Fuera los agotados y los que se quedaron sin descuento: este bloque
      // dice SALE, asi que todo lo que muestra tiene que estar en sale.
      .filter(p => !!p!.originalPrice && p!.originalPrice > p!.price)
      .filter(p => Object.values(p!.stock).some(s => s !== 'out')) as typeof allProducts;
    // El filtro por stock y descuento deja un largo impredecible (la lista
    // curada es multiplo de 4, la filtrada no): se recorta a filas completas
    // para que la seccion no termine con celdas vacias al lado del ultimo.
    return filasCompletas(vigentes);
  }, [allProducts]);

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="SALE" link="/special-prices/" linkLabel="Ver todo el sale" />
      </div>
      <div className={HOME_GRID}>
        {products.map((p, i) => (
          <div key={p.slug} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
