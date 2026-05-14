'use client';

import Image from "next/image";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

const products = [
  { name: "Half Zip Polo — Melange",        category: "Polo",   price: 87000,  originalPrice: 145000, image: "products/half-zip-polo-grey-0.png",  href: "/producto/half-zip-polo-grey" },
  { name: "Zip Hoodie Pink",                category: "Hoodie", price: 135000,                        image: "products/zip-hoodie-pink-0.jpg",     href: "/producto/zip-hoodie-pink" },
  { name: "Zip Hoodie Camo",               category: "Hoodie", price: 128000,                        image: "products/zip-hoodie-camo-0.png",     href: "/producto/zip-hoodie-camo" },
  { name: "ONLY GOD CAN JUDGE ME — Blanca", category: "Tee",   price: 46500,  originalPrice: 69000,  image: "products/ogcjm-blanca-0.png",        href: "/producto/ogcjm-blanca" },
];

export default function FW26Drop() {
  const ref = useReveal();

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="FW26" link="/colecciones/fw26/" linkLabel="Ver colección">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border px-2.5 py-1 leading-none">
            Nueva temporada
          </span>
        </SectionHeader>
      </div>

      <div className="reveal rd2 grid grid-cols-1 lg:grid-cols-2 gap-[2px]">
        <div className="grid grid-cols-2 gap-[2px]">
          {products.map((p) => (
            <ProductCard
              key={p.name}
              {...p}
              badge={p.originalPrice ? `−${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined}
            />
          ))}
        </div>
        <div className="relative overflow-hidden bg-bg-alt min-h-[300px]">
          <a href="/colecciones/fw26/" className="absolute inset-0 group block">
            <Image
              src="/stl-look-halfzip-polo-navy.png"
              alt="FW26"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-bg-dark/75 to-transparent">
              <p className="text-primary-foreground/70 text-[10px] uppercase tracking-[0.15em] mb-1">Colección completa</p>
              <p className="text-primary-foreground text-lg font-bold leading-tight">FW26</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
