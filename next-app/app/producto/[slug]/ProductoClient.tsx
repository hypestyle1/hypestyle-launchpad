'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { getRelated } from '@/data/products';
import { useProduct } from '@/hooks/useProduct';
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
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? '400px' : '0px' }}>
        <div className="pb-4 text-[13px] text-foreground/65 leading-relaxed whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}

const sizeChart = [
  { size: 'XS', pecho: '84–88', cintura: '66–70', cadera: '90–94' },
  { size: 'S',  pecho: '88–92', cintura: '70–74', cadera: '94–98' },
  { size: 'M',  pecho: '92–96', cintura: '74–78', cadera: '98–102' },
  { size: 'L',  pecho: '96–100', cintura: '78–82', cadera: '102–106' },
  { size: 'XL', pecho: '100–104', cintura: '82–86', cadera: '106–110' },
];

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-[14px] font-bold uppercase tracking-wider">Guía de talles</h2>
          <button onClick={onClose} className="text-foreground/30 hover:text-foreground transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 bg-[#f8f8f6] border-b border-border space-y-1">
          <p className="text-[12px] text-foreground/70"><span className="font-semibold text-foreground">Modelo (hombre)</span> — 1.80m de altura, talle <span className="font-semibold">M</span></p>
          <p className="text-[12px] text-foreground/70"><span className="font-semibold text-foreground">Modelo (mujer)</span> — 1.68m de altura, talle <span className="font-semibold">S</span></p>
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">Medidas en centímetros</p>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-border">
              <th className="text-left pb-2 font-semibold text-[11px] uppercase tracking-wider">Talle</th>
              <th className="text-center pb-2 font-semibold text-[11px] uppercase tracking-wider">Pecho</th>
              <th className="text-center pb-2 font-semibold text-[11px] uppercase tracking-wider">Cintura</th>
              <th className="text-center pb-2 font-semibold text-[11px] uppercase tracking-wider">Cadera</th>
            </tr></thead>
            <tbody>{sizeChart.map((row, i) => (
              <tr key={row.size} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-[#f8f8f6]'}`}>
                <td className="py-2.5 font-bold">{row.size}</td>
                <td className="py-2.5 text-center text-muted-foreground">{row.pecho}</td>
                <td className="py-2.5 text-center text-muted-foreground">{row.cintura}</td>
                <td className="py-2.5 text-center text-muted-foreground">{row.cadera}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">Las medidas son del cuerpo, no de la prenda. Si estás entre dos talles, te recomendamos el más grande.</p>
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

export default function ProductoClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { formatPrice, currency } = useLocale();
  const { data: product, isLoading } = useProduct(slug);
  const related = product ? getRelated(product.slug) : [];

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

  const touchStartX = useRef<number | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const { add, setDrawerOpen } = useCart();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (product) { setSelectedColor(product.colors[0].label); setSelectedImage(0); setSelectedSize(null); }
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

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) setSelectedImage(p => Math.min(p + 1, product.images.length - 1));
    else setSelectedImage(p => Math.max(p - 1, 0));
    touchStartX.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const transferPrice = Math.round(product.price * 0.85);

  const handleAdd = async () => {
    if (!selectedSize) { setSizeError(true); return; }
    setSizeError(false); setStockError(false); setStockChecking(true);
    const result = await checkStock(product.id, selectedSize);
    setStockChecking(false);
    if (result === 'out') { setLiveOutSizes(prev => new Set([...prev, selectedSize])); setStockError(true); return; }
    add({ id: product.id, name: product.name, price: product.price, image: imgUrl(product.images[0]), size: selectedSize, quantity: 1 });
    setAdded(true);
  };

  const stockLabel = selectedSize ? product.stock[selectedSize] : null;

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
                {product.images.map((img, i) => (
                  <button key={img} onClick={() => setSelectedImage(i)}
                    className={`w-full aspect-square overflow-hidden border-[1.5px] transition-colors ${i === selectedImage ? 'border-foreground' : 'border-transparent'}`}>
                    <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden bg-bg-alt select-none cursor-crosshair"
                  onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
                  onMouseMove={handleMouseMove} onMouseLeave={() => setZoomPos(null)}>
                  <img key={selectedImage} src={imgUrl(product.images[selectedImage])} alt={product.name}
                    draggable={false} className="w-full h-full object-cover"
                    style={{ transform: zoomPos ? 'scale(2)' : 'scale(1)', transformOrigin: zoomPos ? `${zoomPos.x}% ${zoomPos.y}%` : 'center', transition: zoomPos ? 'transform 0.1s ease' : 'transform 0.3s ease', animation: 'fadeIn 0.25s ease' }} />
                  {selectedImage > 0 && (
                    <button onClick={() => setSelectedImage(p => p - 1)}
                      className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm" aria-label="Anterior">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3L5 8l5 5" /></svg>
                    </button>
                  )}
                  {selectedImage < product.images.length - 1 && (
                    <button onClick={() => setSelectedImage(p => p + 1)}
                      className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm" aria-label="Siguiente">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3l5 5-5 5" /></svg>
                    </button>
                  )}
                  <span className="md:hidden absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
                    {selectedImage + 1} / {product.images.length}
                  </span>
                  {!zoomPos && (
                    <span className="hidden md:block absolute bottom-3 left-3 text-[10px] text-white bg-black/35 backdrop-blur-sm px-2 py-0.5 pointer-events-none">
                      Passá el cursor para hacer zoom
                    </span>
                  )}
                </div>
                <div className="md:hidden flex items-center justify-center gap-1.5">
                  {product.images.map((_, i) => (
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
                      <span className="text-green-700 font-semibold">(15% off)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      O hasta 3 cuotas sin interés de {formatPrice(Math.round(product.price / 3))}
                    </p>
                  </>
                )}
              </div>

              <div className="bg-[#f8f8f6] border border-border px-5 py-5 space-y-0.5 mt-3 rounded-[10px]">
                <p className="text-[12px] text-foreground/70"><span className="font-semibold text-foreground">Modelo (hombre)</span> — 1.80m de altura, talle <span className="font-semibold">M</span></p>
                <p className="text-[12px] text-foreground/70"><span className="font-semibold text-foreground">Modelo (mujer)</span> — 1.68m de altura, talle <span className="font-semibold">S</span></p>
              </div>

              {product.colors.length > 1 && (
                <div className="mb-4 mt-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[12px] font-semibold uppercase tracking-wider">Color</span>
                    <span className="text-[12px] text-muted-foreground">— {selectedColor}</span>
                  </div>
                  <div className="flex gap-2">
                    {product.colors.map(c => (
                      <button key={c.label} onClick={() => setSelectedColor(c.label)} title={c.label}
                        className={`w-[44px] h-[44px] overflow-hidden border transition-colors duration-150 rounded-[5px] ${selectedColor === c.label ? 'border-foreground' : 'border-border hover:border-foreground/40'}`}>
                        <img src={imgUrl(c.image)} alt={c.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Fit</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] border border-border px-2.5 py-1 rounded-[10px]">{product.fit}</span>
              </div>

              <div className="border-t border-border mb-4" />

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wider">
                    Talle {selectedSize && <span className="font-bold">— {selectedSize}</span>}
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
                  <p className="text-[11px] text-destructive mt-1.5">Talle agotado</p>
                )}
                {stockError && <p className="text-[11px] text-destructive mt-1">Este talle ya no tiene stock disponible</p>}
                {sizeError && !stockError && <p className="text-[11px] text-destructive mt-1">Seleccioná un talle para continuar</p>}
              </div>

              {product.customizable && (
                <button
                  onClick={() => { if (!selectedSize) { setSizeError(true); return; } router.push(`/personalizar/${product.slug}/?talle=${selectedSize}`); }}
                  className="flex items-center justify-between w-full border-2 border-foreground px-5 py-4 mb-3 rounded-[10px] hover:bg-foreground hover:text-background transition-colors group">
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-[0.08em]">Personalizar tu dorsal</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-background/70 transition-colors mt-0.5">Elegí nombre y número — preview en tiempo real</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 9h10M9 4l5 5-5 5" /></svg>
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
                <Accordion title="Drop Notes">{product.description}</Accordion>
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
                  <p>Envíos a todo el país vía Andreani. El costo se calcula en el checkout.</p>
                  <p className="mt-2">Cambios hasta 30 días desde la compra. El producto debe estar sin uso, con etiquetas y en su empaque original.</p>
                  <a href="/politicas-de-devolucion/" className="underline text-foreground hover:text-foreground/70 transition-colors mt-2 block">Ver políticas completas →</a>
                </Accordion>
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-[1400px] mx-auto px-4 pb-20">
          <h2 className="text-lg font-bold uppercase tracking-tight mb-6">Completa el Look</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {related.map(p => (
              <ProductCard key={p.slug} id={p.slug} name={p.name} category={p.category}
                price={p.price} originalPrice={p.originalPrice}
                image={p.images[0] ?? ''} images={p.images} sizes={p.sizes} stock={p.stock}
                href={`/producto/${p.slug}/`} />
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
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} />}

      {/* Added to cart popup */}
      {added && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/30" onClick={() => setAdded(false)}>
          <div className="bg-white w-full max-w-[480px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <div className="w-14 h-16 bg-bg-alt overflow-hidden flex-shrink-0">
                <img src={imgUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
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
    </>
  );
}
