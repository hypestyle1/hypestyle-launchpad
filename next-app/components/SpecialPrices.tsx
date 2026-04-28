'use client';

import { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";
import { useReveal } from "@/hooks/useReveal";

import { PRODUCTS } from "@/data/products";

const products = PRODUCTS
  .filter(p => p.originalPrice && p.originalPrice > p.price)
  .sort((a, b) => (b.originalPrice! - b.price) / b.originalPrice! - (a.originalPrice! - a.price) / a.originalPrice!)
  .slice(0, 8)
  .map(p => {
    const pct = Math.round((1 - p.price / p.originalPrice!) * 100);
    return {
      id: p.slug,
      name: p.name, category: p.category, price: p.price,
      originalPrice: p.originalPrice, badge: `−${pct}%`,
      image: p.images[0], images: p.images,
      sizes: p.sizes, stock: p.stock,
      href: `/producto/${p.slug}/`,
    };
  });

function Countdown() {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date("2026-05-13T23:59:59-03:00").getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const Block = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="bg-bg-dark text-primary-foreground text-[14px] md:text-[16px] font-bold px-2.5 py-1.5 min-w-[36px] text-center tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <div className="flex gap-1.5">
      <Block value={time.d} label="días" />
      <Block value={time.h} label="hs" />
      <Block value={time.m} label="min" />
      <Block value={time.s} label="seg" />
    </div>
  );
}

export default function SpecialPrices() {
  const ref = useReveal();

  return (
    <section id="special-prices" className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
      <div className="reveal rd1">
        <SectionHeader title="Special Prices" link="/special-prices/" linkLabel="Ver más">
          <Countdown />
        </SectionHeader>
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
