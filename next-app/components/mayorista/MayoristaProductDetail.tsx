'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import type { MayoristaProduct } from '@/lib/mayorista-products';

export default function MayoristaProductDetail({ product }: { product: MayoristaProduct }) {
  const router = useRouter();
  const { add } = useMayoristaCart();
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [added, setAdded] = useState(false);

  const selectedStock = size ? product.stock[size] : null;
  const selectedQty = size ? product.stockQty[size] : null;

  function handleAdd() {
    if (!size || selectedStock === 'out') return;
    add({ slug: product.slug, name: product.name, price: product.wholesalePrice, image: product.image, size, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6">
      <button onClick={() => router.back()} className="text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-6">
        ← Volver al catálogo
      </button>

      <div className="grid sm:grid-cols-2 gap-8">
        <div className="relative aspect-square rounded-[8px] overflow-hidden bg-bg-alt">
          {product.image && (
            <Image src={imgSrc(product.image)} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top" />
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-light">{product.category}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{product.name}</h1>
          {product.shortDescription && (
            <p className="text-[13px] text-text-light mt-1">{product.shortDescription}</p>
          )}

          <div className="mt-4">
            <p className="text-[24px] font-semibold">{formatArs(product.wholesalePrice)}</p>
            <p className="text-[13px] text-text-light line-through">precio de lista {formatArs(product.regularPrice)}</p>
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Talle</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const isOut = product.stock[s] === 'out';
                const isLow = product.stock[s] === 'low';
                const qty = product.stockQty[s];
                return (
                  <button
                    key={s}
                    onClick={() => !isOut && setSize(s)}
                    disabled={isOut}
                    className={`min-w-[44px] px-3 py-2 text-[13px] rounded-[8px] border transition-colors ${
                      isOut ? 'border-border text-text-light/60 line-through cursor-not-allowed' :
                      size === s ? 'bg-bg-dark text-primary-foreground border-bg-dark' :
                      isLow ? 'border-orange-400/60 text-orange-600 hover:border-orange-500' :
                      'border-border-mid text-foreground/80 hover:border-foreground'
                    }`}
                  >
                    {s}
                    {isLow && qty != null && <span className="block text-[9px] mt-0.5">¡{qty}!</span>}
                  </button>
                );
              })}
            </div>
            {size && selectedStock === 'low' && selectedQty != null && (
              <p className="mt-2 text-[12px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-[6px] px-2.5 py-1.5 inline-block">
                ⚠ Últimas {selectedQty} unidades en talle {size}
              </p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!size || selectedStock === 'out'}
            className={`mt-8 w-full py-3 text-[12px] font-semibold uppercase tracking-wide rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              added ? 'bg-bg-dark/80 text-primary-foreground' : 'bg-bg-dark text-primary-foreground hover:bg-bg-dark/85'
            }`}
          >
            {added ? '✓ Agregado al pedido' : !size ? 'Elegí un talle' : selectedStock === 'out' ? 'Sin stock' : 'Agregar al pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
