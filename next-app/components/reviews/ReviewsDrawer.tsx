'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { getPublicReviewSummary, getPublicReviews } from '@/lib/reviews/public';
import { Button } from '@/components/ui/button';
import { shiftedBottom } from '@/lib/bottom-shift';
import type { PublicReview, PublicReviewSummary } from '@/lib/reviews/types';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ReviewsDistribution from './ReviewsDistribution';

// /hype72: en la landing del evento la píldora asoma justo encima del campo de
// email y lo tapa en mobile (visto a 390x844). Ahí la página tiene un solo
// trabajo, que es el registro.
const HIDDEN_PREFIXES = ['/checkout', '/admin', '/mayoristas', '/review/', '/reviews', '/hype72'];

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Invitación a abrir la píldora sin hover: la estrella titila y un brillo la
 * cruza en loop, y cada PEEK_EVERY_MS asoma desde el borde una mini tarjeta con
 * una reseña real durante PEEK_SHOW_MS. Pausa con el drawer abierto, se corta
 * para la sesión cuando el drawer se abrió una vez y respeta reduced-motion.
 */
const PEEK_FIRST_MS = 2500;
const PEEK_EVERY_MS = 10000;
const PEEK_SHOW_MS = 4500;
const PEEK_OUT_MS = 400;
const PEEK_SEEN_KEY = 'hs-reviews-peek-seen';

const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || '';

// Misma entrada/salida y mismo vidrio que el drawer del carrito (CartDrawer.tsx
// y globals.css, "Drawer del carrito"). EXIT_MS cubre la transición de salida.
const EXIT_MS = 440;
const STAGGER_BASE_MS = 380;
const STAGGER_STEP_MS = 90;
const STAGGER_MAX = 8;
const stagger = (i: number) => ({
  '--d': `${STAGGER_BASE_MS + Math.min(i, STAGGER_MAX) * STAGGER_STEP_MS}ms`,
}) as React.CSSProperties;

const drawerGlassStyle = {
  background: 'rgba(240, 238, 232, 0.55)',
  '--muted-foreground': '0 0% 26%',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  borderLeft: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.6)',
} as React.CSSProperties;

