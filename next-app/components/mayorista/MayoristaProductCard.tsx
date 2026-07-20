'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import type { MayoristaProduct } from '@/lib/mayorista-products';

export default function MayoristaProductCard({ product }: { product: MayoristaProduct }) {
  const { add } = useMayoristaCart();
  const [added, setAdded] = useState<string | null>(null);

  const outOfStock = product.sizes.every(s => product.stock[s] === 'out');

  function handleAdd(size: string, e: React.MouseEvent) {
    e.preventDefault();
    if (product.stock[size] === 'out') return;
    add({ slug: product.slug, name: product.name, price: product.wholesalePrice, image: product.image, size, quantity: 1 });
    setAdded(size);
    setTimeout(() => setAdded(null), 1500);
  }

  return (
    <Link href={`/mayoristas/producto/${product.slug}`} className="group block">
      <div className="relative aspect-square rounded-[8px] overflow-hidden bg-bg-alt">
        {product.image && (
          <Image
            src={imgSrc(product.image)}
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
      </div>

      <div className="mt-3 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">{product.category}</p>
        <p className="text-[13px] font-medium leading-tight mt-0.5">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[13px] font-semibold">{formatArs(product.wholesalePrice)}</span>
          <span className="text-[12px] text-text-light line-through">{formatArs(product.regularPrice)}</span>
        </div>

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
                title={isLow && qty != null ? `Últimas ${qty} unidades` : undefined}
                className={`min-w-[28px] px-1.5 py-1 text-[11px] rounded-[6px] border transition-colors ${
                  isOut ? 'border-border text-text-light/60 line-through cursor-not-allowed' :
                  added === size ? 'border-bg-dark bg-bg-dark text-primary-foreground' :
                  isLow ? 'border-orange-400/60 text-orange-600 hover:border-orange-500' :
                  'border-border-mid text-foreground/70 hover:border-foreground'
                }`}
              >
                {added === size ? '✓' : size}
              </button>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
