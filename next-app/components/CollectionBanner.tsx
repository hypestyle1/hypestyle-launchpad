'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import ProductCard from "./ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { NormalizedProduct } from "@/lib/products-normalize";
import { fetchAllProducts } from "@/lib/products-server";
import { Skeleton } from "@/components/ui/skeleton";

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
    editorial: "fw26-camo-editorial.jpg",
    products: [], // Will be populated from WordPress
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
  {
    name: "Summer '26",
    href: "/colecciones/summer-26/",
    editorial: "summer drop banner.webp",
    products: [
      { name: "Mesh RealTree™ Pink", category: "Tee", price: 28000, image: "mesh rosa.webp", href: "/producto/mesh-realtree-pink" },
      { name: "Jersey Fileteado x Alfredo Genovese", category: "Jersey", price: 32000, image: "product-fileteado-tee.webp", href: "/productos/" },
      { name: "Lettering Pink — Jort", category: "Jort", price: 28000, image: "product-jort-lettering-pink.webp", href: "/producto/lettering-pink-jort" },
      { name: "Regular Tee", category: "Tee", price: 18000, image: "regular tee 1.webp", href: "/producto/regular-tee-black" },
    ],
  },
];

const SkeletonCard = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="aspect-square w-full rounded-none bg-bg-alt/60" />
    <div className="mt-3 px-0.5 space-y-2">
      <Skeleton className="h-3 w-1/4 rounded-none bg-bg-alt/60" />
      <Skeleton className="h-4 w-3/4 rounded-none bg-bg-alt/60" />
      <Skeleton className="h-3.5 w-1/3 rounded-none bg-bg-alt/60" />
    </div>
  </div>
);

export default function CollectionBanner() {
  const ref = useReveal();
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [fw26Products, setFw26Products] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const allProducts: NormalizedProduct[] = await fetchAllProducts();
        const fw26TaggedProducts = allProducts.filter(p => p.tags.includes('fw26'));
        
        const formattedProducts: Product[] = fw26TaggedProducts.map(p => ({
          name: p.name,
          category: p.category,
          price: p.price,
          originalPrice: p.originalPrice,
          image: p.image,
          href: p.href,
        }));
        
        if (formattedProducts.length > 0) {
          setFw26Products(formattedProducts);
        }
      } catch (error) {
        console.error('Error fetching FW26 products:', error);
        // Fallback to hardcoded products if API fails
        setFw26Products([
          { name: "Half Zip Polo — Melange",         category: "Polo",   price: 87000,  originalPrice: 145000, image: "products/half-zip-polo-grey-0.png",  href: "/producto/half-zip-polo-grey" },
          { name: "Half Zip Polo — Navy",            category: "Polo",   price: 87000,  originalPrice: 145000, image: "products/half-zip-polo-navy-0.png",  href: "/producto/half-zip-polo-navy" },
          { name: "Half Zip Polo — Black",           category: "Polo",   price: 87000,  originalPrice: 145000, image: "products/half-zip-polo-black-0.png", href: "/producto/half-zip-polo-black" },
          { name: "ONLY GOD CAN JUDGE ME — Blanca",  category: "Tee",    price: 46500,  originalPrice: 69000,  image: "products/ogcjm-blanca-0.png",        href: "/producto/ogcjm-blanca" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const switchTo = (i: number) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 220);
  };

  const col = collections[active];

  const displayProducts = active === 0 ? fw26Products : col.products;

  return (
    <section className="max-w-[1400px] mx-auto py-10 md:py-14" ref={ref}>

      <div className="reveal rd1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 px-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Colecciones</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-end">
            {collections.map((c, i) => (
              <button
                key={c.name}
                onClick={() => switchTo(i)}
                className={`flex flex-col items-start transition-colors duration-200 ${
                  i === active ? "text-foreground" : "text-foreground/25 hover:text-foreground/50"
                }`}
              >
                <span className={`font-bold uppercase tracking-tight ${
                  i === active ? "text-xl md:text-2xl" : "text-[13px] md:text-xl"
                }`}>
                  {c.name}
                </span>
                {c.name === "FW26" && (
                  <span className="text-[7px] uppercase tracking-[0.12em] border border-current px-1.5 py-0.5 mt-1 leading-none">
                    Nueva temporada
                  </span>
                )}
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
            {active === 0 && loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              displayProducts.map((p) => (
                <ProductCard key={p.name} {...p} />
              ))
            )}
          </div>
          <div className="relative overflow-hidden bg-bg-alt min-h-[300px]">
            <a href={col.href} className="absolute inset-0 group block">
              <Image
                src={`/${col.editorial}`}
                alt={col.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
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
