'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import { stockKey, type MayoristaProduct } from '@/lib/mayorista-products';

export default function MayoristaProductDetail({ product }: { product: MayoristaProduct }) {
  const router = useRouter();
  const { add } = useMayoristaCart();
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  // Un solo color cargado (ej. "Negra") no es una elección: va directo al pedido.
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0] : null);
  const [added, setAdded] = useState(false);

  const hasColors = product.colors.length > 0;
  const needsColor = hasColors && !color;
  const keyFor = (s: string) => stockKey(product, s, color);
  const selectedStock = size && !needsColor ? product.stock[keyFor(size)] : null;
  const selectedQty = size && !needsColor ? product.stockQty[keyFor(size)] : null;

  function handleAdd() {
    if (!size || needsColor || selectedStock === 'out') return;
    add({ slug: product.slug, name: product.name, price: product.wholesalePrice, image: product.image, size, ...(color ? { color } : {}), quantity: 1 });
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

          {hasColors && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Color{color && <span className="normal-case tracking-normal text-foreground"> — {color}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      // Con stock por color, el talle elegido puede no existir en el nuevo color.
                      if (product.colorAxis && size && product.stock[stockKey(product, size, c)] === 'out') setSize(null);
                    }}
                    className={`px-3 py-2 text-[13px] rounded-[8px] border transition-colors ${
                      color === c ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border-mid text-foreground/80 hover:border-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Talle</p>
            <div className={`flex flex-wrap gap-2 ${needsColor ? 'opacity-50' : ''}`}>
              {product.sizes.map((s) => {
                const isOut = !needsColor && product.stock[keyFor(s)] === 'out';
                const isLow = !needsColor && product.stock[keyFor(s)] === 'low';
                const qty = needsColor ? null : product.stockQty[keyFor(s)];
                return (
                  <button
                    key={s}
                    onClick={() => !isOut && !needsColor && setSize(s)}
                    disabled={isOut || needsColor}
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
            {needsColor && (
              <p className="mt-2 text-[12px] text-text-light">Elegí el color para ver los talles.</p>
            )}
            {size && selectedStock === 'low' && selectedQty != null && (
              <p className="mt-2 text-[12px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-[6px] px-2.5 py-1.5 inline-block">
                ⚠ Últimas {selectedQty} unidades en talle {size}
              </p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!size || needsColor || selectedStock === 'out'}
            className={`mt-8 w-full py-3 text-[12px] font-semibold uppercase tracking-wide rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              added ? 'bg-bg-dark/80 text-primary-foreground' : 'bg-bg-dark text-primary-foreground hover:bg-bg-dark/85'
            }`}
          >
            {added ? '✓ Agregado al pedido' : needsColor ? 'Elegí un color' : !size ? 'Elegí un talle' : selectedStock === 'out' ? 'Sin stock' : 'Agregar al pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
