'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CatalogHeader from "@/components/collection/CatalogHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import type { NormalizedProduct } from "@/lib/products-normalize";

const GRID_AIRE = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9';
const enStock = (p: NormalizedProduct) => Object.values(p.stock).some((s) => s !== 'out');

/** `initialProducts`: traídos en el servidor (lib/catalog.ts) para el HTML inicial. */
export default function BackInStockPage({ initialProducts }: { initialProducts?: NormalizedProduct[] }) {
  const { data: raw = [], isLoading } = useProducts(100, undefined, 'best-seller', initialProducts);
  // Agotados al fondo: la lista por tag los trae mezclados.
  const products = [...raw.filter(enStock), ...raw.filter((p) => !enStock(p))];
  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <section className="px-4 md:px-6 pt-2 pb-10 md:pb-14" ref={ref}>
          {/* La página siempre fue "Best Sellers" con URL /back-in-stock: el
              título y la identidad ahora dicen lo mismo. */}
          <CatalogHeader kicker="Shop" title="Best sellers" count={products.length}
            description="Los gráficos que más salen, siempre que haya stock." />
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className={GRID_AIRE}>
              {products.map((p) => <ProductCard key={p.slug} {...p} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
