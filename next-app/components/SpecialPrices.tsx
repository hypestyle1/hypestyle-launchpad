'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

export default function SpecialPrices() {
  // Antes filtraba por el tag 'special-price', que quedo desincronizado (habia
  // productos taggeados a precio lleno y rebajados sin tag). El criterio ahora
  // es el descuento real, igual que la pagina SALE.
  const { data: todos = [] } = useProducts(0);
  const allProducts = useMemo(
    () => todos
      .filter(p => !!p.originalPrice && p.originalPrice! > p.price)
      .filter(p => Object.values(p.stock).some(s => s !== 'out'))
      .slice(0, 8),
    [todos]
  );
  const products = useMemo(() =>
    allProducts.map(p => ({
      ...p,
      badge: p.originalPrice && p.originalPrice > p.price
        ? `−${Math.round((1 - p.price / p.originalPrice!) * 100)}%`
        : undefined,
    })),
    [allProducts]
  );

  const ref = useReveal([products]);

  return (
    <section id="special-prices" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="COLD ARCHIVE" link="/special-prices/" linkLabel="Ver todo el sale" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.slug} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
