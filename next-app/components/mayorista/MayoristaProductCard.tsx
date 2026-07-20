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
    <Link href={`/mayoristas/producto/${product.slug}`} className="group block border border-white/10 hover:border-white/30 transition-colors">
      <div className="relative aspect-square bg-white/5 overflow-hidden">
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
          <span className="absolute top-2 left-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider bg-white text-black">
            Sin stock
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40">{product.category}</p>
        <p className="text-[13px] font-medium leading-tight mt-0.5">{product.name}</p>
        <p className="text-[14px] font-semibold mt-1">{formatArs(product.wholesalePrice)}</p>
        <p className="text-[10px] text-white/30 line-through">{formatArs(product.regularPrice)}</p>

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
                className={`min-w-[28px] px-1.5 py-1 text-[11px] border transition-colors ${
                  isOut ? 'border-white/10 text-white/20 line-through cursor-not-allowed' :
                  added === size ? 'border-white bg-white text-black' :
                  isLow ? 'border-orange-400/60 text-orange-300 hover:border-orange-300' :
                  'border-white/25 text-white/80 hover:border-white'
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
