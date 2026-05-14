import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SpecialPricesHero from "./SpecialPricesHero";
import { fetchAllProducts } from "@/lib/products-server";

export const revalidate = false;

export default async function SpecialPricesPage() {
  const allProducts = await fetchAllProducts();
  const products = allProducts.filter(p => p.badge && p.originalPrice);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <SpecialPricesHero />

        <section className="max-w-[1400px] mx-auto px-4 py-8 md:py-12">
          <p className="text-[11px] text-muted-foreground mb-6">{products.length} productos en oferta</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {products.map((p) => (
              <ProductCard
                key={p.slug}
                id={p.slug}
                name={p.name}
                category={p.category}
                price={p.price}
                originalPrice={p.originalPrice}
                badge={p.badge}
                image={p.image}
                images={p.images}
                sizes={p.sizes}
                stock={p.stock}
                href={p.href}
              />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-20">No hay productos en oferta en este momento.</p>
          )}
        </section>

      </main>
      <Footer />
    </>
  );
}
