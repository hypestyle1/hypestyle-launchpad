'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import type { MayoristaProduct } from '@/lib/mayorista-products';

export default function MayoristaProductCard({ product }: { product: MayoristaProduct }) {
  const { add } = useMayoristaCart();
  const [added, setAdded] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const outOfStock = product.sizes.every(s => product.stock[s] === 'out');
  const images = product.images.length ? product.images : [product.image];
  const hasMultiple = images.length > 1;
  const singleSize = product.sizes.length === 1;
  const singleSizeLow = singleSize && product.stock[product.sizes[0]] === 'low';
  const singleSizeQty = singleSize ? product.stockQty[product.sizes[0]] : null;

  function handleAdd(size: string, e: React.MouseEvent) {
    e.preventDefault();
    if (product.stock[size] === 'out') return;
    add({ slug: product.slug, name: product.name, price: product.wholesalePrice, image: product.image, size, quantity: 1 });
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
        {outOfStock && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-foreground text-background">
            Sin stock
          </span>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={prevImg}
              aria-label="Foto anterior"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 text-foreground transition-colors hover:bg-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={nextImg}
              aria-label="Foto siguiente"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 text-foreground transition-colors hover:bg-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
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
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[13px] font-semibold">{formatArs(product.wholesalePrice)}</span>
          <span className="text-[12px] text-text-light line-through">{formatArs(product.regularPrice)}</span>
        </div>

        {/* Talle único (accesorios): banner de últimas unidades + un solo botón, sin pills */}
        {singleSize ? (
          <>
            {singleSizeLow && singleSizeQty != null && (
              <p className="mt-2 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-[6px] px-2 py-1">
                ⚠ Últimas {singleSizeQty} unidades
              </p>
            )}
            <button
              onClick={(e) => handleAdd(product.sizes[0], e)}
              disabled={outOfStock}
              className={`mt-2 w-full py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-[6px] transition-colors ${
                outOfStock ? 'bg-bg-alt text-text-light/60 cursor-not-allowed' :
                added === product.sizes[0] ? 'bg-bg-dark text-primary-foreground' :
                'bg-bg-dark text-primary-foreground hover:bg-bg-dark/85'
              }`}
            >
              {added === product.sizes[0] ? '✓ Agregado' : outOfStock ? 'Sin stock' : '+ Agregar'}
            </button>
          </>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.sizes.map((size) => {
              const isOut = product.stock[size] === 'out';
              const isLow = product.stock[size] === 'low';
              const qty = product.stockQty[size];
              return (
                <button
                  key={size}
                  onClick={(e) => handleAdd(size, e)}
                  disabled={isOut}
                  className={`min-w-[28px] px-1.5 py-1 text-[11px] rounded-[6px] border transition-colors flex flex-col items-center leading-tight ${
                    isOut ? 'border-border text-text-light/60 line-through cursor-not-allowed' :
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
