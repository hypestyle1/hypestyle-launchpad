'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CatalogHeader from "@/components/collection/CatalogHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import type { NormalizedProduct } from "@/lib/products-normalize";

/** `initialProducts`: traídos en el servidor (lib/catalog.ts) para el HTML inicial. */
export default function NovedadesPage({ initialProducts }: { initialProducts?: NormalizedProduct[] }) {
  // /api/products ordena por fecha ASCENDENTE: useProducts(8) traía los 8
  // productos MÁS VIEJOS del catálogo con badge "New" (bug, auditoría 12/10).
  // Se trae el catálogo completo y se muestran los 8 más nuevos.
  const { data: allProducts = [] } = useProducts(0, undefined, undefined, initialProducts);
  const products = allProducts.slice(-8).reverse();
  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <CatalogHeader kicker="Shop" title="Novedades" count={products.length} description="Lo último que entró al catálogo." />
        <section className="px-4 md:px-6 pt-3 pb-10 md:pb-14" ref={ref}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9">
            {products.map((p, i) => (
              <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                <ProductCard
                  id={p.slug}
                  tags={p.tags}
                  name={p.name}
                  category={p.category}
                  price={p.price}
                  originalPrice={p.originalPrice}
                  badge={p.badge ?? "New"}
                  image={p.image}
                  images={p.images}
                  sizes={p.sizes}
                  stock={p.stock}
                  href={p.href}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
