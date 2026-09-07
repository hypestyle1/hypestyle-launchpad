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
      // Solo se cae lo agotado. El filtro por descuento se saco al cerrar el
      // Cold Archive (06/09/26): este bloque volvio a ser BEST SELLERS y ahi el
      // criterio es que se venda, no que este rebajado. Con el sale cerrado ese
      // filtro dejaba la seccion practicamente vacia — de los 40 curados solo
      // sobrevivia el 3-PACK, que es lo unico que sigue en oferta.
      .filter(p => Object.values(p!.stock).some(s => s !== 'out')) as typeof allProducts;
    // El filtro por stock deja un largo impredecible (la lista curada es
    // multiplo de 4, la filtrada no): se recorta a filas completas para que la
    // seccion no termine con celdas vacias al lado del ultimo.
    return filasCompletas(vigentes);
  }, [allProducts]);

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="BEST SELLERS" link="/productos/" linkLabel="Ver todo" />
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
