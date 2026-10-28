'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc } from '@/lib/img';
import { useMayoristaDivisa } from '@/context/MayoristaDivisaContext';
import { useMayoristaPerfil } from '@/context/MayoristaPerfilContext';
import MayoristaDivisaNota from './MayoristaDivisaNota';
import { useMayoristaCart } from '@/context/MayoristaCartContext';
import { stockKey, canOrder, isPurchasable, type MayoristaProduct } from '@/lib/mayorista-products';
import { PROMO_TAG_LABEL } from '@/lib/mayorista-campaign-view';
import { WHATSAPP_URL } from '@/lib/mayorista-copy';
import MayoristaAddedNotice from './MayoristaAddedNotice';

// Tope del selector cuando el talle no tiene cantidad conocida.
const MAX_QTY = 99;

export default function MayoristaProductDetail({ product }: { product: MayoristaProduct }) {
  const { add } = useMayoristaCart();
  const { fmt } = useMayoristaDivisa();
  // Consignación: el precio de lista solo, como en la tienda. El 50% mayorista
  // no aplica y ni se nombra (lib/mayorista-consignacion.ts).
  const { consignacion } = useMayoristaPerfil();
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  // Un solo color cargado (ej. "Negra") no es una elección: va directo al pedido.
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  // Galería: destacada + galería de Woo (lib/mayorista-products.ts). Antes la
  // ficha mostraba una sola foto aunque la card tuviera carrusel.
  const images = product.images.length ? product.images : [product.image];
  const [imgIndex, setImgIndex] = useState(0);

  const hasColors = product.colors.length > 0;
  const needsColor = hasColors && !color;
  const keyFor = (s: string) => stockKey(product, s, color);
  const selectedStock = size && !needsColor ? product.stock[keyFor(size)] : null;
  const selectedQty = size && !needsColor ? product.stockQty[keyFor(size)] : null;
  // Próximamente / sin stock confirmado: se ve, no se pide (lib/mayorista-products.ts).
  const comingSoon = product.comingSoon;
  const purchasable = isPurchasable(product);
  const canAdd = !!size && !needsColor && canOrder(product, selectedStock ?? undefined);
  // Tope de cantidad: lo que hay del talle elegido (si Woo lo gestiona).
  const maxQty = typeof selectedQty === 'number' && selectedQty > 0 ? selectedQty : MAX_QTY;
  const unitPrice = consignacion ? product.regularPrice : (product.promo?.price ?? product.wholesalePrice);

  useEffect(() => { setQty(q => Math.min(q, maxQty)); }, [maxQty]);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), 6000);
    return () => clearTimeout(t);
  }, [added]);

  function handleAdd() {
    if (!size || !canAdd) return;
    const quantity = Math.max(1, Math.min(maxQty, Math.floor(qty) || 1));
    // Precio orientativo (promo si hay campaña): el servidor lo recalcula al confirmar.
    add({ slug: product.slug, name: product.name, price: unitPrice, image: product.image, size, ...(color ? { color } : {}), quantity });
    setAdded(`${quantity} × ${product.name} · Talle ${size}${color ? ` · ${color}` : ''}`);
  }

  const setQtyClamped = (n: number) => setQty(Math.max(1, Math.min(maxQty, Math.floor(n) || 1)));

  const buttonLabel = comingSoon ? 'Próximamente'
    : needsColor ? 'Elegí un color'
    : !size ? 'Elegí un talle'
    : selectedStock === 'out' ? 'Sin stock'
    : selectedStock === 'unconfirmed' ? 'Stock sin confirmar'
    : `Agregar ${qty > 1 ? `${qty} ` : ''}al pedido — ${fmt(unitPrice * qty)}`;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6">
      <Link href="/mayoristas" className="inline-flex items-center min-h-[44px] text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-2">
        ← Volver al catálogo
      </Link>

      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <div className="relative aspect-square rounded-[8px] overflow-hidden bg-bg-alt">
            {images[imgIndex] && (
              <Image src={imgSrc(images[imgIndex])} alt={`${product.name} — foto ${imgIndex + 1} de ${images.length}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-top" priority />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2" role="tablist" aria-label="Fotos del producto">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  role="tab"
                  aria-selected={i === imgIndex}
                  aria-label={`Foto ${i + 1}`}
                  onClick={() => setImgIndex(i)}
                  className={`relative aspect-square rounded-[6px] overflow-hidden bg-bg-alt border transition-colors ${i === imgIndex ? 'border-foreground' : 'border-transparent hover:border-border-mid'}`}
                >
                  <Image src={imgSrc(src)} alt="" fill sizes="20vw" className="object-cover object-top" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-light">{product.category}</p>
            {comingSoon ? (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] border border-border text-foreground">
                Próximamente
              </span>
            ) : product.drop && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-[6px] bg-bg-dark text-primary-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,55%)]" aria-hidden />
                Nuevo drop
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{product.name}</h1>
          {product.shortDescription && (
            <p className="text-[13px] text-text-light mt-1">{product.shortDescription}</p>
          )}

          {consignacion ? (
            <div className="mt-4">
              <p className="text-[24px] font-semibold">{fmt(product.regularPrice)}</p>
              <p className="text-[13px] text-text-light">Precio de lista: lo que cobrás en tu local.</p>
            </div>
          ) : product.promo ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] rounded-[6px] bg-sale text-sale-foreground">{product.promo.badge} · {product.promo.label}</span>
                <span className="text-[11px] uppercase tracking-wide text-text-light">{PROMO_TAG_LABEL[product.promo.tag]}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-[26px] font-semibold">{fmt(product.promo.price)}</p>
                <p className="text-[14px] text-text-light line-through">{fmt(product.wholesalePrice)}</p>
              </div>
              <p className="text-[12px] mt-1 text-sale">Ahorrás {fmt(product.promo.saving)} por unidad sobre tu precio mayorista.</p>
              <p className="text-[12px] text-text-light mt-0.5">Precio de lista {fmt(product.regularPrice)} · a lista, recargás {Math.round((product.regularPrice / product.promo.price - 1) * 100)}% sobre tu costo ({Math.round((1 - product.promo.price / product.regularPrice) * 100)}% de margen bruto)</p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-[24px] font-semibold">{fmt(product.wholesalePrice)}</p>
              <p className="text-[13px] text-text-light">Precio de lista {fmt(product.regularPrice)}</p>
              <p className="text-[12px] text-text-light mt-0.5">A precio de lista, recargás 100% sobre tu costo (50% de margen bruto).</p>
            </div>
          )}
          <MayoristaDivisaNota className="mt-2" />

          {!consignacion && product.retailPrice != null && (
            <p className="mt-2 inline-block text-[12px] rounded-[6px] border border-border px-2.5 py-1.5">
              En la tienda hoy <b>{fmt(product.retailPrice)}</b> (oferta): vendiendo a ese precio tu recargo es {Math.round((product.retailPrice / unitPrice - 1) * 100)}%.
            </p>
          )}

          {comingSoon ? (
            <div role="status" className="mt-6 rounded-[12px] border border-border p-4 text-[13px]">
              <p className="font-semibold">Todavía no se puede pedir.</p>
              <p className="text-text-light mt-1">Lo mostramos para que lo tengas en el radar: te avisamos cuando se abra el pedido.</p>
            </div>
          ) : !purchasable && (
            <div role="status" className="mt-6 rounded-[12px] border border-dashed border-foreground/40 p-4 text-[13px]">
              <p className="font-semibold">Stock sin confirmar.</p>
              <p className="text-text-light mt-1">Este modelo todavía no tiene la cantidad cargada en depósito, así que por ahora no se puede pedir.{' '}
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-foreground">Consultanos por WhatsApp</a>.
              </p>
            </div>
          )}

          {hasColors && !comingSoon && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Color{color && <span className="normal-case tracking-normal text-foreground"> — {color}</span>}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Color">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={color === c}
                    onClick={() => {
                      setColor(c);
                      // Con stock por color, el talle elegido puede no existir (o no poder pedirse) en el nuevo color.
                      if (product.colorAxis && size && !canOrder(product, product.stock[stockKey(product, size, c)])) setSize(null);
                    }}
                    className={`min-h-[44px] px-3 py-2 text-[13px] rounded-[8px] border transition-colors ${
                      color === c ? 'bg-bg-dark text-primary-foreground border-bg-dark' : 'border-border-mid text-foreground/80 hover:border-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!comingSoon && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Talle</p>
              <div className={`flex flex-wrap gap-2 ${needsColor ? 'opacity-50' : ''}`} role="group" aria-label="Talle">
                {product.sizes.map((s) => {
                  const level = needsColor ? null : product.stock[keyFor(s)];
                  const isOut = level === 'out';
                  const isUnconfirmed = level === 'unconfirmed';
                  const isLow = level === 'low';
                  const q = needsColor ? null : product.stockQty[keyFor(s)];
                  const blocked = isOut || isUnconfirmed || needsColor;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={size === s}
                      onClick={() => !blocked && setSize(s)}
                      disabled={blocked}
                      title={isUnconfirmed ? 'Stock sin confirmar' : undefined}
                      className={`min-w-[44px] min-h-[44px] px-3 py-2 text-[13px] rounded-[8px] border transition-colors ${
                        isOut ? 'border-border text-text-light/60 line-through cursor-not-allowed' :
                        isUnconfirmed ? 'border-dashed border-border text-text-light/60 cursor-not-allowed' :
                        size === s ? 'bg-bg-dark text-primary-foreground border-bg-dark' :
                        isLow ? 'border-orange-400/60 text-orange-600 hover:border-orange-500' :
                        'border-border-mid text-foreground/80 hover:border-foreground'
                      }`}
                    >
                      {s}
                      {isLow && q != null && <span className="block text-[9px] mt-0.5">¡{q}!</span>}
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
              {purchasable && product.sizes.some(s => !needsColor && product.stock[keyFor(s)] === 'unconfirmed') && (
                <p className="mt-2 text-[12px] text-text-light">Los talles punteados no tienen stock confirmado todavía.</p>
              )}
            </div>
          )}

          {/* Cantidad: un local pide de a varias unidades. Antes había que
              tocar "Agregar" una vez por unidad o ajustar en el carrito. */}
          {!comingSoon && purchasable && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Cantidad{typeof selectedQty === 'number' && selectedQty > 0 && <span className="normal-case tracking-normal text-foreground/60"> — hay {selectedQty} en talle {size}</span>}
              </p>
              <div className="inline-flex items-stretch rounded-[8px] border border-border-mid overflow-hidden">
                <button type="button" onClick={() => setQtyClamped(qty - 1)} disabled={qty <= 1 || !canAdd} aria-label="Una menos" className="w-11 min-h-[44px] text-[16px] hover:bg-bg-alt disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQty}
                  value={qty}
                  disabled={!canAdd}
                  aria-label="Cantidad"
                  onChange={(e) => setQtyClamped(Number(e.target.value))}
                  onBlur={(e) => setQtyClamped(Number(e.target.value))}
                  className="w-16 text-center text-[15px] font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40"
                />
                <button type="button" onClick={() => setQtyClamped(qty + 1)} disabled={qty >= maxQty || !canAdd} aria-label="Una más" className="w-11 min-h-[44px] text-[16px] hover:bg-bg-alt disabled:opacity-40 disabled:cursor-not-allowed">+</button>
              </div>
              {canAdd && qty >= maxQty && maxQty < MAX_QTY && (
                <p className="mt-2 text-[12px] text-text-light">Es todo lo que hay de este talle.</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="mt-8 w-full py-3 text-[12px] font-semibold uppercase tracking-wide rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-bg-dark text-primary-foreground hover:bg-bg-dark/85"
          >
            {buttonLabel}
          </button>
          {added && <MayoristaAddedNotice text={added} onClose={() => setAdded(null)} />}
        </div>
      </div>
    </div>
  );
}
