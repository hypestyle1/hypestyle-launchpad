'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import type { PrivateProduct } from '@/lib/private-access/normalize';
import { usePrivateAddToCart } from './usePrivateAddToCart';

interface Props {
  product: PrivateProduct;
  /** Versión compacta sin talles ni CTA (relacionados de la ficha). */
  compact?: boolean;
}

/**
 * Card de la colección privada. Misma anatomía de imagen que ProductCard
 * (mockup cuadrado, foto de uso al pasar el mouse), pero con talles y CTA
 * siempre visibles: la mayoría entra desde el celular, donde no hay hover.
 */
export default function PrivateProductCard({ product, compact }: Props) {
  const { formatPrice } = useLocale();
  const { addToCart, checking } = usePrivateAddToCart();
  const [hovered, setHovered] = useState(false);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [added, setAdded] = useState(false);
  // Talles que el chequeo en vivo encontró agotados (después de cargada la página).
  const [liveOut, setLiveOut] = useState<Set<string>>(new Set());
  const isOut = (s: string) => product.stock[s] === 'out' || liveOut.has(s);

  const hoverImage = product.images.length > 1 ? product.images[1] : null;
  const outOfStock = product.sizes.length > 0 && product.sizes.every(isOut);
  const pct = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const lowSelected = size ? product.stock[size] === 'low' : false;
  const singleSize = product.sizes.length === 1;

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!size || isOut(size) || checking) return;
    const r = await addToCart(product, size);
    if (r === 'out') { setLiveOut(prev => new Set([...prev, size])); setSize(null); return; }
    if (r !== 'added') return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const ctaLabel = outOfStock ? 'Sin stock'
    : checking ? 'Verificando…'
    : added ? '✓ Agregado'
    : size ? (singleSize ? 'Agregar' : `Agregar · ${size}`)
    : 'Elegí tu talle';

  return (
    <div className="group flex flex-col" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Link href={product.href} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[6px] bg-bg-alt">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className={`object-cover object-top transition-opacity duration-500 ${hovered && hoverImage ? 'opacity-0' : 'opacity-100'}`}
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className={`object-cover object-center transition-opacity duration-500 ${hovered ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          <div className="absolute top-2.5 left-2.5 z-10">
            {outOfStock ? (
              <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[5px] bg-foreground text-background">Sin stock</span>
            ) : pct > 0 ? (
              <span className="pa-badge-green">−{pct}%</span>
            ) : null}
          </div>
          <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] rounded-[5px] bg-black/60 text-white backdrop-blur-sm">
            <span className="w-1 h-1 rounded-full bg-[hsl(142,70%,55%)]" aria-hidden />
            Private
          </span>
        </div>

        <div className="mt-3 px-0.5">
          <p className="text-[13px] leading-tight">{product.name}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span suppressHydrationWarning className="text-[14px] font-semibold">
              {formatPrice(outOfStock && product.originalPrice ? product.originalPrice : product.price)}
            </span>
            {product.originalPrice && !outOfStock && (
              <span suppressHydrationWarning className="text-[12px] text-text-light line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </Link>

      {!compact && (
        <div className="mt-2.5 px-0.5 flex flex-col gap-2">
          {!singleSize && (
            <div className="flex flex-wrap gap-1" role="group" aria-label={`Talles de ${product.name}`}>
              {product.sizes.map(s => {
                const out = isOut(s);
                const sel = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={out}
                    aria-pressed={sel}
                    onClick={() => setSize(s)}
                    className={`min-w-[32px] h-8 px-1.5 text-[11px] font-medium rounded-[6px] border transition-colors ${
                      out ? 'border-border text-foreground/25 line-through cursor-not-allowed'
                      : sel ? 'border-foreground bg-foreground text-background'
                      : 'border-border-mid text-foreground/75 hover:border-foreground'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={add}
            disabled={outOfStock || !size || checking}
            className={`h-9 w-full rounded-[8px] text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
              added ? 'bg-[hsl(142,71%,30%)] text-white'
              : size && !outOfStock ? 'bg-bg-dark text-white hover:bg-bg-dark/85'
              : 'bg-bg-alt text-foreground/40 cursor-not-allowed'
            }`}
          >
            {ctaLabel}
          </button>
          <p className="min-h-[14px] text-[10.5px] text-amber-700">{lowSelected && !added ? 'Últimas unidades' : ''}</p>
        </div>
      )}
    </div>
  );
}
