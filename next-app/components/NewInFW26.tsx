'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import { FW26_GROUPS } from "@/lib/fw26";

export default function NewInFW26() {
  const { data: allProducts = [] } = useProducts(0);
  const ref = useReveal([allProducts]);

  const bySlug = useMemo(() => new Map(allProducts.map(p => [p.slug, p])), [allProducts]);

  // Grupos con al menos un producto disponible
  const groups = useMemo(
    () => FW26_GROUPS
      .map(g => ({ label: g.label, items: g.slugs.map(s => bySlug.get(s)).filter(Boolean) as typeof allProducts }))
      .filter(g => g.items.length > 0),
    [bySlug],
  );

  if (groups.length === 0) return null;

  return (
    <section id="new-in-fw26" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In [FW26]" link="/colecciones/fw26/" linkLabel="Ver más" />
      </div>

      {groups.map((group, gi) => (
        <div key={group.label} className={`reveal rd${Math.min(gi + 2, 8)} ${gi > 0 ? 'mt-10' : ''}`}>
          {/* Subtítulo del drop */}
          <div className="flex items-center gap-4 mb-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{group.label}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {group.items.map(p => (
              // Productos nuevos: sin descuento ni precio tachado (precio limpio)
              <ProductCard key={p.slug} {...p} originalPrice={undefined} badge={undefined} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
