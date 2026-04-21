import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { PRODUCTS } from "@/data/products";

const BEST_SELLER_SLUGS = [
  "zip-hoodie-pink", "sweatpant-pink", "camo-full-set-combo", "zip-hoodie-camo",
  "no-service-for-the-faithless-tees", "race-tee", "lettering-graphite-hoodie", "hoodie-stay-hustle",
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

export default function BestSellers() {
  const ref = useReveal();

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In" link="/best-sellers/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.name} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
