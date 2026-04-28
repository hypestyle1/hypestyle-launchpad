import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

export default function BestSellers() {
  const { data: products = [] } = useProducts(8);
  const ref = useReveal([products]);

  return (
    <section id="best-sellers" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="New In" link="/best-sellers/" linkLabel="Ver más" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
        {products.map((p, i) => (
          <div key={p.id} className={`reveal rd${Math.min(i + 2, 8)}`}>
            <ProductCard
              id={p.id}
              name={p.name}
              category={p.category}
              price={p.price}
              originalPrice={p.originalPrice}
              image={p.image}
              images={p.images}
              sizes={p.sizes}
              stock={p.stock}
              href={p.href}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
