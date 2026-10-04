'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PrivateProductCard from './PrivateProductCard';
import { useLocale } from '@/context/LocaleContext';
import { PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import type { PrivateProduct } from '@/lib/private-access/normalize';
import { paTrack } from '@/lib/private-access/analytics';
import { gaViewItem } from '@/lib/ga';
import { fbViewContent } from '@/lib/fbpixel';
import { usePrivateAddToCart } from './usePrivateAddToCart';
import './private-access.css';

interface Props {
  product: PrivateProduct;
  related: PrivateProduct[];
  collectionName: string;
  discountPct: number;
  saleEndsLabel: string;
}

/**
 * Ficha de un producto de la colección privada. Misma estructura que la ficha
 * pública (galería a la izquierda, info a la derecha, relacionados abajo),
 * con el precio de Mejores Amigos y el aviso de preventa.
 */
export default function PrivateProductView({ product, related, collectionName, discountPct, saleEndsLabel }: Props) {
  const { formatPrice } = useLocale();
  const { addToCart, checking } = usePrivateAddToCart();
  const [img, setImg] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [sizeError, setSizeError] = useState(false);
  const [stockError, setStockError] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveOut, setLiveOut] = useState<Set<string>>(new Set());

  const images = product.images.filter(Boolean).length ? product.images.filter(Boolean) : [product.image];
  const pct = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const stockLabel = size ? product.stock[size] : null;
  const isOut = (s: string) => product.stock[s] === 'out' || liveOut.has(s);

  useEffect(() => {
    paTrack('private_product_view', { item_id: product.slug, value: product.price, currency: 'ARS' });
    gaViewItem({ item_id: product.slug, item_name: product.name, item_category: product.category, price: product.price });
    fbViewContent({ id: product.slug, name: product.name, price: product.price, category: product.category });
  }, [product.slug, product.name, product.price, product.category]);

  async function add() {
    if (!size) { setSizeError(true); return; }
    if (checking) return;
    const r = await addToCart(product, size);
    if (r === 'out') { setLiveOut(prev => new Set([...prev, size])); setStockError(true); setSize(null); return; }
    if (r !== 'added') return;
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
            {' / '}
            <Link href={PRIVATE_ACCESS_PATH} className="hover:text-foreground transition-colors">Private Access</Link>
            {' / '}
            <span className="text-foreground">{product.name}</span>
          </p>
          <span className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground" aria-hidden />
            Private
          </span>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Galería */}
            <div className="flex gap-3">
              <div className="hidden md:flex flex-col gap-2 w-[72px] flex-shrink-0">
                {images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setImg(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    aria-current={i === img}
                    className={`relative w-full aspect-square overflow-hidden border-[1.5px] transition-colors ${i === img ? 'border-foreground' : 'border-transparent'}`}
                  >
                    <Image src={src} alt="" fill sizes="72px" className="object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden bg-bg-alt select-none">
                  <Image key={img} src={images[img]} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" style={{ animation: 'fadeIn 0.25s ease' }} />
                  {pct > 0 && (
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[6px] bg-sale text-sale-foreground">−{pct}%</span>
                  )}
                  {img > 0 && (
                    <button onClick={() => setImg(i => i - 1)} aria-label="Anterior" className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {img < images.length - 1 && (
                    <button onClick={() => setImg(i => i + 1)} aria-label="Siguiente" className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <ChevronRight size={16} />
                    </button>
                  )}
                  <span className="md:hidden absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
                    {img + 1} / {images.length}
                  </span>
                </div>
                <div className="md:hidden flex items-center justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImg(i)} aria-label={`Imagen ${i + 1}`} className={`transition-all duration-200 rounded-full ${i === img ? 'w-4 h-1.5 bg-foreground' : 'w-1.5 h-1.5 bg-foreground/25'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <p className="text-[11px] tracking-[0.02em] text-muted-foreground mb-1">{product.category} · {collectionName}</p>
              <h1 className="text-[22px] md:text-[26px] font-semibold tracking-[-0.01em] mb-3">{product.name}</h1>

              <div className="flex items-center gap-3">
                <span suppressHydrationWarning className="text-[22px] font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span suppressHydrationWarning className="text-[16px] text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                Precio Mejores Amigos · <span className="text-foreground font-semibold">{discountPct}% off</span> hasta el {saleEndsLabel}
              </p>
              <p suppressHydrationWarning className="text-[11px] text-muted-foreground mt-0.5">
                O hasta 3 cuotas sin interés de {formatPrice(Math.round(product.price / 3))}
              </p>

              <div className="mt-7">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Talle</span>
                  <button className="text-[11px] text-muted-foreground underline underline-offset-4 decoration-foreground/30 hover:text-foreground transition-colors">Guía de talles</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => {
                    const out = isOut(s);
                    const sel = size === s;
                    return (
                      <button
                        key={s}
                        onClick={() => { if (!out) { setSize(s); setSizeError(false); setStockError(false); } }}
                        disabled={out}
                        aria-pressed={sel}
                        className={`min-w-[52px] h-11 px-3 text-[12px] font-medium border transition-colors ${
                          out ? 'border-border text-foreground/25 line-through cursor-not-allowed' :
                          sel ? 'border-foreground bg-foreground text-background' :
                          'border-border-mid hover:border-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div className="min-h-[18px] mt-2">
                  {sizeError && <p className="text-[12px] text-destructive">Elegí un talle para continuar.</p>}
                  {stockError && !sizeError && <p className="text-[12px] text-destructive">Ese talle se acaba de agotar. Elegí otro.</p>}
                  {!sizeError && stockLabel === 'low' && <p className="text-[12px] text-amber-700">Últimas unidades en {size}.</p>}
                </div>
              </div>

              <button
                onClick={add}
                className={`mt-4 h-[52px] w-full rounded-[10px] text-[12px] font-bold uppercase tracking-[0.2em] transition-colors ${added ? 'bg-green-700 text-white' : 'bg-bg-dark text-white hover:bg-bg-dark/85'}`}
              >
                {checking ? 'Verificando stock…' : added ? '✓ Agregado' : 'Agregar al carrito'}
              </button>
              <p className="mt-3 text-[11px] text-muted-foreground text-center">Envío a todo el país · Cambios sin cargo dentro de los 30 días</p>

              {product.description && <p className="mt-8 text-[14px] leading-relaxed text-foreground/80 whitespace-pre-line">{product.description}</p>}

              <div className="mt-6 border-t border-border">
                {product.details.map(d => (
                  <details key={d.label} className="group border-b border-border">
                    <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-[12px] font-semibold uppercase tracking-[0.12em]">
                      {d.label}
                      <span className="text-[16px] font-normal text-muted-foreground transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="pb-4 text-[13px] leading-relaxed text-foreground/75">{d.text}</p>
                  </details>
                ))}
              </div>

              <Link href={PRIVATE_ACCESS_PATH} className="mt-8 inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors self-start">
                <ChevronLeft size={14} /> Volver a la colección
              </Link>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-16 md:mt-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.01em] leading-none">Más de {collectionName}</h2>
                <Link href={PRIVATE_ACCESS_PATH} className="text-[12px] underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground transition-colors">Ver todo</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-[2px]">
                {related.slice(0, 4).map(p => <PrivateProductCard key={p.slug} product={p} compact />)}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
