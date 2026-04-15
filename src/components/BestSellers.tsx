import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Lady Tribal Black", category: "Crewneck", price: 35000, badge: "Best Seller", image: "product-lady-tribal-black.webp" },
  { name: "Buzo Graphite", category: "Hoodie", price: 42000, badge: "Best Seller", image: "product-buzo-graphite.webp" },
  { name: "Jesus Tee", category: "Long Sleeve", price: 24000, badge: "Best Seller", image: "product-jesus-tee.webp" },
  { name: "Racing Tee Verde", category: "Tee", price: 26000, badge: "Best Seller", image: "product-racing-tee-verde.webp" },
];

export default function BestSellers() {
  const ref = useReveal();

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Best Sellers" link="/productos/" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.name} className={`reveal rd${i + 2}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
