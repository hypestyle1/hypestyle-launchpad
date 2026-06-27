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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] lg:items-stretch">

        {/* ── COL IZQUIERDA: foto editorial ─────────────────────────── */}
        {/* En mobile usamos padding-top en vez de aspect-ratio de CSS porque
            Safari no resuelve bien aspect-ratio en grid items con solo contenido
            position:absolute (Next.js Image fill sin dimensiones intrínsecas).
            En desktop lg:items-stretch del padre estira la columna. */}
        <div className="relative overflow-hidden rounded-[8px] bg-bg-alt min-h-[320px] lg:min-h-0 order-2 lg:order-1">
          <div className="pt-[133.33%] lg:hidden" aria-hidden="true" />
          <Image
            src="/newin/venezuela-f1000010.jpg"
            alt="Stars For Venezuela — Benefit Drop"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[center_30%]"
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
          <div className="grid grid-cols-2 gap-[2px]">

            {/* ProductCard */}
            <div>
              <ProductCard
                {...product}
                badge="New In"
                mutedPrice
              />
            </div>

            {/* Info benéfica — h-full para igualar la altura de la card */}
            <div className="flex flex-col justify-between h-full py-3 px-3 lg:py-4 lg:px-4 bg-bg-alt/30">

              {/* BLOQUE 1 — encabezado + descripción */}
              <div className="space-y-1.5 lg:space-y-2.5">
                <p className="text-[9px] lg:text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
                  Benefit Drop
                </p>
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <h3 className="text-[12px] lg:text-base font-semibold tracking-tight leading-tight">
                    Stars For Venezuela
                  </h3>
                  <VzlaFlag />
                </div>
                <span className="inline-block text-[9px] lg:text-[10px] font-semibold uppercase tracking-[0.16em] bg-foreground text-background px-2 py-0.5 rounded-full">
                  1 buzo = 10 férulas
                </span>
                {/* Mobile: descripción corta */}
                <p className="text-[11px] leading-snug text-foreground/80 lg:hidden">
                  Cada buzo dona filamento PLA para imprimir férulas ortopédicas
                  en 3D con <span className="font-medium">@kidddstars</span>.
                </p>
                {/* Desktop: descripción completa */}
                <p className="hidden lg:block text-[13px] leading-relaxed text-foreground/80">
                  Con cada buzo vendido donamos 1 kg de filamento PLA para producir
                  férulas ortopédicas impresas en 3D junto a{' '}
                  <span className="font-medium">@kidddstars</span>.
                </p>
              </div>

              {/* BLOQUE 2 — contador + barra */}
              <div className="space-y-1.5 lg:space-y-2">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[9px] lg:text-[11px] uppercase tracking-[0.14em] lg:tracking-[0.18em] text-muted-foreground leading-tight">
                    <span className="lg:hidden">{soldOut ? 'Objetivo' : 'Férulas proy.'}</span>
                    <span className="hidden lg:inline">{soldOut ? 'Objetivo alcanzado' : 'Férulas proyectadas'}</span>
                  </span>
                  <span className="text-[11px] lg:text-sm font-medium tabular-nums shrink-0">
                    {soldOut ? `${GOAL}/${GOAL}` : `${splints}/${GOAL}`}
                  </span>
                </div>
                <div className="h-[2px] w-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Solo desktop */}
                <p className="hidden lg:block text-[11px] text-muted-foreground">
                  Cada buzo equivale a aproximadamente 10 férulas.
                </p>
              </div>

              {/* BLOQUE 3 — CTA + nota de transparencia */}
              <div className="space-y-2 lg:space-y-3">
                <Link
                  href="/producto/stars-for-venezuela-hoodie/"
                  style={{
                    background: 'rgba(20, 20, 20, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                  className="inline-flex items-center justify-center rounded-full w-full lg:w-auto lg:px-8 py-2 lg:py-2.5 text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.16em] lg:tracking-[0.18em] text-white transition-opacity hover:opacity-80"
                >
                  Sumate a la causa
                </Link>
                <p className="text-[9px] lg:text-[11px] text-muted-foreground border-t border-border pt-1.5 lg:pt-2 leading-snug lg:leading-relaxed">
                  <span className="lg:hidden">Al finalizar compartimos el avance con @kidddstars.</span>
                  <span className="hidden lg:inline">
                    Al finalizar la acción vamos a compartir el total de férulas
                    producidas y el avance junto a @kidddstars.
                  </span>
                </p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
