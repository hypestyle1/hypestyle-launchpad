'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import { sizeLevel, stockKey, canOrder, isPurchasable, isUnconfirmed, type MayoristaProduct } from '@/lib/mayorista-products';
import { PROMO_TAG_LABEL } from '@/lib/mayorista-campaign-view';

export default function MayoristaProductCard({ product }: { product: MayoristaProduct }) {
  const { add } = useMayoristaCart();
  const [added, setAdded] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const outOfStock = product.sizes.every(s => sizeLevel(product, s) === 'out');
  // Próximamente: se muestra, no se pide. Sin confirmar: ningún talle con
  // cantidad cargada en Woo (lib/mayorista-products.ts), tampoco se pide.
  const comingSoon = product.comingSoon;
  const unconfirmed = !comingSoon && isUnconfirmed(product);
  const purchasable = isPurchasable(product);
  const blockedLabel = comingSoon ? 'Próximamente' : outOfStock ? 'Sin stock' : 'Stock sin confirmar';
  const images = product.images.length ? product.images : [product.image];
  const hasMultiple = images.length > 1;
  // Con más de un color el talle solo no alcanza para armar la línea del
  // pedido: la card manda a la ficha, donde se elige color y talle.
  const hasColors = product.colors.length > 1;
  const singleColor = product.colors.length === 1 ? product.colors[0] : undefined;
  const singleSize = product.sizes.length === 1;
  const singleSizeLow = singleSize && sizeLevel(product, product.sizes[0]) === 'low';
  const singleSizeQty = singleSize ? product.stockQty[stockKey(product, product.sizes[0], singleColor)] : null;

  function handleAdd(size: string, e: React.MouseEvent) {
    e.preventDefault();
    if (hasColors || !canOrder(product, product.stock[stockKey(product, size, singleColor)])) return;
    // El precio del carrito es orientativo (promo si hay campaña): el
    // servidor lo recalcula al confirmar.
    add({ slug: product.slug, name: product.name, price: product.promo?.price ?? product.wholesalePrice, image: product.image, size, ...(singleColor ? { color: singleColor } : {}), quantity: 1 });
    setAdded(size);
    setTimeout(() => setAdded(null), 1500);
  }

  function prevImg(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setImgIndex(i => (i - 1 + images.length) % images.length);
  }

  function nextImg(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setImgIndex(i => (i + 1) % images.length);
  }

  return (
    <Link href={`/mayoristas/producto/${product.slug}`} className="group block">
      <div className="relative aspect-square rounded-[8px] overflow-hidden bg-bg-alt">
        {images[imgIndex] && (
          <Image
            src={imgSrc(images[imgIndex])}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover object-top"
          />
        )}
        {comingSoon ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-background/90 text-foreground border border-border">
            Próximamente
          </span>
        ) : outOfStock ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-foreground text-background">
            Sin stock
          </span>
        ) : unconfirmed ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-background/90 text-foreground border border-dashed border-foreground/40">
            Stock sin confirmar
          </span>
        ) : product.promo ? (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-sale text-sale-foreground">
            {product.promo.badge} · −{Math.round(product.promo.discount * 100)}%
          </span>
        ) : product.drop && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-bg-dark text-primary-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,55%)]" aria-hidden />
            Nuevo drop
          </span>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={prevImg}
              aria-label="Foto anterior"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-foreground transition-colors hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImg}
              aria-label="Foto siguiente"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-foreground transition-colors hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <span key={i} className={`w-1 h-1 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">{product.category}</p>
        <p className="text-[13px] font-medium leading-tight mt-0.5">{product.name}</p>
        {product.shortDescription && (
          <p className="text-[11px] text-text-light leading-tight mt-0.5">{product.shortDescription}</p>
        )}
        {product.promo ? (
          <>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[14px] font-semibold">{formatArs(product.promo.price)}</span>
              <span className="text-[12px] text-text-light line-through">{formatArs(product.wholesalePrice)}</span>
              <span className="text-[10px] uppercase tracking-wide text-sale">{product.promo.label}</span>
            </div>
            <p className="text-[11px] text-text-light mt-0.5">Lista {formatArs(product.regularPrice)} · {PROMO_TAG_LABEL[product.promo.tag]}</p>
          </>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] font-semibold">{formatArs(product.wholesalePrice)}</span>
            <span className="text-[12px] text-text-light"><span className="uppercase tracking-wide text-[9px] mr-1">Lista</span>{formatArs(product.regularPrice)}</span>
          </div>
        )}
        {product.retailPrice != null && (
          <p className="text-[11px] text-text-light mt-0.5">En la tienda hoy {formatArs(product.retailPrice)} (oferta)</p>
        )}

        {!purchasable ? (
          <span className="mt-2 block w-full text-center py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-[6px] bg-bg-alt text-text-light/70">
            {blockedLabel}
          </span>
        ) : hasColors ? (
          <>
            <p className="mt-2 text-[11px] text-text-light">{product.colors.join(' · ')}</p>
            <span className="mt-2 block w-full text-center py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-[6px] transition-colors bg-bg-dark text-primary-foreground group-hover:bg-bg-dark/85">
              Elegir color y talle
            </span>
          </>
        ) : singleSize ? (
          <>
            {singleSizeLow && singleSizeQty != null && (
              <p className="mt-2 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-[6px] px-2 py-1">
                ⚠ Últimas {singleSizeQty} unidades
              </p>
            )}
            <button
              onClick={(e) => handleAdd(product.sizes[0], e)}
              className="mt-2 w-full min-h-[36px] py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-[6px] transition-colors bg-bg-dark text-primary-foreground hover:bg-bg-dark/85"
            >
              {added === product.sizes[0] ? '✓ Agregado' : '+ Agregar'}
            </button>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.sizes.map((size) => {
              const level = sizeLevel(product, size);
              const isOut = level === 'out';
              const isUnconfirmed = level === 'unconfirmed';
              const isLow = level === 'low';
              const qty = product.stockQty[stockKey(product, size, singleColor)];
              return (
                <button
                  key={size}
                  onClick={(e) => handleAdd(size, e)}
                  disabled={isOut || isUnconfirmed}
                  title={isUnconfirmed ? 'Stock sin confirmar' : undefined}
                  className={`min-w-[36px] min-h-[36px] px-2 py-1 text-[11px] rounded-[6px] border transition-colors flex flex-col items-center justify-center leading-tight ${
                    isOut ? 'border-border text-text-light/60 line-through cursor-not-allowed' :
                    isUnconfirmed ? 'border-dashed border-border text-text-light/60 cursor-not-allowed' :
                    added === size ? 'border-bg-dark bg-bg-dark text-primary-foreground' :
                    isLow ? 'border-orange-400/60 text-orange-600 hover:border-orange-500' :
                    'border-border-mid text-foreground/70 hover:border-foreground'
                  }`}
                >
                  {added === size ? '✓' : size}
                  {isLow && qty != null && added !== size && <span className="text-[8px] leading-tight">¡{qty}!</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
