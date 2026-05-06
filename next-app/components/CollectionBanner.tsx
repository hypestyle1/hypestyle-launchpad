'use client';

import { useState } from "react";
import Image from "next/image";
import ProductCard from "./ProductCard";
import { useReveal } from "@/hooks/useReveal";

type Product = {
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  href?: string;
};

type Collection = {
  name: string;
  editorial: string;
  href: string;
  products: Product[];
};

const collections: Collection[] = [
  {
    name: "FW26",
    href: "/colecciones/fw26/",
    editorial: "stl-look-halfzip-polo-navy.png",
    products: [
      { name: "Half Zip Polo — Grey", category: "Polo", price: 69000, originalPrice: 138000, image: "products/half-zip-polo-grey-0.webp", href: "/producto/half-zip-polo-grey" },
      { name: "Half Zip Polo — Navy", category: "Polo", price: 69000, originalPrice: 138000, image: "products/half-zip-polo-navy-0.webp", href: "/producto/half-zip-polo-navy" },
      { name: "Half Zip Polo — Black", category: "Polo", price: 69000, originalPrice: 138000, image: "products/half-zip-polo-black-0.webp", href: "/producto/half-zip-polo-black" },
      { name: "Melange Hoodie", category: "Hoodie", price: 0, image: "stl-look-melange-tracksuit.png", href: "/producto/hoodie-melange" },
    ],
  },
  {
    name: "Pink Set Drop",
    href: "/colecciones/pink-set-drop/",
    editorial: "stl-look-pink-set.png",
    products: [
      { name: "Zip Hoodie Pink", category: "Hoodie", price: 135000, image: "products/zip-hoodie-pink-0.webp", href: "/producto/zip-hoodie-pink" },
      { name: "SweatPant Pink", category: "Pantalón", price: 125000, image: "products/sweatpant-pink-0.webp", href: "/producto/sweatpant-pink" },
      { name: "Half Zip Polo — Grey", category: "Polo", price: 69000, originalPrice: 138000, image: "products/half-zip-polo-grey-0.webp", href: "/producto/half-zip-polo-grey" },
      { name: "Lettering Pink — Jort", category: "Jort", price: 69000, image: "product-jort-lettering-pink.webp", href: "/producto/lettering-pink-jort" },
    ],
  },
  {
    name: "No Love, Only Style",
    href: "/colecciones/no-love-only-style/",
    editorial: "No Love, Only Style banner.webp",
    products: [
      { name: "No Love, Only Style — Top", category: "Top", price: 33000, image: "No Love, Only Style Top.webp", href: "/producto/no-love-only-style-tops" },
      { name: "Trucker Cap — Baby Come Back", category: "Accesorio", price: 38000, image: "baby come back CAP.webp", href: "/producto/trucker-cap-baby-come-back" },
      { name: "Baby Come Back — Tee", category: "Tee", price: 68000, image: "product-baby-come-back-white.webp", href: "/producto/baby-come-back-tees" },
      { name: "Lettering Pink — Jort", category: "Jort", price: 69000, image: "product-jort-lettering-pink.webp", href: "/producto/lettering-pink-jort" },
    ],
  },
  {
    name: "Camo Set",
    href: "/colecciones/camo-set/",
    editorial: "stl-look-camo-front.png",
    products: [
      { name: "Camo Full Set", category: "Set", price: 246000, image: "product-camo-set-completo.webp", href: "/producto/camo-full-set-combo" },
      { name: "Camo Cap", category: "Accesorio", price: 40000, image: "product-camo-cap-orange.webp", href: "/producto/camo-cap" },
      { name: "Zip Hoodie Camo", category: "Hoodie", price: 128000, image: "stl-look-camo-front.png", href: "/producto/zip-hoodie-camo" },
      { name: "Sweatpant Camo", category: "Pantalón", price: 118000, image: "stl-look-camo-side.webp", href: "/producto/sweatpant-camo" },
    ],
  },
  {
    name: "Race Drop",
    href: "/colecciones/race-drop/",
    editorial: "race drop banner.webp",
    products: [
      { name: "Race Tee", category: "Tee", price: 68000, image: "product-racing-tee-verde.webp", href: "/producto/race-tee" },
      { name: "No Service For The Faithless — Tee", category: "Tee", price: 68000, image: "No servide for the faithless tee.webp", href: "/producto/no-service-for-the-faithless-tees" },
      { name: "No Service For The Faithless — Hoodie", category: "Hoodie", price: 77000, image: "hoodie lettering.webp", href: "/producto/no-service-for-the-faithless-hoodie" },
      { name: "Trucker Cap — No Faith, No Glory", category: "Accesorio", price: 32000, image: "TRUCKER CAP - NO FAITH, NO GLORY.webp", href: "/producto/trucker-cap-no-faith-no-glory" },
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
    setTimeout(() => { setActive(i); setFading(false); }, 220);
  };

  const col = collections[active];

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>

      <div className="reveal rd1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Colecciones</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {collections.map((c, i) => (
              <button
                key={c.name}
                onClick={() => switchTo(i)}
                className={`text-xl md:text-2xl font-bold uppercase tracking-tight transition-colors duration-200 ${
                  i === active ? "text-foreground" : "text-foreground/25 hover:text-foreground/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <a
          href={col.href}
          className="text-[12px] uppercase tracking-[0.08em] font-medium text-foreground/50 hover:text-foreground transition-colors whitespace-nowrap"
        >
          Ver más →
        </a>
      </div>

      <div style={{ opacity: fading ? 0 : 1, transition: "opacity 220ms ease" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px]">
          <div className="grid grid-cols-2 gap-[2px]">
            {col.products.map((p) => (
              <ProductCard key={p.name} {...p} />
            ))}
          </div>
          <div className="relative overflow-hidden bg-bg-alt min-h-[300px]">
            <a href={col.href} className="absolute inset-0 group block">
              <Image
                src={`/${col.editorial}`}
                alt={col.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
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
