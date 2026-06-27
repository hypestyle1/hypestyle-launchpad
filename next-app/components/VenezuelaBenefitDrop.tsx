'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
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

  const splints = stockData?.projectedSplints ?? 0;
  const progress = stockData?.progress ?? 0;
  const soldOut = stockData?.soldOut ?? false;

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
        Desktop: 2 columns
          Left  → ProductCard (comprable)
          Right → imagen editorial arriba + texto / contador abajo

        Mobile: apilado — ProductCard, luego texto+contador, luego imagen.
        El truco: la col derecha usa flex-col-reverse en mobile para mostrar
        el texto antes que la imagen, y lg:flex-col para volver al orden natural.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">

        {/* ── COL IZQUIERDA: producto comprable ────────────────────── */}
        <div className="order-1">
          <ProductCard
            {...product}
            badge="BENEFIT DROP"
            mutedPrice
          />
        </div>

        {/* ── COL DERECHA: imagen + editorial info ─────────────────── */}
        <div className="order-2 flex flex-col-reverse lg:flex-col gap-5">

          {/* Imagen editorial — abajo en mobile (col-reverse), arriba en desktop */}
          <div className="relative overflow-hidden rounded-[8px] bg-bg-alt aspect-[3/4] lg:flex-1 lg:min-h-[280px]">
            {product.image && (
              <Image
                src={product.image}
                alt="Stars For Venezuela Hoodie"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
            )}
          </div>

          {/* Texto + contador — arriba en mobile (col-reverse), abajo en desktop */}
          <div className="space-y-5 px-0.5">

            {/* Título e intro */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-1.5">
                Stars For Venezuela
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                Con cada buzo vendido donamos 1 kg de filamento PLA para producir
                férulas ortopédicas impresas en 3D junto a{' '}
                <span className="font-medium">@kiddstars</span>.
              </p>
            </div>

            {/* Contador + barra de progreso */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {soldOut ? 'Objetivo alcanzado' : 'Férulas proyectadas'}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {soldOut ? `${GOAL} / ${GOAL}` : `${splints} / ${GOAL}`}
                </span>
              </div>

              {/* Barra de progreso */}
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

            {/* Nota de transparencia */}
            <p className="text-[11px] text-muted-foreground border-t border-border pt-3 leading-relaxed">
              Al finalizar la acción vamos a compartir el total de férulas producidas
              y el avance junto a @kiddstars.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
