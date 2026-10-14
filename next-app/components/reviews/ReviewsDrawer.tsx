'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

const HIDDEN_PREFIXES = ['/checkout', '/admin', '/mayoristas', '/review/', '/reviews'];

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Invitación a abrir la píldora sin hover. DEMO LOCAL: se elige con ?pill=<letra>
 * o con el selector flotante (solo en development); queda en localStorage.
 *  A — entra a los 3 s y hace 3 nudges que replican el hover (una vez por sesión).
 *  B — la estrella titila y un brillo cruza la píldora.
 *  C — cada 10 s se despliega una mini tarjeta con una reseña real, 4 s, y se repliega.
 *  D — ticker: el texto de la píldora rota (promedio → cita → total).
 *  E — anillo que se expande y desvanece, como el botón de WhatsApp.
 *  F — píldora negra con texto en marquee.
 *  G — sacudida tipo notificación cada 6 s.
 *  H — invierte color (blanca ↔ negra) cada 6 s.
 */
type PillVariant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'off';
const PILL_VARIANTS: { id: PillVariant; label: string }[] = [
  { id: 'A', label: 'A Entra+nudge' },
  { id: 'B', label: 'B Titila+brillo' },
  { id: 'C', label: 'C Peek reseña' },
  { id: 'D', label: 'D Ticker' },
  { id: 'E', label: 'E Anillo' },
  { id: 'F', label: 'F Negra marquee' },
  { id: 'G', label: 'G Sacudida' },
  { id: 'H', label: 'H Invierte' },
  { id: 'off', label: 'Actual' },
];
const isVariant = (v: string | null): v is PillVariant => PILL_VARIANTS.some((x) => x.id === v);
const PILL_VARIANT_KEY = 'hs-reviews-pill-variant';
const PILL_INTRO_KEY = 'hs-reviews-pill-intro';
const PILL_INTRO_DELAY_MS = 3000;
const PEEK_EVERY_MS = 10000;
const PEEK_SHOW_MS = 4500;
const TICK_EVERY_MS = 3200;