export default function ReviewsDrawer() {
  const { t } = useLocale();
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  // `rendered`: el panel está en el DOM (un cuadro antes de abrir y mientras
  // sale). `shown`: está a la vista. Ver CartDrawer.tsx.
  const [rendered, setRendered] = useState(false);
  const [shown, setShown] = useState(false);
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);
  const [recent, setRecent] = useState<PublicReview[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabTriggerRef = useRef<HTMLButtonElement>(null);
  const pillTriggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Índice de la reseña asomada (-1 = ninguna), si está saliendo, y si ya no
  // corresponde asomar más en esta sesión.
  const [peek, setPeek] = useState(-1);
  const [peekOut, setPeekOut] = useState(false);
  const [peekSeen, setPeekSeen] = useState(false);

  useEffect(() => {
    let seen = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { seen = seen || sessionStorage.getItem(PEEK_SEEN_KEY) === '1'; } catch { /* storage bloqueado */ }
    if (seen) setPeekSeen(true);
  }, []);

  // Las que asoman: las de 5 estrellas entre las recientes (si no hay, todas).
  const fiveStar = recent.filter((r) => r.rating >= 5);
  const peekPool = fiveStar.length > 0 ? fiveStar : recent;

  useEffect(() => {
    if (peekSeen || open || peekPool.length === 0) return;
    let i = 0;
    const timers: number[] = [];
    const show = () => {
      setPeek(i % peekPool.length);
      setPeekOut(false);
      i++;
      timers.push(window.setTimeout(() => setPeekOut(true), PEEK_SHOW_MS));
      timers.push(window.setTimeout(() => { setPeek(-1); setPeekOut(false); }, PEEK_SHOW_MS + PEEK_OUT_MS));
    };
    timers.push(window.setTimeout(show, PEEK_FIRST_MS));
    const iv = window.setInterval(show, PEEK_EVERY_MS);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(iv);
      setPeek(-1);
      setPeekOut(false);
    };
  }, [peekSeen, open, peekPool.length]);

  const openDrawer = () => {
    setOpen(true);
    // Abrirlo una vez alcanza: la invitación ya cumplió.
    setPeekSeen(true);
    try { sessionStorage.setItem(PEEK_SEEN_KEY, '1'); } catch { /* idem */ }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicReviewSummary(), getPublicReviews({ perPage: 4, sort: 'recent' })]).then(([s, r]) => {
      if (cancelled) return;
      setSummary(s);
      setRecent(r.reviews);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) {
      setShown(false);
      const out = setTimeout(() => setRendered(false), EXIT_MS);
      return () => clearTimeout(out);
    }
    setRendered(true);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);

  // Scroll lock solo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Foco inicial (cuando el panel ya está en el DOM) + trap + Escape.
  useEffect(() => {
    if (!open || !rendered) return;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, rendered]);

  const close = () => {
    setOpen(false);
    // Solo uno de los dos triggers está visible según breakpoint; .focus() en un
    // elemento con display:none es un no-op, así que llamar ambos es seguro.
    tabTriggerRef.current?.focus();
    pillTriggerRef.current?.focus();
  };

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!summary || summary.total === 0) return null;

  const avg = summary.average?.toFixed(1) ?? '';
  const mobileHidden = pathname === '/' || pathname.startsWith('/producto/');
  const peekReview = peek >= 0 ? peekPool[peek] ?? null : null;
  // Mientras la tarjeta asoma, la píldora se esconde detrás.
  const hiddenWhilePeek = peekReview ? 'opacity-0 pointer-events-none' : '';
  const cardAnim = peekOut ? 'hs-pill-peek-out' : 'hs-pill-peek-in';

  const peekCardContent = peekReview && (
    <>
      <span aria-hidden="true" className="hs-pill-sheen hs-pill-sheen-once" />
      <StarRating rating={peekReview.rating} size={11} />
      <span className="text-[12px] leading-snug line-clamp-2">«{peekReview.text}»</span>
      <span className="text-[11px] text-muted-foreground">{firstName(peekReview.customerName)} · {avg} ★ · {summary.total} {t('reseñas')}</span>
    </>
  );

  return (
    <>
      {/* Desktop: pestaña lateral fija, tipo EME Studios */}
      <button
        ref={tabTriggerRef}
        type="button"
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('Reseñas')} — ${t('promedio')} ${avg} / 5`}
        className={`hidden sm:flex fixed z-[90] right-0 top-1/2 -translate-y-1/2 items-center gap-2 bg-white border border-border border-r-0 shadow-lg rounded-l-[10px] px-2.5 py-4 hover:px-3.5 transition-all hs-pill ${hiddenWhilePeek}`}
        style={{ writingMode: 'vertical-rl' }}
      >
        <span aria-hidden="true" className="hs-pill-sheen hs-pill-sheen-y" />
        <span className="text-[12px] font-bold tabular-nums">{avg}</span>
        <span aria-hidden="true" className="text-[13px] hs-pill-star">★</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">{t('Reseñas')}</span>
      </button>

      {/* Desktop: mini tarjeta con una reseña real que asoma desde el borde. */}
      {peekReview && (
        <button
          type="button"
          onClick={openDrawer}
          className={`hidden sm:flex fixed z-[91] right-0 top-1/2 -translate-y-1/2 w-[250px] flex-col items-start gap-1.5 bg-white border border-border border-r-0 shadow-xl rounded-l-[12px] px-4 py-3.5 text-left overflow-hidden ${cardAnim}`}
        >
          {peekCardContent}
        </button>
      )}

      {/* Mobile: botón fijo compacto, encima del botón de WhatsApp. En la home
          no va: en celulares de pantalla baja (o con el aviso de cookies) caía
          encima de "Ver colección" del hero. Las reseñas tienen su sección abajo.
          En la ficha tampoco: tapaba el precio con transferencia, y la ficha ya
          muestra el promedio de reseñas debajo del precio. */}
      <button
        ref={pillTriggerRef}
        type="button"
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${mobileHidden ? 'hidden' : 'flex'} sm:hidden fixed z-[90] right-5 items-center gap-1.5 bg-white border border-border shadow-lg rounded-full pl-3 pr-3.5 py-2 hover:shadow-xl transition-shadow hs-pill ${hiddenWhilePeek}`}
        style={shiftedBottom(92)}
      >
        <span aria-hidden="true" className="hs-pill-sheen" />
        <span className="inline-flex hs-pill-star"><StarRating rating={summary.average ?? 0} size={12} /></span>
        <span className="text-[12px] font-semibold tabular-nums">{avg}</span>
        <span className="text-[11px] text-muted-foreground">{t('Reseñas')}</span>
      </button>

      {/* Mobile: la tarjeta reemplaza a la píldora mientras asoma. */}
      {peekReview && !mobileHidden && (
        <button
          type="button"
          onClick={openDrawer}
          className={`flex sm:hidden fixed z-[91] right-5 w-[min(280px,calc(100vw-40px))] flex-col items-start gap-1 bg-white border border-border shadow-xl rounded-[14px] px-4 py-3 text-left overflow-hidden ${cardAnim}`}
          style={shiftedBottom(92)}
        >
          {peekCardContent}
        </button>
      )}

      {rendered && (
        <>
          {/* Termina donde empieza el panel, como en el carrito: si oscureciera
              por detrás, el vidrio desenfocaría una imagen ya apagada. */}
          <div
            className="hs-drawer-overlay fixed inset-0 min-[420px]:right-[420px] z-[150] bg-black/40"
            data-open={shown}
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('Reseñas de la tienda')}
            className="hs-drawer fixed right-0 top-0 bottom-0 z-[160] w-full max-w-[420px] flex flex-col"
            data-open={shown}
            style={drawerGlassStyle}
          >
            <div className="hs-drawer-in flex items-center justify-between px-6 py-5 border-b border-black/10" style={stagger(0)}>
              <span className="text-[13px] font-semibold uppercase tracking-wider">{t('Reseñas')}</span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            <div className="hs-drawer-in px-6 py-5 border-b border-black/10" style={stagger(1)}>
              <div className="flex items-center gap-3">
                <span className="text-[28px] font-bold leading-none tabular-nums">{summary.average?.toFixed(1)}</span>
                <div className="flex flex-col gap-1">
                  <StarRating rating={summary.average ?? 0} size={14} />
                  <span className="text-[11px] text-muted-foreground">
                    {summary.total} {t(summary.total === 1 ? 'reseña' : 'reseñas')}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <ReviewsDistribution summary={summary} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {recent.map((r, i) => (
                <div key={r.id} className="hs-drawer-in" style={stagger(2 + i)}>
                  <ReviewCard review={r} compact />
                </div>
              ))}
            </div>

            <div className="hs-drawer-in px-6 py-5 border-t border-black/10" style={stagger(2 + recent.length)}>
              <Button asChild variant="hype" size="ctaFull" className="py-3.5 rounded-[10px]">
                <Link href="/reviews" onClick={close}>{t('Ver todas las reseñas')}</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
