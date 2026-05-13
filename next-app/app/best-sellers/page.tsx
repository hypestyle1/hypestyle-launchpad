import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { fetchAllProducts } from "@/lib/products-server";

export const revalidate = false;

export default async function BestSellersPage() {
  const allProducts = await fetchAllProducts();
  const products = allProducts.filter(p => p.tags.includes('best-seller'));

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Shop</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">Best Sellers</h1>
          <p className="text-[14px] text-primary-foreground/40">Los clásicos que volvieron — por tiempo limitado</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14">
          <p className="text-[12px] text-muted-foreground mb-6">{products.length} productos</p>
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
        </section>

      </main>
      <Footer />
    </>
  );
}
