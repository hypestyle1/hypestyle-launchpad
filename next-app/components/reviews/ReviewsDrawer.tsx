'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPublicReviewSummary, getPublicReviews } from '@/lib/reviews/public';
import type { PublicReview, PublicReviewSummary } from '@/lib/reviews/types';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ReviewsDistribution from './ReviewsDistribution';

const HIDDEN_PREFIXES = ['/checkout', '/admin', '/mayoristas', '/review/', '/reviews'];

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ReviewsDrawer() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<PublicReviewSummary | null>(null);
  const [recent, setRecent] = useState<PublicReview[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabTriggerRef = useRef<HTMLButtonElement>(null);
  const pillTriggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      {/* Desktop: pestaña lateral fija, tipo EME Studios */}
      <button
        ref={tabTriggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Reseñas — promedio ${summary.average?.toFixed(1)} de 5`}
        className="hidden sm:flex fixed z-[90] right-0 top-1/2 -translate-y-1/2 items-center gap-2 bg-white border border-border border-r-0 shadow-lg rounded-l-[10px] px-2.5 py-4 hover:px-3.5 transition-all"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-[12px] font-bold tabular-nums">{summary.average?.toFixed(1)}</span>
        <span aria-hidden="true" className="text-[13px]">★</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Reseñas</span>
      </button>

      {/* Mobile: botón fijo compacto, encima del botón de WhatsApp */}
      <button
        ref={pillTriggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex sm:hidden fixed z-[90] bottom-[92px] right-5 items-center gap-1.5 bg-white border border-border shadow-lg rounded-full pl-3 pr-3.5 py-2 hover:shadow-xl transition-shadow"
      >
        <StarRating rating={summary.average ?? 0} size={12} />
        <span className="text-[12px] font-semibold tabular-nums">{summary.average?.toFixed(1)}</span>
        <span className="text-[11px] text-muted-foreground">Reseñas</span>
      </button>

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
            aria-label="Reseñas de la tienda"
            className="fixed z-[160] bg-white shadow-2xl flex flex-col animate-in fade-in duration-300
              inset-x-0 bottom-0 max-h-[85vh] rounded-t-[16px]
              sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:h-full sm:w-full sm:max-w-[400px] sm:rounded-t-none"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <span className="text-[13px] font-semibold uppercase tracking-wider">Reseñas</span>
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
                    {summary.total} {summary.total === 1 ? 'reseña' : 'reseñas'}
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
              <Link
                href="/reviews/"
                onClick={close}
                className="block w-full text-center bg-bg-dark text-primary-foreground py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px]"
              >
                Ver todas las reseñas
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
