'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CollectionIndex from "@/components/collection/CollectionIndex";
import { useScrollSpy } from "@/components/collection/useScrollSpy";
import { useProducts, type NormalizedProduct } from "@/hooks/useProducts";
import { FW26_GROUPS as GROUPS, FW26_SLUGS as ALL_SLUGS } from "@/lib/fw26";

/**
 * Landing /colecciones/fw26 (rediseño 2026): el lenguaje de la home — cabecera
 * editorial compacta, el mismo índice sticky de colección con las secciones
 * reales, grilla con aire, y el lookbook de Rio como banda-carrusel entre
 * secciones con acceso directo al lookbook completo. Los badges de descuento
 * se mantienen: FW26 es la colección anterior y acá la oferta es el contexto.
 */

// Fotos APROBADAS del lookbook de Rio (public/lookbook-fw26/book), horizontales.
const RIO_SLIDES = [
  { n: '6209', alt: 'Camo Full Set en Rio de Janeiro' },
  { n: '6316', alt: 'Half-Zip Polo Melange en Rio de Janeiro' },
  { n: '6533', alt: 'Zip Hoodie Pink en Rio de Janeiro' },
  { n: '6947', alt: 'Jersey La Nuestra en Rio de Janeiro' },
  { n: '6428', alt: 'Stars For Venezuela Hoodie en Rio de Janeiro' },
];

function RioCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % RIO_SLIDES.length), 3600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="-mx-4 md:-mx-6 mb-10 md:mb-14 relative aspect-[4/3] md:aspect-[5/2] bg-bg-alt overflow-hidden">
      {RIO_SLIDES.map((s, k) => (
        <Image
          key={s.n}
          src={`/lookbook-fw26/book/${s.n}.webp`}
          alt={s.alt}
          fill
          sizes="100vw"
          quality={70}
          className="object-cover object-center transition-opacity duration-700"
          style={{ opacity: k === i ? 1 : 0 }}
        />
      ))}
      <Link href="/lookbook-fw26/" aria-label="Ver el lookbook FW26 en Rio de Janeiro" className="absolute inset-0 z-[1]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="pointer-events-none absolute left-4 bottom-4 md:left-6 md:bottom-6 z-[2] text-white">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 mb-1">Lookbook — Rio de Janeiro</p>
        <p className="text-[17px] md:text-[22px] font-semibold leading-tight underline underline-offset-4 decoration-white/60">Ver lookbook</p>
      </div>
      <div className="absolute right-4 bottom-5 md:right-6 z-[2] flex gap-1.5">
        {RIO_SLIDES.map((s, k) => (
          <button
            key={s.n}
            aria-label={`Foto ${k + 1}`}
            onClick={() => setI(k)}
            className={`h-[3px] rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-3 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function FW26Page() {
  const { data: allProducts = [] } = useProducts(0);
  const bySlug = useMemo(() => {
    const map: Record<string, (typeof allProducts)[0]> = {};
    allProducts.forEach(p => { map[p.slug] = p; });
    return map;
  }, [allProducts]);

  const total = useMemo(() => ALL_SLUGS.filter(s => bySlug[s]).length, [bySlug]);

  const grupos = useMemo(
    () => GROUPS.map((g, i) => ({
      id: `g${i}`,
      label: g.label,
      items: g.slugs.map(s => bySlug[s]).filter(Boolean) as NormalizedProduct[],
    })).filter(g => g.items.length > 0),
    [bySlug],
  );
  const nav = grupos.map(g => ({ id: g.id, label: g.label }));
  const { active, onAnchorClick } = useScrollSpy(nav.map(x => x.id), 'fw26-');

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <section className="px-4 md:px-6 pt-6 md:pt-8 pb-6">
          <header className="pt-2 pb-6 md:pb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
              Colección · Fall Winter 26
            </p>
            <h1 className="flex items-baseline gap-2.5 text-[34px] md:text-[56px] font-semibold tracking-[-0.035em] leading-[1.02]">
              Fall Winter 26
              <span className="text-[13px] font-normal tracking-normal text-muted-foreground tabular-nums">{total}</span>
            </h1>
            <p className="text-[14px] text-muted-foreground mt-3 max-w-md leading-relaxed">
              Conjuntos HStars, abrigo, polos y las gráficas de Fe. La colección anterior, con precios de cierre.
            </p>
          </header>

          <CollectionIndex
            title="Fall Winter 26"
            shortTitle="FW26"
            items={nav}
            active={active}
            prefix="fw26-"
            onSelect={onAnchorClick}
          />

          {grupos.map((g, gi) => (
            <div key={g.id} id={`fw26-${g.id}`} className="scroll-mt-[calc(var(--offset)+120px)] mb-12 md:mb-16">
              {gi === 1 && <RioCarousel />}
              <div className="flex items-baseline gap-2 mb-4 md:mb-5">
                <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{g.label}</h2>
                <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{g.items.length}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9">
                {g.items.map(p => (
                  <ProductCard
                    key={p.slug}
                    id={p.slug}
                    name={p.name}
                    category={p.category}
                    price={p.price}
                    originalPrice={p.originalPrice}
                    badge={p.originalPrice ? `−${Math.round((1 - p.price / p.originalPrice) * 100)}%` : undefined}
                    image={p.images[0]}
                    images={p.images}
                    sizes={p.sizes}
                    stock={p.stock}
                    href={`/producto/${p.slug}/`}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
