import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Jort Lettering Pink", category: "Jort", price: 28000, badge: "Back", image: "product-jort-lettering-pink.webp" },
  { name: "Jort Lettering Grey", category: "Jort", price: 28000, badge: "Back", image: "jort lettering grey.webp" },
  { name: "Lettering Jort", category: "Jort", price: 28000, badge: "Back", image: "lettering jort.webp" },
  { name: "Hype Script Tee", category: "Tee", price: 24000, badge: "Back", image: "regular tee 2.webp" },
  { name: "Gorra Randal", category: "Accesorio", price: 15000, badge: "Back", image: "gorra randal.webp" },
  { name: "Wafle Gris", category: "Tank", price: 18000, badge: "Back", image: "product-wafle-gris.webp" },
  { name: "Remera Fileteado", category: "Tee", price: 28000, badge: "Back", image: "product-fileteado-tee.webp" },
  { name: "Camo Cap Orange", category: "Accesorio", price: 15000, badge: "Back", image: "product-camo-cap-orange.webp" },
  { name: "Mesh Rosa Camo", category: "Jersey", price: 28000, badge: "Back", image: "mesh rosa.webp" },
  { name: "Zippo Hypestyle", category: "Accesorio", price: 18000, badge: "Back", image: "zippo.webp" },
  { name: "No Servide Tee", category: "Tee", price: 26000, badge: "Back", image: "No servide for the faithless tee.webp" },
  { name: "Pack Regular Tees", category: "Pack", price: 55000, badge: "Back", image: "pack regular tees.webp" },
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
          <div key={p.name} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
