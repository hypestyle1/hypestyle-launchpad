'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { useProduct } from '@/hooks/useProduct';
import { useProducts } from '@/hooks/useProducts';
import { checkStock } from '@/lib/checkStock';

function CareIcon({ type }: { type: string }) {
  const cls = 'w-[18px] h-[18px] flex-shrink-0 text-foreground/70';
  if (type === 'wash') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/><path d="M3 6l2-3h14l2 3"/><circle cx="12" cy="13" r="3"/>
    </svg>
  );
  if (type === 'no-dryer') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  if (type === 'iron-low') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14l2-6H9L5 17z"/><path d="M5 17l-2 2"/><circle cx="10" cy="13" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  );
  if (type === 'no-dry') return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  return null;
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-[13px] font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-lg font-light text-foreground/40 transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? '900px' : '0px' }}>
        <div className="pb-4 text-[13px] text-foreground/65 leading-relaxed whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}

const DEFAULT_SIZE_GUIDE = 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/zip-jpg-256058c042fec5f31817766351541988-1024-1024.jpg';

function SizeGuideModal({ onClose, image }: { onClose: () => void; image: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-[14px] font-bold uppercase tracking-wider">Guía de talles</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        </div>
        <div className="relative w-full">
          <Image src={image} alt="Guía de talles" width={520} height={600} className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}

function imgUrl(src: string): string {
  if (!src) return '';
  const s = src.replace('http://hypestyle.local', 'https://lightpink-rook-704850.hostingersite.com');
  return s.startsWith('http') ? s : `/${s}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&oacute;/g, 'ó').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ');
}

// Renderiza el modelInfo (HTML simple de Woo): párrafos + <strong> resaltado; ignora el resto.
function ModelInfo({ html }: { html: string }) {
  const paras = html.split(/<\/p>/i).map(p => p.replace(/<p[^>]*>/i, '').trim()).filter(Boolean);
  const blocks = paras.length ? paras : [html];
  return (
    <>
      {blocks.map((para, pi) => {
        const parts = para.split(/(<strong>[\s\S]*?<\/strong>)/i).filter(Boolean);
        return (
          <p key={pi} className={`text-[12px] text-foreground/70 ${pi > 0 ? 'mt-2' : ''}`}>
            {parts.map((part, i) => {
              const m = part.match(/^<strong>([\s\S]*?)<\/strong>$/i);
              const text = decodeEntities((m ? m[1] : part).replace(/<[^>]+>/g, ''));
              return m
                ? <strong key={i} className="font-bold text-foreground">{text}</strong>
                : <span key={i}>{text}</span>;
            })}
          </p>
        );
      })}
    </>
  );
}

export default function ProductoClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { formatPrice, currency } = useLocale();
  const { data: product, isLoading } = useProduct(slug);
  const { data: allProducts = [] } = useProducts(20);
  const related = useMemo(() => {
    if (!product) return [];
    return [...allProducts.filter(p => p.slug !== product.slug)]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
  }, [allProducts, product?.slug]);

  const [mounted, setMounted]               = useState(false);
  const [selectedImage, setSelectedImage]   = useState(0);
  const [selectedColor, setSelectedColor]   = useState('');
  const [selectedSize, setSelectedSize]     = useState<string | null>(null);
  const [sizeError, setSizeError]           = useState(false);
  const [stockError, setStockError]         = useState(false);
  const [stockChecking, setStockChecking]   = useState(false);
  const [liveOutSizes, setLiveOutSizes]     = useState<Set<string>>(new Set());
  const [added, setAdded]                   = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen]   = useState(false);
  const [showSticky, setShowSticky]         = useState(false);
  const [zoomPos, setZoomPos]               = useState<{ x: number; y: number } | null>(null);
  const [canHover, setCanHover]             = useState(false);
  const [isGalleryOpen, setIsGalleryOpen]   = useState(false);
  const [galleryZoom, setGalleryZoom]       = useState(1);
  const [galleryOffset, setGalleryOffset]   = useState({ x: 0, y: 0 });

  const touchStartX  = useRef<number | null>(null);
  const panStartRef  = useRef<{ x: number; y: number; offX: number; offY: number } | null>(null);
  const didPanRef    = useRef(false);
  const addBtnRef    = useRef<HTMLButtonElement>(null);
  const { add, setDrawerOpen } = useCart();

  useEffect(() => { setMounted(true); }, []);

  // El zoom de hover (scale 2x) es solo para desktop con mouse. En táctiles el navegador
  // sintetiza un "hover" al tocar y disparaba un zoom que recortaba la foto.
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (product) {
      // Color del producto actual (no siempre el primero del colorway)
      const current = product.colors.find(c => c.slug === product.slug) ?? product.colors[0];
      setSelectedColor(current.label);
      setSelectedImage(0);
      // auto-select if only one size (talle único)
      setSelectedSize(product.sizes.length === 1 ? product.sizes[0] : null);
    }
  }, [product?.slug]);

  useEffect(() => {
    const el = addBtnRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isLoading && !product) return (
    <><AnnouncementBar /><Navbar />
    <main className="pt-[var(--offset)] flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </main><Footer /></>
  );

  if (!product) return (
    <><AnnouncementBar /><Navbar />
    <main className="pt-[var(--offset)] flex flex-col items-center justify-center min-h-[60vh]">
      <p className="text-[14px] text-muted-foreground mb-4">Producto no encontrado.</p>
      <button onClick={() => router.push('/')} className="text-[12px] underline hover:text-foreground transition-colors">Volver al inicio</button>
    </main><Footer /></>
  );

  // Galería: para productos personalizables sumamos al final muestras del dorsal.
  const galleryImages = product.customizable
    ? [...product.images, 'products/argentina-jersey/preview-sample-espalda.png', 'products/argentina-jersey/preview-sample-frente.png']
    : product.images;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) setSelectedImage(p => Math.min(p + 1, galleryImages.length - 1));
    else setSelectedImage(p => Math.max(p - 1, 0));
    touchStartX.current = null;
  };

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    didPanRef.current = false;
    if (galleryZoom > 1) {
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, offX: galleryOffset.x, offY: galleryOffset.y };
    } else {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleGalleryTouchMove = (e: React.TouchEvent) => {
    if (galleryZoom <= 1 || !panStartRef.current) return;
    const rawDx = e.touches[0].clientX - panStartRef.current.x;
    const rawDy = e.touches[0].clientY - panStartRef.current.y;
    if (Math.abs(rawDx) > 5 || Math.abs(rawDy) > 5) didPanRef.current = true;
    const dx = rawDx / galleryZoom;
    const dy = rawDy / galleryZoom;
    const maxX = (window.innerWidth * (galleryZoom - 1)) / (2 * galleryZoom);
    const maxY = (window.innerHeight * (galleryZoom - 1)) / (2 * galleryZoom);
    setGalleryOffset({
      x: Math.max(-maxX, Math.min(maxX, panStartRef.current.offX + dx)),
      y: Math.max(-maxY, Math.min(maxY, panStartRef.current.offY + dy)),
    });
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (galleryZoom > 1) { panStartRef.current = null; return; }
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 40) { touchStartX.current = null; return; }
    if (delta > 0) setSelectedImage(p => Math.min(p + 1, galleryImages.length - 1));
    else setSelectedImage(p => Math.max(p - 1, 0));
    touchStartX.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canHover) return; // sin mouse real (táctil) no hay zoom de hover
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const transferRate  = 10;
  const transferPrice = Math.round(product.price * (1 - transferRate / 100));

  const handleAdd = async () => {
    if (!selectedSize) { setSizeError(true); return; }
    setSizeError(false); setStockError(false); setStockChecking(true);
    const result = await checkStock(product.id, selectedSize);
    setStockChecking(false);
    if (result === 'out') { setLiveOutSizes(prev => new Set([...prev, selectedSize])); setStockError(true); return; }
    add({ id: product.id, name: product.name, price: product.price, image: imgUrl(galleryImages[0]), size: selectedSize, quantity: 1 });
    setAdded(true);
  };

  const toggleGalleryZoom = () => {
    if (didPanRef.current) { didPanRef.current = false; return; }
    if (galleryZoom > 1) {
      setGalleryZoom(1);
      setGalleryOffset({ x: 0, y: 0 });
    } else {
      setGalleryZoom(2.5);
    }
  };

  const stockLabel = selectedSize ? product.stock[selectedSize] : null;
  const isColorVariant = !!product.colorVariant;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">Inicio</a>
            {' / '}
            <a href="/productos/" className="hover:text-foreground transition-colors">Shop</a>
            {' / '}
            <span className="text-foreground">{product.name}</span>
          </p>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

            {/* Gallery */}
            <div className="flex gap-3">
              <div className="hidden md:flex flex-col gap-2 w-[72px] flex-shrink-0">
                {galleryImages.map((img, i) => (
                  <button key={img} onClick={() => setSelectedImage(i)}
                    className={`relative w-full aspect-square overflow-hidden border-[1.5px] transition-colors ${i === selectedImage ? 'border-foreground' : 'border-transparent'}`}>
                    <Image src={imgUrl(img)} alt="" fill sizes="72px" className="object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden bg-bg-alt select-none cursor-crosshair"
                  onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
                  onMouseMove={handleMouseMove} onMouseLeave={() => setZoomPos(null)}
                  onClick={() => { if (window.innerWidth < 1024) setIsGalleryOpen(true); }}>
                  <Image key={selectedImage} src={imgUrl(galleryImages[selectedImage])} alt={product.name}
                    fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"
                    style={{ transform: zoomPos ? 'scale(2)' : 'scale(1)', transformOrigin: zoomPos ? `${zoomPos.x}% ${zoomPos.y}%` : 'center', transition: zoomPos ? 'transform 0.1s ease' : 'transform 0.3s ease', animation: 'fadeIn 0.25s ease' }} />
                  {selectedImage > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(p => p - 1); }}
                      className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm" aria-label="Anterior">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3L5 8l5 5" /></svg>
                    </button>
                  )}
                  {selectedImage < galleryImages.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(p => p + 1); }}
                      className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm" aria-label="Siguiente">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3l5 5-5 5" /></svg>
                    </button>
                  )}
                  <span className="md:hidden absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
                    {selectedImage + 1} / {galleryImages.length}
                  </span>
                  {!zoomPos && (
                    <span className="hidden md:block absolute bottom-3 left-3 text-[10px] text-white bg-black/35 backdrop-blur-sm px-2 py-0.5 pointer-events-none">
                      Passá el cursor para hacer zoom
                    </span>
                  )}
                  <span className="md:hidden absolute bottom-3 left-3 text-[10px] text-white bg-black/35 backdrop-blur-sm px-2 py-0.5 pointer-events-none">
                    Tocá para ampliar
                  </span>
                </div>
                <div className="md:hidden flex items-center justify-center gap-1.5">
                  {galleryImages.map((_, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`transition-all duration-200 rounded-full ${i === selectedImage ? 'w-4 h-1.5 bg-foreground' : 'w-1.5 h-1.5 bg-foreground/25'}`}
                      aria-label={`Imagen ${i + 1}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{product.category}</p>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-3">{product.name}</h1>
              <div className="mb-1">
                <div className="flex items-center gap-3">
                  <span className="text-[22px] font-bold text-foreground">
                    {mounted ? formatPrice(product.price) : '—'}
                  </span>
                  {product.originalPrice && mounted && (
                    <span className="text-[16px] text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
                {mounted && currency === 'ARS' && (
                  <>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      O <span className="font-semibold text-foreground">{formatPrice(transferPrice)}</span> con Transferencia o depósito bancario{' '}
                      <span className="text-green-700 font-semibold">(+{transferRate}% off)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      O hasta 3 cuotas sin interés de {formatPrice(Math.round(product.price / 3))}
                    </p>
                  </>
                )}
              </div>

              {product.modelInfo && (
                <div className="bg-[#f8f8f6] border border-border px-5 py-5 mt-3 mb-4 rounded-[10px]">
                  <ModelInfo html={product.modelInfo} />
                </div>
              )}

              {product.colors.length > 1 && (
                <div className="mb-4 mt-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[12px] font-semibold uppercase tracking-wider">Color</span>
                    <span className="text-[12px] text-muted-foreground">— {selectedColor}</span>
                  </div>
                  <div className="flex gap-2">
                    {product.colors.map(c => (
                      <button key={c.label}
                        onClick={() => c.slug && c.slug !== product.slug ? router.push(`/producto/${c.slug}/`) : setSelectedColor(c.label)}
                        title={c.label}
                        className={`relative w-[44px] h-[44px] overflow-hidden border transition-colors duration-150 rounded-[5px] ${selectedColor === c.label || c.slug === product.slug ? 'border-foreground' : 'border-border hover:border-foreground/40'}`}>
                        {c.image && <Image src={imgUrl(c.image)} alt={c.label} fill sizes="44px" className="object-cover" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.category !== 'Accesorio' && (
                <div className="flex items-center gap-2 mb-4">
                  {isColorVariant ? (
                    <>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Talle</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] border border-border px-2.5 py-1 rounded-[10px]">Único</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Fit</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] border border-border px-2.5 py-1 rounded-[10px]">{product.fit}</span>
                    </>
                  )}
                </div>
              )}

              <div className="border-t border-border mb-4" />

              {product.sizes.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wider">
                    {isColorVariant ? 'Color' : 'Talle'} {selectedSize && <span className="font-bold">— {selectedSize}</span>}
                  </span>
                  <button onClick={() => setSizeGuideOpen(true)}
                    className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors">
                    Guía de talles
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map(s => {
                    const st = product.stock[s];
                    const isOut = st === 'out' || liveOutSizes.has(s);
                    return (
                      <button key={s} disabled={isOut}
                        onClick={() => { setSelectedSize(s); setSizeError(false); setStockError(false); }}
                        className={`relative px-4 py-2 text-[12px] font-semibold uppercase border transition-colors rounded-[10px] ${
                          isOut ? 'border-border text-foreground/25 cursor-not-allowed'
                          : selectedSize === s ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground'
                        }`}>
                        {s}
                        {isOut && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <line x1="10" y1="90" x2="90" y2="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {stockLabel === 'low' && !liveOutSizes.has(selectedSize!) && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1.5">Últimas unidades disponibles</p>
                )}
                {(stockLabel === 'out' || liveOutSizes.has(selectedSize!)) && (
                  <p className="text-[11px] text-destructive mt-1.5">{isColorVariant ? 'Color agotado' : 'Talle agotado'}</p>
                )}
                {stockError && <p className="text-[11px] text-destructive mt-1">{isColorVariant ? 'Este color ya no tiene stock disponible' : 'Este talle ya no tiene stock disponible'}</p>}
                {sizeError && !stockError && <p className="text-[11px] text-destructive mt-1">{isColorVariant ? 'Seleccioná un color para continuar' : 'Seleccioná un talle para continuar'}</p>}
              </div>
              )}

              {/* Talle único: muestra la equivalencia y el link a la guía de talles */}
              {product.sizes.length === 1 && !isColorVariant && (
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wider">
                      Talle <span className="font-bold">— Único{product.sizeEquivalent ? ` · equivale a un ${product.sizeEquivalent}` : ''}</span>
                    </span>
                    <button onClick={() => setSizeGuideOpen(true)}
                      className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors">
                      Guía de talles
                    </button>
                  </div>
                </div>
              )}

              {product.customizable && (
                <button
                  onClick={() => router.push(`/personalizar/${product.slug}/${selectedSize ? `?talle=${selectedSize}` : ''}`)}
                  className="flex items-center gap-4 w-full border-2 border-foreground px-4 py-3 mb-3 rounded-[10px] hover:bg-foreground hover:text-background transition-colors group text-left">
                  <Image src="/products/argentina-jersey/preview-sample-espalda.png" alt="Ejemplo de dorsal personalizado" width={64} height={64}
                    className="w-16 h-16 object-cover rounded-[8px] bg-white flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-background/60 transition-colors">Edición especial</p>
                    <p className="text-[14px] font-bold uppercase tracking-[0.06em]">Personalizá tu dorsal</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-background/70 transition-colors mt-0.5">Tu nombre y número — vista previa en tiempo real</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0"><path d="M4 9h10M9 4l5 5-5 5" /></svg>
                </button>
              )}

              <button ref={addBtnRef} onClick={handleAdd} disabled={stockChecking}
                className="w-full bg-bg-dark text-primary-foreground py-4 text-[13px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors mb-4 rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {stockChecking ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>Verificando stock...</>
                ) : 'Agregar al carrito'}
              </button>

              <div className="border-b border-border">
                <Accordion title="Descripción">{product.description}</Accordion>
                {product.measurements && (
                  <Accordion title="Calce y medidas">
                    <p className="font-semibold text-foreground">Medidas de la prenda</p>
                    <div className="mt-1.5 space-y-1">
                      {product.measurements.ancho && <div className="flex justify-between max-w-[220px]"><span>Ancho (axila a axila)</span><span className="font-medium text-foreground">{product.measurements.ancho} cm</span></div>}
                      {product.measurements.largo && <div className="flex justify-between max-w-[220px]"><span>Largo (hombro a ruedo)</span><span className="font-medium text-foreground">{product.measurements.largo} cm</span></div>}
                      {product.measurements.manga && <div className="flex justify-between max-w-[220px]"><span>Manga</span><span className="font-medium text-foreground">{product.measurements.manga} cm</span></div>}
                    </div>
                    <p className="text-[11px] text-foreground/45 mt-1.5">Medido en plano · puede variar ±2 cm.</p>

                    <p className="font-semibold text-foreground mt-4">Cómo calza según tu altura</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-2"><span className="text-foreground font-medium w-[52px]">1,70 m</span><span>fit oversize amplio</span></div>
                      <div className="flex gap-2"><span className="text-foreground font-medium w-[52px]">1,80 m</span><span>fit oversize estándar</span></div>
                      <div className="flex gap-2"><span className="text-foreground font-medium w-[52px]">1,90 m</span><span>fit regular</span></div>
                    </div>

                    <p className="text-[12px] mt-4">Tip: compará estas medidas con una remera oversize que ya tengas y te quede como buscás.</p>
                  </Accordion>
                )}
                <Accordion title="Guía de cuidado de ropa">
                  <ul className="space-y-2.5">
                    {product.careItems.map(item => (
                      <li key={item.icon} className="flex items-center gap-3">
                        <CareIcon type={item.icon} />
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </Accordion>
                <Accordion title="Envíos y devoluciones">
                  <p className="font-semibold text-foreground">Procesamiento</p>
                  <p>Preparamos y despachamos tu pedido una vez confirmado el pago. Los fines de semana y feriados no se cuentan como días hábiles.</p>

                  <p className="font-semibold text-foreground mt-3">Envíos en Argentina</p>
                  <p>A todo el país vía Andreani; el costo se calcula en el checkout. El tiempo de entrega estimado es de 5 a 10 días hábiles, y en algunos casos puede extenderse hasta 15 días hábiles según la zona y la demanda.</p>

                  <p className="font-semibold text-foreground mt-3">Preventa</p>
                  <p>Los productos en PREVENTA se despachan según la fecha estimada indicada en la página del producto y pueden demorar algo más de lo estipulado. Si tu compra incluye un producto en preventa, el pedido se envía completo cuando esté disponible.</p>

                  <p className="font-semibold text-foreground mt-3">Envíos internacionales</p>
                  <p>Enviamos a todo el mundo vía DHL Express. El costo final se coordina por email después de la compra. Pueden aplicar impuestos o aranceles aduaneros según el país de destino.</p>

                  <p className="font-semibold text-foreground mt-3">Cambios y devoluciones</p>
                  <p>Aceptamos cambios hasta 30 días desde la compra. El producto debe estar sin uso, con etiquetas y en su empaque original.</p>

                  <a href="/politicas-de-devolucion/" className="underline text-foreground hover:text-foreground/70 transition-colors mt-3 block">Ver políticas completas →</a>
                </Accordion>
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-[1400px] mx-auto px-4 pb-20">
          <h2 className="text-lg font-bold uppercase tracking-tight mb-6">Completa el Look</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {related.map(p => (
              <ProductCard key={p.slug} {...p} />
            ))}
          </div>
        </section>
      </main>
      <Footer />

      {/* Sticky mobile bar */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border px-4 py-3 flex items-center gap-3 transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold truncate">{product.name}</p>
          <p className="text-[11px] text-muted-foreground">{mounted ? formatPrice(product.price) : '—'}{selectedSize && <span> · Talle {selectedSize}</span>}</p>
        </div>
        <button onClick={handleAdd} disabled={stockChecking}
          className="flex-shrink-0 bg-bg-dark text-primary-foreground px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] hover:bg-bg-dark/85 transition-colors rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
          {stockChecking && <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>}
          Agregar
        </button>
      </div>

      {/* Size guide */}
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} image={product.sizeGuideImage || DEFAULT_SIZE_GUIDE} />}

      {/* Added to cart popup */}
      {added && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/30" onClick={() => setAdded(false)}>
          <div className="bg-white w-full max-w-[480px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <div className="relative w-14 h-16 bg-bg-alt overflow-hidden flex-shrink-0">
                <Image src={imgUrl(galleryImages[0])} alt={product.name} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold">{product.name}</p>
                <p suppressHydrationWarning className="text-[11px] text-muted-foreground mt-0.5">Talle: {selectedSize} · {formatPrice(product.price)}</p>
              </div>
              <button onClick={() => setAdded(false)} className="text-foreground/30 hover:text-foreground transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 12M13 1L1 13" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <button onClick={() => { setAdded(false); setDrawerOpen(true); }}
                className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.08em] hover:bg-bg-dark/85 transition-colors rounded-[10px]">
                Ver carrito
              </button>
              <button onClick={() => setAdded(false)}
                className="w-full text-center text-[12px] text-foreground/40 hover:text-foreground transition-colors py-1">
                Ignorar y continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full screen mobile gallery */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in duration-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 text-white z-10">
            <span className="text-[12px] font-medium uppercase tracking-widest">
              {selectedImage + 1} / {galleryImages.length}
            </span>
            <button onClick={() => { setIsGalleryOpen(false); setGalleryZoom(1); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center"
            style={{ touchAction: galleryZoom > 1 ? 'none' : 'pan-y', cursor: galleryZoom > 1 ? 'grab' : 'zoom-in' }}
            onTouchStart={handleGalleryTouchStart}
            onTouchMove={handleGalleryTouchMove}
            onTouchEnd={handleGalleryTouchEnd}
            onClick={toggleGalleryZoom}>
            <div className="relative w-full h-full"
                 style={{ transform: `scale(${galleryZoom}) translate(${galleryOffset.x}px, ${galleryOffset.y}px)` }}>
              <Image
                src={imgUrl(galleryImages[selectedImage])}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Overlay controls - only show when not zoomed */}
            {galleryZoom === 1 && (
              <>
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                  {selectedImage > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(p => p - 1); }}
                      className="pointer-events-auto w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg transition-transform active:scale-95" aria-label="Anterior">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                  )}
                  <div />
                  {selectedImage < galleryImages.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedImage(p => p + 1); }}
                      className="pointer-events-auto w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg transition-transform active:scale-95" aria-label="Siguiente">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                  )}
                </div>

                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                  <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] mb-2">Deslizá para navegar</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.1em]">Tocá para hacer zoom</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
