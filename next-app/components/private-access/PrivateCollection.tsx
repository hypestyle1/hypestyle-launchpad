'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import PrivatePhotoStrip from './PrivatePhotoStrip';
import { useReveal } from '@/hooks/useReveal';
import type { PrivateProduct } from '@/lib/private-access/normalize';
import { checkPrivateStock, onPrivateAddedToCart, toRetailCardProps } from '@/lib/private-access/retail';
import './private-access.css';

interface Props {
  products: PrivateProduct[];
  collectionName: string;
  collectionSubtitle: string;
  discountPct: number;
  saleEndsAt: string;
  saleEndsLabel: string;
  publicOpenLabel: string;
}

function timeLeft(to: string): { d: number; h: number; m: number } | null {
  const diff = new Date(to).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * /private-access con sesión válida: la "sala" de Mejores Amigos. Cabecera de
 * vidrio charcoal con acentos verdes (mismo lenguaje que el banner del home y
 * el modal) y la grilla de la colección con talles y CTA a la vista.
 *
 * Sin sesión esta pantalla no se renderiza: app/private-access/page.tsx
 * decide en el servidor y ni siquiera pide los productos.
 */
export default function PrivateCollection({ products, collectionName, collectionSubtitle, discountPct, saleEndsAt, saleEndsLabel, publicOpenLabel }: Props) {
  const router = useRouter();
  const [left, setLeft] = useState<ReturnType<typeof timeLeft>>(null);
  const [filter, setFilter] = useState<string>('Todo');

  useEffect(() => {
    const tick = () => setLeft(timeLeft(saleEndsAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [saleEndsAt]);

  const categories = useMemo(() => ['Todo', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const visible = filter === 'Todo' ? products : products.filter(p => p.category === filter);
  const ref = useReveal([visible]);

  async function logout() {
    await fetch('/api/private-access/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        {/* ── Fotos de la colección: lo primero que se ve ───────── */}
        <PrivatePhotoStrip />

        {/* ── Barra de precio ──────────────────────────────────────── */}
        {/* Las fotos son las protagonistas: la barra solo dice qué colección es,
            el descuento y cuánto falta para que termine el precio. */}
        <div className="max-w-[1400px] mx-auto px-4 pt-4 md:pt-5">
          <section className="pa-glass-charcoal relative overflow-hidden rounded-[16px] md:rounded-[18px] text-white">
            <div className="pa-grain" aria-hidden />

            <div className="relative px-5 py-3.5 md:px-7 md:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-8">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1.5">
                <h1 className="text-[13px] md:text-[14px] font-bold uppercase tracking-[0.08em]">
                  {collectionName} <span className="text-white/45 font-medium">· {collectionSubtitle}</span>
                </h1>
                <span className="flex items-center gap-2 text-[12px] text-white/60">
                  <span className="pa-pill-green pa-pill-green--dark text-[12px]">{discountPct}% OFF</span>
                  hasta el {saleEndsLabel}
                </span>
              </div>

              {/* Cuenta regresiva del precio Mejores Amigos */}
              {left && (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Termina en</span>
                  <div className="flex items-stretch gap-1" suppressHydrationWarning>
                    {[{ v: left.d, u: 'd' }, { v: left.h, u: 'h' }, { v: left.m, u: 'm' }].map(x => (
                      <div key={x.u} className="pa-chip-glass flex items-baseline gap-0.5 px-2.5 py-1.5 rounded-[8px]">
                        <span className="text-[16px] md:text-[18px] font-bold leading-none tabular-nums">{pad(x.v)}</span>
                        <span className="text-[10px] text-white/45">{x.u}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Colección ────────────────────────────────────────────── */}
        {/* Filtros por tipo de prenda: parte del bloque de Private Access. */}
        {categories.length > 2 && (
          <div className="max-w-[1400px] mx-auto px-4 pt-6 md:pt-8">
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtrar la colección">
              {categories.map(c => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={filter === c}
                  onClick={() => setFilter(c)}
                  className={`shrink-0 h-8 px-3.5 rounded-full text-[11px] font-medium border transition-colors ${
                    filter === c ? 'bg-bg-dark text-white border-bg-dark' : 'border-border-mid text-foreground/70 hover:border-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desde acá, la grilla de la tienda tal cual (components/CategoriaPage):
            mismo contenedor, mismas columnas, mismo gap y el ProductCard retail.
            Private Access solo cambia los datos y a dónde lleva el click. */}
        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <p className="text-[12px] text-muted-foreground mb-6">{visible.length} producto{visible.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {visible.map((p, i) => (
              <div key={p.slug} className={`reveal rd${Math.min(i + 1, 8)}`}>
                <ProductCard {...toRetailCardProps(p)} checkStockFn={checkPrivateStock} onAddedToCart={onPrivateAddedToCart} />
              </div>
            ))}
          </div>

          <div className="mt-14 md:mt-20 border-t border-border pt-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,71%,38%)]" aria-hidden />
              Tu acceso privado está activo hasta el {publicOpenLabel}. Después, la colección queda abierta para todos.
            </p>
            <button onClick={logout} className="self-start md:self-auto underline underline-offset-4 decoration-foreground/30 hover:text-foreground transition-colors">
              Cerrar acceso en este dispositivo
            </button>
          </div>
        </section>
      </main>
      <Footer />

    </>
  );
}
