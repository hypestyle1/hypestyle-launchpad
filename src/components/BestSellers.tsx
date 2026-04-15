import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Lady Tribal Black", category: "Crewneck", price: 35000, badge: "Best Seller", image: "product-lady-tribal-black.webp" },
  { name: "Fleece Jacket", category: "Jacket", price: 65000, badge: "New", image: "fleece jacket.webp" },
  { name: "Camo Set Completo", category: "Set", price: 85000, badge: "Best Seller", image: "product-camo-set-completo.webp" },
  { name: "Racing Tee Verde", category: "Tee", price: 26000, badge: "Best Seller", image: "product-racing-tee-verde.webp" },
  { name: "Hoodie Lettering", category: "Hoodie", price: 42000, badge: "New", image: "hoodie lettering.webp" },
  { name: "Hyped Up Grey", category: "Hoodie", price: 38000, badge: "New", image: "hyped up grey.webp" },
  { name: "Sweatpant Bombé Bordo", category: "Pantalón", price: 36000, badge: "New", image: "sweatpant bombe bordo.webp" },
  { name: "Mesh Azul", category: "Jersey", price: 28000, badge: "New", image: "mesh azul.webp" },
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
          <div key={p.name} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
