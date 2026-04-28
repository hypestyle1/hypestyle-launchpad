import { useState, useEffect, useMemo } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";

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
      <span className="bg-bg-dark text-primary-foreground text-[20px] md:text-[28px] font-bold px-4 py-2 min-w-[56px] text-center tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">{label}</span>
    </div>
  );

  return (
    <div className="flex gap-2">
      <Block value={time.d} label="días" />
      <Block value={time.h} label="horas" />
      <Block value={time.m} label="min" />
      <Block value={time.s} label="seg" />
    </div>
  );
}

export default function SpecialPricesPage() {
  const { data: allProducts = [] } = useProducts(100);

  const products = useMemo(() =>
    allProducts
      .filter(p => p.originalPrice && p.originalPrice > p.price)
      .sort((a, b) =>
        (b.originalPrice! - b.price) / b.originalPrice! -
        (a.originalPrice! - a.price) / a.originalPrice!
      )
      .map(p => ({
        ...p,
        badge: `−${Math.round((1 - p.price / p.originalPrice!) * 100)}%`,
      })),
    [allProducts]
  );

  const ref = useReveal([products]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Ofertas</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-8">Special Prices</h1>
          <p className="text-[12px] uppercase tracking-[0.14em] text-primary-foreground/40 mb-4">Oferta termina en</p>
          <div className="flex justify-center">
            <Countdown />
          </div>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-6">{products.length} productos en oferta</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {products.map((p, i) => (
              <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                <ProductCard
                  id={p.slug}
                  name={p.name}
                  category={p.category}
                  price={p.price}
                  originalPrice={p.originalPrice}
                  badge={p.badge}
                  image={p.image}
                  images={p.images}
                  sizes={p.sizes}
                  stock={p.stock}
                  href={p.href}
                />
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-20">No hay productos en oferta en este momento.</p>
          )}
        </section>

      </main>
      <Footer />
    </>
  );
}
