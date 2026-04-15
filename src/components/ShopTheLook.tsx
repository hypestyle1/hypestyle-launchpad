import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Lady Tribal Black", category: "Crewneck", price: 35000, image: "product-lady-tribal-black.webp" },
  { name: "Buzo Graphite", category: "Hoodie", price: 42000, image: "product-buzo-graphite.webp" },
  { name: "Racing Tee Verde", category: "Tee", price: 26000, image: "product-racing-tee-verde.webp" },
  { name: "Jort Lettering Pink", category: "Jort", price: 28000, badge: "New", image: "product-jort-lettering-pink.webp" },
  { name: "Soccer Jersey", category: "Jersey", price: 28000, badge: "New", image: "product-soccer-jersey.webp" },
  { name: "Jesus Tee", category: "Long Sleeve", price: 24000, image: "product-jesus-tee.webp" },
  { name: "Wafle Gris", category: "Tank", price: 18000, image: "product-wafle-gris.webp" },
  { name: "Camo Set Completo", category: "Set", price: 85000, badge: "New", image: "product-camo-set-completo.webp" },
];

export default function ShopTheLook() {
  const dragRef = useDragScroll();
  const revealRef = useReveal();

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={revealRef}>
      <div className="reveal rd1">
        <SectionHeader title="Shop the Look" link="/productos/" />
      </div>
      <div
        ref={dragRef}
        className="reveal rd2 flex gap-[2px] overflow-x-auto no-scrollbar cursor-grab select-none"
      >
        {products.map((p) => (
          <div key={p.name} className="min-w-[60vw] sm:min-w-[40vw] lg:min-w-[25%] flex-shrink-0">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
