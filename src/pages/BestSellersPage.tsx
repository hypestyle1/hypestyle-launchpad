import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { PRODUCTS } from "@/data/products";

const BEST_SELLER_SLUGS = [
  "zip-hoodie-pink", "sweatpant-pink", "hoodie-pink",
  "camo-full-set-combo", "zip-hoodie-camo", "sweatpant-camo",
  "no-service-for-the-faithless-tees", "race-tee",
  "lettering-graphite-hoodie", "hoodie-stay-hustle",
  "baby-come-back-tees", "no-love-only-style-tops",
];

const products = BEST_SELLER_SLUGS
  .map(slug => PRODUCTS.find(p => p.slug === slug))
  .filter(Boolean)
  .map(p => ({
    id: p!.slug,
    name: p!.name, category: p!.category, price: p!.price,
    originalPrice: p!.originalPrice,
    image: p!.images[0], images: p!.images,
    sizes: p!.sizes, stock: p!.stock,
    href: `/producto/${p!.slug}/`,
  }));

export default function BestSellersPage() {
  const ref = useReveal();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Shop</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">New In</h1>
          <p className="text-[14px] text-primary-foreground/40">Los más vendidos de la temporada</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-6">{products.length} productos</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {products.map((p, i) => (
              <div key={p.name} className={`reveal rd${Math.min(i + 1, 8)}`}>
                <ProductCard {...p} />
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
