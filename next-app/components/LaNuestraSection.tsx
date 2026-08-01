'use client';

import Link from 'next/link';
import ProductCard from './ProductCard';
import { useProducts } from '@/hooks/useProducts';

const SLUG = 'la-nuestra-jersey-mundial-26';
const VIDEO_SRC = '/hero/la-nuestra-bg.mp4';

export default function LaNuestraSection() {
  const { data: allProducts = [] } = useProducts(0);
  const product = allProducts.find(p => p.slug === SLUG);

  if (!product) return null;

  return (
    <div className="mt-10">
      {/* eyebrow — mismo estilo que el resto de las secciones de New In FW26 */}
      <div className="flex items-center gap-4 mb-5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
          La Nuestra
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/*
        Mobile:  apilado — [col derecha arriba] · [video abajo]
        Desktop: 2 columnas — [video editorial] · [ProductCard + glass info]
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px] lg:items-stretch">

        {/* ── COL IZQUIERDA: video editorial ── */}
        <div className="relative overflow-hidden rounded-[12px] bg-bg-alt min-h-[300px] lg:min-h-0 order-2 lg:order-1">
          <div className="pt-[125%] lg:hidden" aria-hidden />
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,.45) 100%)' }} />
        </div>

        {/* ── COL DERECHA: ProductCard + glass info ── */}
        <div className="order-1 lg:order-2 grid grid-cols-2 gap-[10px]">

          {/* ProductCard — igual que el resto del home. Badge de descuento real
              (no "New In"), y sin el badge "Personalizable" acá: en esta foto
              queda justo sobre el logo "style&culture" de la camiseta. */}
          <ProductCard
            {...product}
            badge={product.originalPrice ? `−${Math.round((1 - product.price / product.originalPrice) * 100)}%` : 'New In'}
            customizable={false}
          />

          {/* Glass info card */}
          <div
            className="relative overflow-hidden rounded-[12px] flex flex-col justify-between"
            style={{
              background: 'rgba(10, 10, 13, 0.97)',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            {/* franja albiceleste izquierda */}
            <div className="absolute top-0 left-0 w-[4px] h-full"
              style={{ background: 'linear-gradient(to bottom, #74b9e0 50%, #ffffff 50%)' }} />

            <div className="pl-5 pr-4 pt-5 pb-5 lg:pl-6 lg:pr-5 lg:pt-6 lg:pb-6 flex flex-col justify-between h-full gap-4 lg:gap-5">

              {/* BLOQUE 1 — título + descripción */}
              <div className="space-y-2.5 lg:space-y-3">
                <p className="text-[9px] lg:text-[10px] uppercase tracking-[0.26em] font-medium"
                  style={{ color: 'rgba(255,255,255,.30)' }}>
                  Mundial 26&apos;
                </p>

                <h3 className="text-[15px] lg:text-[19px] font-black tracking-tight leading-tight text-white">
                  La Nuestra
                </h3>

                <p className="hidden lg:block text-[13px] leading-relaxed italic"
                  style={{ color: 'rgba(255,255,255,.60)' }}>
                  Jersey edición especial Mundial 2026. Diseño albiceleste
                  full sublimado, personalizable con{' '}
                  <strong className="not-italic" style={{ color: 'rgba(255,255,255,.90)' }}>tu nombre y número</strong>{' '}
                  en el dorso.
                </p>

                {/* mobile: desc corta */}
                <p className="lg:hidden text-[12px] leading-relaxed italic"
                  style={{ color: 'rgba(255,255,255,.60)' }}>
                  Jersey edición especial Mundial 2026. Diseño albiceleste
                  full sublimado, personalizable con{' '}
                  <strong className="not-italic" style={{ color: 'rgba(255,255,255,.90)' }}>tu nombre y número</strong>{' '}
                  en el dorso.
                </p>
              </div>

              {/* BLOQUE 2 — CTA */}
              <div className="space-y-2">
                <Link
                  href="/personalizar/la-nuestra-jersey-mundial-26/"
                  className="inline-flex items-center justify-center rounded-full w-full py-2 lg:py-2.5 text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.16em] bg-white transition-opacity hover:opacity-85"
                  style={{ color: '#0A0A0A' }}
                >
                  Personalizá tu dorsal
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
