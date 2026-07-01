'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { useProducts } from '@/hooks/useProducts';

const SLUG = 'stars-for-venezuela-hoodie';
const GOAL = 600;

interface VenezuelaStock {
  totalStock: number;
  soldUnits: number;
  projectedSplints: number;
  progress: number;
  soldOut: boolean;
}

function VzlaFlag() {
  return (
    <svg width="26" height="17" viewBox="0 0 22 14" aria-hidden="true"
      className="inline-block align-middle shrink-0" style={{ borderRadius: 3, overflow: 'hidden' }}>
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
      {/* eyebrow */}
      <div className="flex items-center gap-4 mb-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          Benefit Drop
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/*
        Mobile:  apilado — [col derecha arriba] · [foto abajo]
        Desktop: 2 columnas — [foto editorial] · [ProductCard + glass info]
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px] lg:items-stretch">

        {/* ── COL IZQUIERDA: foto editorial ── */}
        <div className="relative overflow-hidden rounded-[12px] bg-bg-alt min-h-[300px] lg:min-h-0 order-2 lg:order-1">
          <div className="pt-[125%] lg:hidden" aria-hidden />
          <Image
            src="/newin/venezuela-f1000010.jpg"
            alt="Stars For Venezuela — Benefit Drop"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[58%_25%]"
            priority={false}
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,.45) 100%)' }} />
        </div>

        {/* ── COL DERECHA: ProductCard + glass info ── */}
        <div className="order-1 lg:order-2 grid grid-cols-2 gap-[10px]">

          {/* ProductCard — igual que el resto del home */}
          <ProductCard
            {...product}
            badge="New In"
            mutedPrice
          />

          {/* Glass info card */}
          <div
            className="relative overflow-hidden rounded-[12px] flex flex-col justify-between"
            style={{
              background: 'rgba(10, 10, 13, 0.97)',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            {/* franja tricolor izquierda */}
            <div className="absolute top-0 left-0 w-[4px] h-full"
              style={{ background: 'linear-gradient(to bottom, #FCD116 33.3%, #003893 33.3% 66.6%, #CF142B 66.6%)' }} />

            <div className="pl-5 pr-4 pt-5 pb-5 lg:pl-6 lg:pr-5 lg:pt-6 lg:pb-6 flex flex-col justify-between h-full gap-4 lg:gap-5">

              {/* BLOQUE 1 — título + badge + descripción */}
              <div className="space-y-2.5 lg:space-y-3">
                <p className="text-[9px] lg:text-[10px] uppercase tracking-[0.26em] font-medium"
                  style={{ color: 'rgba(255,255,255,.30)' }}>
                  Benefit Drop
                </p>

                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] lg:text-[17px] font-black tracking-tight leading-tight text-white">
                    Stars For Venezuela
                  </h3>
                  <VzlaFlag />
                </div>

                <span
                  className="inline-block text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full"
                  style={{ background: '#FCD116', color: '#0A0A0A' }}
                >
                  1 buzo = 1 kg filamento PLA
                </span>

                <p className="hidden lg:block text-[12px] leading-relaxed italic"
                  style={{ color: 'rgba(255,255,255,.55)' }}>
                  Con cada buzo vendido donamos 1 kg de filamento PLA
                  para imprimir entre{' '}
                  <strong className="not-italic" style={{ color: 'rgba(255,255,255,.85)' }}>10 y 15 férulas ortopédicas</strong>{' '}
                  en 3D para los afectados del terremoto del{' '}
                  <strong className="not-italic" style={{ color: 'rgba(255,255,255,.85)' }}>24 de junio</strong>.
                </p>

                {/* mobile: desc corta */}
                <p className="lg:hidden text-[10px] leading-snug italic"
                  style={{ color: 'rgba(255,255,255,.55)' }}>
                  1 kg de PLA →{' '}
                  <strong className="not-italic" style={{ color: 'rgba(255,255,255,.80)' }}>10–15 férulas</strong>{' '}
                  para los afectados del 24/6.
                </p>
              </div>

              {/* BLOQUE 2 — barra progreso */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[8px] lg:text-[10px] uppercase tracking-[0.16em] font-medium"
                    style={{ color: 'rgba(255,255,255,.28)' }}>
                    <span className="lg:hidden">{soldOut ? 'Objetivo' : 'Férulas proy.'}</span>
                    <span className="hidden lg:inline">{soldOut ? 'Objetivo alcanzado' : 'Férulas proyectadas'}</span>
                  </span>
                  <span className="text-[10px] lg:text-[11px] font-semibold tabular-nums"
                    style={{ color: 'rgba(255,255,255,.55)' }}>
                    {soldOut ? `${GOAL}/${GOAL}` : `${splints}/${GOAL}`}
                  </span>
                </div>
                <div className="h-[2px] w-full rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,.10)' }}>
                  <div className="h-full transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${progress}%`, background: '#FCD116' }} />
                </div>
              </div>

              {/* BLOQUE 3 — CTA */}
              <div className="space-y-2">
                <Link
                  href="/producto/stars-for-venezuela-hoodie/"
                  className="inline-flex items-center justify-center rounded-full w-full py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.16em] bg-white transition-opacity hover:opacity-85"
                  style={{ color: '#0A0A0A' }}
                >
                  Sumate a la causa
                </Link>
                <p className="hidden lg:block text-[10px] leading-snug"
                  style={{ color: 'rgba(255,255,255,.25)', borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 8 }}>
                  Al finalizar compartimos el total de férulas producidas.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