const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || '';
const shorten = (txt: string, max: number) => {
  const t = (txt || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
};

export default function ReviewsDrawer() {
  const { t } = useLocale();
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);
  const [recent, setRecent] = useState<PublicReview[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabTriggerRef = useRef<HTMLButtonElement>(null);
  const pillTriggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [variant, setVariant] = useState<PillVariant>('off');
  // 'pending' = todavía oculta (esperando el delay); 'play' = animando; 'done' = quieta.
  const [intro, setIntro] = useState<'pending' | 'play' | 'done'>('done');
  // C: índice de la reseña asomada (-1 = ninguna) y si está saliendo.
  const [peek, setPeek] = useState(-1);
  const [peekOut, setPeekOut] = useState(false);
  // D: contador del ticker.
  const [tick, setTick] = useState(0);

  // Elección de variante (demo) + intro de la variante A, una vez por sesión.
  useEffect(() => {
    let v: PillVariant = 'A';
    try {
      const q = new URLSearchParams(window.location.search).get('pill');
      if (isVariant(q)) localStorage.setItem(PILL_VARIANT_KEY, q);
      const stored = localStorage.getItem(PILL_VARIANT_KEY);
      if (isVariant(stored)) v = stored;
    } catch { /* storage bloqueado: variante por defecto */ }
    setVariant(v);
    if (v !== 'A') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = sessionStorage.getItem(PILL_INTRO_KEY) === '1'; } catch { /* idem */ }
    if (reduce || seen) return;

    setIntro('pending');
    const id = window.setTimeout(() => {
      setIntro('play');
      try { sessionStorage.setItem(PILL_INTRO_KEY, '1'); } catch { /* idem */ }
    }, PILL_INTRO_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  // C: asoma una reseña cada PEEK_EVERY_MS mientras el drawer está cerrado.
  useEffect(() => {
    if (variant !== 'C' || open || recent.length === 0) return;
    let i = 0;
    const timers: number[] = [];
    const show = () => {
      setPeek(i % recent.length);
      setPeekOut(false);
      i++;
      timers.push(window.setTimeout(() => setPeekOut(true), PEEK_SHOW_MS));
      timers.push(window.setTimeout(() => { setPeek(-1); setPeekOut(false); }, PEEK_SHOW_MS + 400));
    };
    timers.push(window.setTimeout(show, 2500));
    const iv = window.setInterval(show, PEEK_EVERY_MS);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(iv);
      setPeek(-1);
      setPeekOut(false);
    };
  }, [variant, open, recent.length]);

  // D: rota el texto de la píldora.
  useEffect(() => {
    if (variant !== 'D' || open) return;
    const iv = window.setInterval(() => setTick((n) => n + 1), TICK_EVERY_MS);
    return () => window.clearInterval(iv);
  }, [variant, open]);

  const chooseVariant = (v: PillVariant) => {
    try {
      localStorage.setItem(PILL_VARIANT_KEY, v);
      sessionStorage.removeItem(PILL_INTRO_KEY);
    } catch { /* idem */ }
    window.location.reload();
  };

  const openDrawer = () => {
    setOpen(true);
    // Abrirla una vez alcanza: la invitación ya cumplió.
    setIntro('done');
    try { sessionStorage.setItem(PILL_INTRO_KEY, '1'); } catch { /* idem */ }
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

  // Scroll lock solo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Foco inicial + trap + Escape.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const close = () => {
    setOpen(false);
    // Solo uno de los dos triggers está visible según breakpoint; .focus() en un
    // elemento con display:none es un no-op, así que llamar ambos es seguro.
    tabTriggerRef.current?.focus();
    pillTriggerRef.current?.focus();
  };

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!summary || summary.total === 0) return null;
  if (intro === 'pending') return null;

  const avg = summary.average?.toFixed(1) ?? '';
  const isA = variant === 'A' && intro === 'play';
  const dark = variant === 'F';
  const tabAnim = [
    isA && 'hs-pill-a-tab',
    variant === 'B' && 'hs-pill-b',
    variant === 'E' && 'hs-pill-e',
    variant === 'G' && 'hs-pill-g',
    variant === 'H' && 'hs-pill-h',
    variant === 'C' && peek >= 0 && 'opacity-0 pointer-events-none',
  ].filter(Boolean).join(' ');
  const pillAnim = [
    isA && 'hs-pill-a-pill',
    variant === 'B' && 'hs-pill-b',
    variant === 'E' && 'hs-pill-e',
    variant === 'G' && 'hs-pill-g',
    variant === 'H' && 'hs-pill-h',
    variant === 'C' && peek >= 0 && 'opacity-0 pointer-events-none',
  ].filter(Boolean).join(' ');
  const starAnim = variant === 'B' ? 'hs-pill-star' : '';
  const mobileHidden = pathname === '/' || pathname.startsWith('/producto/');

  // D: mensajes del ticker.
  const tickerMsgs: { key: string; node: ReactNode }[] = [
    { key: 'avg', node: <>{avg} <span aria-hidden="true">★</span> {t('Reseñas')}</> },
    ...recent.slice(0, 2).map((r) => ({
      key: r.id,
      node: <>«{shorten(r.text, 26)}» <span className="opacity-60">{firstName(r.customerName)}</span></>,
    })),
    { key: 'total', node: <>{summary.total} {t('reseñas')}</> },
  ];
  const tickerNow = tickerMsgs[tick % tickerMsgs.length];
  const marqueeTxt = `${avg} ★ ${t('Reseñas').toUpperCase()} · `;
  const peekReview = variant === 'C' && peek >= 0 ? recent[peek] : null;

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
        className={`hidden sm:flex fixed z-[90] right-0 top-1/2 -translate-y-1/2 items-center gap-2 border border-r-0 shadow-lg rounded-l-[10px] px-2.5 py-4 hover:px-3.5 transition-all ${dark ? 'bg-black text-white border-black' : 'bg-white border-border'} ${tabAnim}`}
        style={{ writingMode: 'vertical-rl' }}
      >
        {variant === 'B' && <span aria-hidden="true" className="hs-pill-sheen hs-pill-sheen-y" />}
        {variant === 'E' && <span aria-hidden="true" className="hs-pill-ring" />}
        {variant === 'D' ? (
          <span key={tickerNow.key} className="hs-pill-tick text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap">{tickerNow.node}</span>
        ) : variant === 'F' ? (
          <span className="hs-pill-marquee-y" aria-hidden="true">
            <span className="hs-pill-marquee-y-inner text-[11px] font-semibold uppercase tracking-[0.12em]">{marqueeTxt}{marqueeTxt}{marqueeTxt}{marqueeTxt}</span>
          </span>
        ) : (
          <>
            <span className="text-[12px] font-bold tabular-nums">{avg}</span>
            <span aria-hidden="true" className={`text-[13px] ${starAnim}`}>★</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">{t('Reseñas')}</span>
          </>
        )}
      </button>

      {/* C desktop: mini tarjeta con una reseña real que asoma desde el borde. */}
      {peekReview && (
        <button
          type="button"
          onClick={openDrawer}
          className={`hidden sm:flex fixed z-[91] right-0 top-1/2 -translate-y-1/2 w-[250px] flex-col items-start gap-1.5 bg-white border border-border border-r-0 shadow-xl rounded-l-[12px] px-4 py-3.5 text-left ${peekOut ? 'hs-pill-peek-out' : 'hs-pill-peek-in'}`}
        >
          <StarRating rating={peekReview.rating} size={11} />
          <span className="text-[12px] leading-snug line-clamp-2">«{peekReview.text}»</span>
          <span className="text-[11px] text-muted-foreground">{firstName(peekReview.customerName)} · {avg} ★ · {summary.total} {t('reseñas')}</span>
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
        className={`${mobileHidden ? 'hidden' : 'flex'} sm:hidden fixed z-[90] right-5 items-center gap-1.5 border shadow-lg rounded-full pl-3 pr-3.5 py-2 hover:shadow-xl transition-shadow ${dark ? 'bg-black text-white border-black' : 'bg-white border-border'} ${pillAnim}`}
        style={shiftedBottom(92)}
      >
        {variant === 'B' && <span aria-hidden="true" className="hs-pill-sheen hs-pill-sheen-x" />}
        {variant === 'E' && <span aria-hidden="true" className="hs-pill-ring" />}
        {variant === 'D' ? (
          <span key={tickerNow.key} className="hs-pill-tick text-[12px] font-semibold whitespace-nowrap">{tickerNow.node}</span>
        ) : variant === 'F' ? (
          <span className="hs-pill-marquee-x" aria-hidden="true">
            <span className="hs-pill-marquee-x-inner text-[11px] font-semibold uppercase tracking-[0.12em]">{marqueeTxt}{marqueeTxt}{marqueeTxt}{marqueeTxt}</span>
          </span>
        ) : (
          <>
            <span className={`inline-flex ${starAnim}`}><StarRating rating={summary.average ?? 0} size={12} /></span>
            <span className="text-[12px] font-semibold tabular-nums">{avg}</span>
            <span className="text-[11px] text-muted-foreground">{t('Reseñas')}</span>
          </>
        )}
      </button>

      {/* C mobile: la tarjeta reemplaza a la píldora mientras asoma. */}
      {peekReview && !mobileHidden && (
        <button
          type="button"
          onClick={openDrawer}
          className={`flex sm:hidden fixed z-[91] right-5 w-[min(280px,calc(100vw-40px))] flex-col items-start gap-1 bg-white border border-border shadow-xl rounded-[14px] px-4 py-3 text-left ${peekOut ? 'hs-pill-peek-out' : 'hs-pill-peek-in'}`}
          style={shiftedBottom(92)}
        >
          <StarRating rating={peekReview.rating} size={11} />
          <span className="text-[12px] leading-snug line-clamp-2">«{peekReview.text}»</span>
          <span className="text-[11px] text-muted-foreground">{firstName(peekReview.customerName)} · {avg} ★ · {summary.total} {t('reseñas')}</span>
        </button>
      )}

      {/* Selector de variante: solo en development. */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed left-3 top-[88px] z-[200] flex flex-wrap gap-1 max-w-[230px] bg-black/85 text-white p-2 rounded-[8px] text-[10px] leading-none">
          {PILL_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => chooseVariant(v.id)}
              className={`px-1.5 py-1 rounded-[4px] ${variant === v.id ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/25'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-[150] bg-black/40 animate-in fade-in duration-200"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('Reseñas de la tienda')}
            className="fixed z-[160] bg-white shadow-2xl flex flex-col animate-in fade-in duration-300
              inset-x-0 bottom-0 max-h-[85vh] rounded-t-[16px]
              sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:h-full sm:w-full sm:max-w-[400px] sm:rounded-t-none"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
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

            <div className="px-6 py-5 border-b border-border">
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
              {recent.map((r) => <ReviewCard key={r.id} review={r} compact />)}
            </div>

            <div className="px-6 py-5 border-t border-border">
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
