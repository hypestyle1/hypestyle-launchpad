import { useState } from "react";
import ProductCard from "./ProductCard";
import { useReveal } from "@/hooks/useReveal";

type Product = {
  name: string;
  category: string;
  price: number;
  image: string;
};

type Collection = {
  name: string;
  editorial: string;
  products: Product[];
};

const collections: Collection[] = [
  {
    name: "No Love, Only Style",
    editorial: "No Love, Only Style banner.webp",
    products: [
      { name: "No Love, Only Style Top", category: "Tee", price: 26000, image: "No Love, Only Style Top.webp" },
      { name: "Baby Come Back Cap", category: "Accesorio", price: 15000, image: "baby come back CAP.webp" },
      { name: "Baby Come Back White", category: "Tee", price: 24000, image: "product-baby-come-back-white.webp" },
      { name: "Jort Lettering Pink", category: "Jort", price: 28000, image: "product-jort-lettering-pink.webp" },
    ],
  },
  {
    name: "Camo Set",
    editorial: "stl-look-camo-outdoor.png",
    products: [
      { name: "Camo Set Completo", category: "Set", price: 85000, image: "product-camo-set-completo.webp" },
      { name: "Camo Cap Orange", category: "Accesorio", price: 15000, image: "product-camo-cap-orange.webp" },
      { name: "Camo Look Front", category: "Look", price: 85000, image: "stl-look-camo-front.png" },
      { name: "Camo Look Side", category: "Look", price: 85000, image: "stl-look-camo-side.webp" },
    ],
  },
];

export default function CollectionBanner() {
  const ref = useReveal();
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);

  const switchTo = (i: number) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(i);
      setFading(false);
    }, 220);
  };

  const col = collections[active];

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={ref}>

      {/* Header con tabs */}
      <div className="reveal rd1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Colección</p>
          {/* Tabs */}
          <div className="flex gap-6">
            {collections.map((c, i) => (
              <button
                key={c.name}
                onClick={() => switchTo(i)}
                className={`text-xl md:text-2xl font-bold uppercase tracking-tight transition-colors duration-200 ${
                  i === active
                    ? "text-foreground"
                    : "text-foreground/25 hover:text-foreground/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <a
          href="/productos/"
          className="text-[12px] uppercase tracking-[0.08em] font-medium text-foreground/50 hover:text-foreground transition-colors"
        >
          Ver todo →
        </a>
      </div>

      {/* Contenido con fade */}
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: "opacity 220ms ease",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px]">

          {/* Izquierda: 2×2 productos */}
          <div className="grid grid-cols-2 gap-[2px]">
            {col.products.map((p) => (
              <ProductCard key={p.name} {...p} />
            ))}
          </div>

          {/* Derecha: foto editorial — llena toda la altura del grid */}
          <div className="relative overflow-hidden bg-bg-alt min-h-[300px]">
            <a href="/productos/" className="absolute inset-0 group block">
              <img
                src={`/${col.editorial}`}
                alt={col.name}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg-dark/75 to-transparent">
                <p className="text-primary-foreground/70 text-[10px] uppercase tracking-[0.15em] mb-1">Colección completa</p>
                <p className="text-primary-foreground text-lg font-bold leading-tight">{col.name}</p>
              </div>
            </a>
          </div>

        </div>
      </div>

    </section>
  );
}
