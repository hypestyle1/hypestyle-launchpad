'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { useProducts } from '@/hooks/useProducts';

const SLUG = 'stars-for-venezuela-hoodie';
const GOAL = 400;

interface VenezuelaStock {
  totalStock: number;
  soldUnits: number;
  projectedSplints: number;
  progress: number;
  soldOut: boolean;
}

// Venezuela flag — 3 horizontal stripes (yellow / blue / red), subtle, 22×14 px
function VzlaFlag() {
  return (
    <svg
      width="22"
      height="14"
      viewBox="0 0 22 14"
      aria-hidden="true"
      className="inline-block align-middle shrink-0"
      style={{ borderRadius: 2 }}
    >
      <rect y="0"    width="22" height="4.67" fill="#FCD116" />
      <rect y="4.67" width="22" height="4.66" fill="#003893" />
      <rect y="9.33" width="22" height="4.67" fill="#CF142B" />
    </svg>
  );
}

export default function VenezuelaBenefitDrop() {
  const { data: allProducts = [] } = useProducts(0);
  const product = allProducts.find(p => p.slug === SLUG);

  const { data: stockData } = useQuery<VenezuelaStock>({
    queryKey: ['venezuela-stock'],
    queryFn: () => fetch('/api/venezuela-stock').then(r => r.json()),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (!product) return null;

  const splints  = stockData?.projectedSplints ?? 0;
  const progress = stockData?.progress ?? 0;
  const soldOut  = stockData?.soldOut ?? false;

  return (
    <div className="mt-10">
      {/* Section eyebrow divider */}
      <div className="flex items-center gap-4 mb-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          Benefit Drop
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/*
        Desktop: 2 columnas
          Izquierda → foto editorial (F1000010.jpg)
          Derecha   → sub-grilla 2 cols: [ProductCard | info benéfica]

        Mobile: apilado — ProductCard primero, info, foto al final.
        order-* controla la reordenación entre columnas.
        Dentro de la col derecha, flex-col-reverse pone info antes que card en mobile.
      */}
      {/* items-stretch: la foto se expande para igualar la altura de la col derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] items-stretch">

        {/* ── COL IZQUIERDA: foto editorial ─────────────────────────── */}
        {/* aspect-[3/4] en mobile, en desktop ocupa la altura que le da el grid */}
        <div
          className="relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[3/4] lg:aspect-auto min-h-[320px] order-2 lg:order-1 lg:self-stretch"
        >
          <Image
            src="/newin/venezuela-f1000010.jpg"
            alt="Stars For Venezuela — Benefit Drop"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-top"
            priority={false}
          />
        </div>

        {/* ── COL DERECHA: ProductCard + info benéfica ──────────────── */}
        <div className="order-1 lg:order-2">

          {/*
            Sub-grilla 2 cols (igual que la grilla de productos en otras secciones):
            - Izq: ProductCard
            - Der: bloque de información benéfica

            En mobile se convierte en 1 col y el orden se mantiene por DOM.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">

            {/* ProductCard */}
            <div>
              <ProductCard
                {...product}
                badge="1 BUZO = 10 FÉRULAS"
                mutedPrice
              />
            </div>

            {/* Info benéfica */}
            <div className="flex flex-col justify-between py-4 px-4 bg-bg-alt/30">

              {/* Encabezado */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                  Benefit Drop
                </p>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight leading-tight">
                    Stars For Venezuela
                  </h3>
                  <VzlaFlag />
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/80">
                  Con cada buzo vendido donamos 1 kg de filamento PLA para producir
                  férulas ortopédicas impresas en 3D junto a{' '}
                  <span className="font-medium">@kidddstars</span>.
                </p>
              </div>

              {/* Contador + barra */}
              <div className="space-y-2 mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {soldOut ? 'Objetivo alcanzado' : 'Férulas proyectadas'}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {soldOut ? `${GOAL} / ${GOAL}` : `${splints} / ${GOAL}`}
                  </span>
                </div>
                <div className="h-[2px] w-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cada buzo equivale a aproximadamente 10 férulas.
                </p>
              </div>

              {/* CTA */}
              <div className="mt-5">
                <Link
                  href="/producto/stars-for-venezuela-hoodie/"
                  style={{
                    background: 'rgba(20, 20, 20, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                  className="inline-flex items-center justify-center rounded-full px-8 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-80"
                >
                  Comprar buzo
                </Link>
              </div>

              {/* Nota de transparencia */}
              <p className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-4 leading-relaxed">
                Al finalizar la acción vamos a compartir el total de férulas
                producidas y el avance junto a @kidddstars.
              </p>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
