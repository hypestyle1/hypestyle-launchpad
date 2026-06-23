'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import { useCart } from '@/context/CartContext';
import { useProduct } from '@/hooks/useProduct';
import Navbar from '@/components/Navbar';
import AnnouncementBar from '@/components/AnnouncementBar';

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
          <NextImage src={image} alt="Guía de talles" width={520} height={600} className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}

const S = 600;
const MOCKUP_SCALE = 0.72; // achica el mockup de la camiseta dentro del canvas (deja margen alrededor)
const FONT_SCALE = 1.1;    // ajuste del tamaño de fuente del canvas (nombre + número), relativo al mockup
const FONT = `"AdidasWorldCup", "Arial Black", Arial, sans-serif`;

function drawArcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, letterSpacing = 0) {
  if (!text) return;
  // textAlign 'center' centra cada glifo en su slot; con 'left' se corría media
  // letra a la derecha (letras anchas dejaban hueco y angostas se pegaban).
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const widths = [...text].map(ch => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((a, w) => a + w, 0) + letterSpacing * (text.length - 1);
  const totalAngle = totalWidth / radius;
  let angle = -Math.PI / 2 - totalAngle / 2;
  for (let i = 0; i < text.length; i++) {
    const w = widths[i]; const charAngle = w / radius; const drawAngle = angle + charAngle / 2;
    ctx.save(); ctx.translate(cx + radius * Math.cos(drawAngle), cy + radius * Math.sin(drawAngle)); ctx.rotate(drawAngle + Math.PI / 2); ctx.fillText(text[i], 0, 0); ctx.restore();
    angle += charAngle + letterSpacing / radius;
  }
}

// Francia2006.otf es de un único peso (normal). Pedir "bold" no matchea esa
// cara y el canvas cae al fallback (Arial Black). Cargamos el peso normal.
function ensureFont(): Promise<void> {
  return document.fonts.load('64px "AdidasWorldCup"').then(() => document.fonts.ready).then(() => {});
}

async function renderJersey(canvas: HTMLCanvasElement, view: 'espalda' | 'frente', playerName: string, playerNumber: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = S; canvas.height = S; ctx.clearRect(0, 0, S, S);
  const img = new Image();
  img.src = view === 'espalda' ? '/products/argentina-jersey/preview-espalda.png' : '/products/argentina-jersey/preview-frente.png';
  await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); });
  await ensureFont();

  // El mockup se dibuja centrado y achicado (MOCKUP_SCALE); las posiciones y el
  // tamaño del texto se mapean dentro de esa caja para que sigan calzando.
  const off = (S * (1 - MOCKUP_SCALE)) / 2;
  const JS = S * MOCKUP_SCALE;
  const jx = (f: number) => off + JS * f;
  const jy = (f: number) => off + JS * f;
  const fs = (f: number) => Math.round(JS * f * FONT_SCALE);

  ctx.drawImage(img, off, off, JS, JS);
  ctx.fillStyle = '#0a0a0a';
  if (view === 'espalda') {
    if (playerName) {
      const base = playerName.length > 10 ? 0.063 : playerName.length > 7 ? 0.074 : 0.085;
      const fontSize = fs(base);
      ctx.font = `${fontSize}px ${FONT}`; ctx.fillStyle = '#0a0a0a';
      drawArcText(ctx, playerName, jx(0.5), jy(1.40), JS * 1.20, Math.round(fontSize * 0.08));
    }
    if (playerNumber) {
      const fontSize = fs(playerNumber.length === 1 ? 0.46 : 0.38);
      ctx.font = `${fontSize}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#0a0a0a';
      ctx.fillText(playerNumber, jx(0.5), jy(0.37));
    }
  }
  if (view === 'frente' && playerNumber) {
    const fontSize = fs(0.10);
    ctx.font = `${fontSize}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0a0a0a';
    ctx.fillText(playerNumber, jx(0.50), jy(0.43));
  }
}

