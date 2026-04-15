import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Jort Lettering Pink", category: "Jort", price: 28000, badge: "Back", image: "product-jort-lettering-pink.webp" },
  { name: "Camo Cap Orange", category: "Accesorio", price: 15000, badge: "Back", image: "product-camo-cap-orange.webp" },
  { name: "Wafle Gris", category: "Tank", price: 18000, badge: "Back", image: "product-wafle-gris.webp" },
  { name: "Soccer Jersey", category: "Jersey", price: 28000, badge: "Back", image: "product-soccer-jersey.webp" },
];

export default function BackInStock() {
  const ref = useReveal();

  return (
    <section id="back-in-stock" className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Back in Stock" link="/productos/" />
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