export default function PersonalizarClient({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { add, setDrawerOpen } = useCart();
  const { data: product, isLoading } = useProduct(slug || undefined);

  const [view, setView] = useState<'espalda' | 'frente'>('espalda');
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [selectedSize, setSelectedSize] = useState<string | null>(searchParams.get('talle'));
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    if (canvasRef.current) renderJersey(canvasRef.current, view, playerName, playerNumber);
  }, [view, playerName, playerNumber]);

  useEffect(() => { redraw(); }, [redraw]);

  // Precargar ambas vistas: el dibujo inicial es inmediato y el flip frente/espalda no demora.
  useEffect(() => {
    ['espalda', 'frente'].forEach(v => { const i = new Image(); i.src = `/products/argentina-jersey/preview-${v}.png`; });
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Talle único → autoseleccionar; si el talle del query param ya no existe, limpiarlo.
  useEffect(() => {
    if (!product) return;
    if (product.sizes.length === 1) setSelectedSize(product.sizes[0]);
    else setSelectedSize(prev => (prev && product.sizes.includes(prev) ? prev : null));
  }, [product?.slug]);

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Producto no encontrado.</p>
    </div>
  );

  const handleAdd = () => {
    if (!selectedSize) { setSizeError(true); return; }
    add({ id: product.id, name: product.name, price: product.price, image: product.images[0], size: selectedSize, quantity: 1, ...(playerName || playerNumber ? { customization: { playerName, number: playerNumber } } : {}) });
    setAdded(true);
    setTimeout(() => { setDrawerOpen(true); router.push(`/producto/${slug}/`); }, 900);
  };

  const ADIDAS = `"AdidasWorldCup", "Arial Black", Arial, sans-serif`;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] min-h-screen bg-background">
        <div className="max-w-[1200px] mx-auto px-4 pt-4 pb-12">
          <button onClick={() => router.push(`/producto/${slug}/`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[11px] uppercase tracking-wider mb-6">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2L4 7L9 12" /></svg>
            Volver al producto
          </button>
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
            <div className="w-full lg:flex-1">
              <div className="flex gap-2 mb-5">
                {(['espalda', 'frente'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-5 py-2 text-[11px] font-bold uppercase tracking-[0.15em] border transition-colors rounded-full ${view === v ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground hover:text-foreground'}`}>
                    {v === 'espalda' ? 'Espalda' : 'Frente'}
                  </button>
                ))}
              </div>
              <div className="w-full aspect-square max-w-[540px] mx-auto lg:mx-0 rounded-[12px] overflow-hidden bg-white border border-border">
                <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'crisp-edges' }} />
              </div>
              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-3">
                {view === 'espalda' ? 'Vista espalda — nombre + número' : 'Vista frente — número en pecho'}
              </p>
            </div>
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <div className="mb-6">
                <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] mb-1">Personalización</p>
                <h1 className="text-foreground text-[20px] font-bold uppercase tracking-tight">{product.name}</h1>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Nombre en dorsal</label>
                  <input type="text" maxLength={14} placeholder="GARCIA" value={playerName}
                    onChange={e => { setPlayerName(e.target.value.toUpperCase()); setView('espalda'); }}
                    className="w-full bg-bg-alt border border-border focus:border-foreground text-foreground px-4 py-3.5 text-[17px] uppercase tracking-[0.12em] outline-none transition-colors rounded-[10px] placeholder:text-foreground/20"
                    style={{ fontFamily: ADIDAS }} />
                  <p className="text-[10px] text-muted-foreground mt-1">{playerName.length}/14 caracteres</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">Número</label>
                  <input type="text" maxLength={2} placeholder="10" value={playerNumber}
                    onChange={e => setPlayerNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-bg-alt border border-border focus:border-foreground text-foreground px-4 py-3.5 text-[32px] text-center outline-none transition-colors rounded-[10px] placeholder:text-foreground/20"
                    style={{ fontFamily: ADIDAS, letterSpacing: '6px' }} />
                </div>
              </div>
              <div className="border-t border-border mb-6" />

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Talle {selectedSize && <span className="text-foreground">— {selectedSize}</span>}
                  </span>
                  <button onClick={() => setSizeGuideOpen(true)}
                    className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors">
                    Guía de talles
                  </button>
                </div>
                {product.sizes.length > 1 ? (
                  <div className="flex gap-2 flex-wrap">
                    {product.sizes.map(s => {
                      const isOut = product.stock[s] === 'out';
                      return (
                        <button key={s} type="button" disabled={isOut}
                          onClick={() => { setSelectedSize(s); setSizeError(false); }}
                          className={`px-4 py-2 text-[12px] font-semibold uppercase border transition-colors rounded-[10px] ${
                            isOut
                              ? 'border-border text-foreground/25 cursor-not-allowed line-through'
                              : selectedSize === s
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border hover:border-foreground'
                          }`}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-foreground/70">Talle único</p>
                )}
                {sizeError && <p className="text-[11px] text-destructive mt-1.5">Seleccioná un talle para continuar</p>}
              </div>
              {(playerName || playerNumber) && (
                <div className="border border-border rounded-[10px] px-4 py-3 mb-5 bg-bg-alt">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Tu personalización</p>
                  <p className="text-foreground text-[18px]" style={{ fontFamily: ADIDAS, letterSpacing: '3px' }}>
                    {playerNumber && `#${playerNumber}`}{playerName && ` ${playerName}`}
                  </p>
                </div>
              )}
              <button onClick={handleAdd}
                className={`w-full py-4 text-[13px] font-bold uppercase tracking-[0.1em] transition-all rounded-[10px] ${added ? 'bg-green-600 text-white' : 'bg-bg-dark text-primary-foreground hover:bg-bg-dark/85'}`}>
                {added ? '¡Agregado!' : playerName || playerNumber ? `Agregar — ${playerNumber ? `#${playerNumber}` : ''} ${playerName}`.trim() : 'Agregar al carrito'}
              </button>
              {(playerName || playerNumber) && !added && (
                <button onClick={() => { setPlayerName(''); setPlayerNumber(''); }}
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground mt-3 underline transition-colors">
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} image={product.sizeGuideImage || DEFAULT_SIZE_GUIDE} />}
    </>
  );
}
