'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/context/CookieContext';
import { useBottomShift } from '@/lib/bottom-shift';
import {
  STORAGE,
  PREFERENCIAS,
  type Preferencia,
  type PopupPlan,
  type TrafficSource,
  cameFromOurEmail,
  classifyTraffic,
  closedUntil,
  isClosedRecently,
  isExcludedPage,
  planPopup,
} from '@/lib/newsletter-popup';

/**
 * Popup de newsletter en dos piezas (rediseño 29/09/2026, ref. Scuffers):
 *
 * - El modal: vidrio sobre el sitio desenfocado, en dos pasos. Primero una
 *   pregunta de un click (Hombre / Mujer / Todo) y recién después el email.
 *   El primer paso no cuesta nada y el que lo da suele terminar.
 * - La barra: abajo, sin overlay, deja seguir navegando. Es lo que ve el
 *   tráfico pago y el que cerró el modal.
 *
 * Cuándo aparece cada una lo decide lib/newsletter-popup.ts. Se monta en el
 * layout raíz porque dispara en las fichas de producto y la barra puede caer
 * en cualquier página.
 */

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};
const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch {} },
  del: (k: string) => { try { sessionStorage.removeItem(k); } catch {} },
};

function readSource(): TrafficSource {
  const saved = ss.get(STORAGE.source) as TrafficSource | null;
  const fromUrl = classifyTraffic(location.search, document.referrer);
  // El utm solo viene en la primera página; después la navegación es interna
  // y el referrer somos nosotros. Lo que se guardó al llegar es lo que vale.
  if (saved && fromUrl === 'direct') return saved;
  ss.set(STORAGE.source, fromUrl);
  return fromUrl;
}

const LEGAL = 'Al suscribirte aceptás recibir novedades de Hype por email. Podés darte de baja cuando quieras.';

async function subscribe(email: string, preferencia: Preferencia | null) {
  await fetch('/api/newsletter-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, preferencia }),
  });
}

export default function NewsletterPopup() {
  const pathname = usePathname() || '/';
  // Con el cartel de cookies en pantalla no se muestra nada: los dos van abajo
  // y se pisarían. Lo que estaba por aparecer aparece apenas se cierra.
  const { bannerOpen } = useCookieConsent();
  const [shown, setShown] = useState<'modal' | 'bar' | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Volver de una página a otra: lo que estaba armado para la anterior se descarta.
    cleanupRef.current?.();
    cleanupRef.current = null;
    // La barra no tapa nada: se queda mientras navega, hasta que la cierre o
    // se suscriba. Solo se retira en las páginas donde no va (checkout, etc.).
    if (shownRef.current === 'bar' && !isExcludedPage(pathname)) return;
    setShown(null);

    if (cameFromOurEmail(location.search)) ls.set(STORAGE.subscribed, '1');

    const returning = ls.get(STORAGE.visited) === '1';
    ls.set(STORAGE.visited, '1');

    const plan: PopupPlan = planPopup({
      pathname,
      source: readSource(),
      subscribed: ls.get(STORAGE.subscribed) === '1',
      buyer: ls.get(STORAGE.buyer) === '1',
      closedRecently: isClosedRecently(ls.get(STORAGE.closed)),
      returning,
      barPending: ss.get(STORAGE.barPending) === '1',
      barShown: ss.get(STORAGE.barShown) === '1',
    });
    if (plan.kind === 'none') return;

    let done = false;
    const fns: (() => void)[] = [];
    const fire = () => {
      if (done) return;
      done = true;
      fns.forEach((f) => f());
      if (plan.kind === 'bar') {
        ss.set(STORAGE.barShown, '1');
        ss.del(STORAGE.barPending);
      }
      setShown(plan.kind);
    };

    const timer = window.setTimeout(fire, plan.delayS * 1000);
    fns.push(() => window.clearTimeout(timer));

    if (plan.kind === 'modal') {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && window.scrollY / max >= plan.scrollDepth) fire();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      fns.push(() => window.removeEventListener('scroll', onScroll));
    }

    cleanupRef.current = () => fns.forEach((f) => f());
    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [pathname]);

  const closeModal = useCallback(() => {
    ls.set(STORAGE.closed, closedUntil());
    // La barra queda para la página siguiente, no para esta: recién cerró algo.
    ss.set(STORAGE.barPending, '1');
    setShown(null);
  }, []);

  const closeBar = useCallback(() => {
    ls.set(STORAGE.closed, closedUntil());
    setShown(null);
  }, []);

  const onSubscribed = useCallback(() => {
    ls.set(STORAGE.subscribed, '1');
    ss.del(STORAGE.barPending);
  }, []);

  if (bannerOpen) return null;
  if (shown === 'modal') return <Modal onClose={closeModal} onSubscribed={onSubscribed} />;
  if (shown === 'bar') return <Bar onClose={closeBar} onSubscribed={onSubscribed} />;
  return null;
}

/* ───────────────────────────── Modal ───────────────────────────── */

const glassInput = {
  background: 'rgba(255,255,255,0.14)',
  border: '1px solid rgba(255,255,255,0.38)',
} as const;

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}

function Modal({ onClose, onSubscribed }: { onClose: () => void; onSubscribed: () => void }) {
  const [step, setStep] = useState<1 | 2 | 'done'>(1);
  const [preferencia, setPreferencia] = useState<Preferencia | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // El video del fondo solo se monta en desktop: un <video autoPlay> se
  // descarga aunque su display sea none, y en mobile la foto no se ve.
  const [wide, setWide] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (step === 2) emailRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 'done') return;
    const t = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(t);
  }, [step, onClose]);

  const pick = (p: Preferencia) => { setPreferencia(p); setStep(2); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try { await subscribe(email, preferencia); } catch {}
    setLoading(false);
    onSubscribed();
    setStep('done');
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="10% en tu primera compra"
    >
      <div
        className="relative w-full max-w-[960px] overflow-hidden text-white rounded-[28px] md:rounded-[34px]"
        style={{
          background: 'rgba(255,255,255,0.13)',
          backdropFilter: 'blur(34px) saturate(160%)',
          WebkitBackdropFilter: 'blur(34px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.38)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 30px 90px rgba(0,0,0,0.4)',
          maxHeight: '92vh',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 md:top-[22px] md:right-[22px] z-20 w-[34px] h-[34px] flex items-center justify-center rounded-full text-white transition-transform hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <CloseIcon />
        </button>

        {/* La foto se funde en el vidrio por la izquierda. Solo desktop. */}
        {wide && (
          <div
            className="absolute top-0 right-0 bottom-0 w-[46%]"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
              maskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
            }}
            aria-hidden
          >
            <video
              src="/popup-hype.mp4"
              poster="/popup-hype.webp"
              autoPlay loop muted playsInline preload="none"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 20%' }}
            />
          </div>
        )}

        <div className="relative flex flex-col w-full md:w-[60%] px-6 pt-[30px] pb-[26px] md:pl-[52px] md:pr-0 md:pt-[46px] md:pb-10 md:min-h-[500px]">
          <img src="/hero/hype-white.png" alt="Hype" className="h-[22px] md:h-[26px] w-auto self-start mb-5 md:mb-[26px]" />

          <h3 className="font-medium text-[27px] md:text-[34px] leading-[1.05] tracking-[-0.025em] pr-9 md:pr-0">
            10% en tu primera compra
          </h3>

          <div className="flex flex-wrap gap-2 mt-5">
            {['Acceso anticipado a los drops', 'Descuentos para miembros', 'Restocks antes que nadie'].map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-2 text-[11.5px] md:text-[12.5px] px-3 py-[7px] md:px-[14px] md:py-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                <i className="w-[5px] h-[5px] rounded-full bg-white" aria-hidden />
                {b}
              </span>
            ))}
          </div>

          <div className="mt-[30px]">
            {step === 1 && (
              <>
                <p className="text-[18px] md:text-[21px] font-medium tracking-[-0.015em] mb-[14px]">¿Qué te interesa más?</p>
                <div className="flex gap-[10px] flex-wrap">
                  {PREFERENCIAS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => pick(p.value)}
                      className="flex-1 md:flex-none md:min-w-[118px] px-[10px] md:px-[22px] py-[14px] md:py-[15px] rounded-full text-[13px] md:text-[14px] text-white transition-colors hover:bg-white hover:text-[#0a0a0a]"
                      style={glassInput}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-[18px] md:text-[21px] font-medium tracking-[-0.015em] mb-[14px]">¿A dónde te mandamos el código?</p>
                <form onSubmit={submit} className="flex flex-col md:flex-row gap-[10px] md:max-w-[440px]">
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu email"
                    required
                    autoComplete="email"
                    className="flex-1 min-w-0 px-5 py-[15px] rounded-full text-[14px] text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
                    style={glassInput}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-white text-[#0a0a0a] px-6 py-[15px] text-[13px] font-semibold whitespace-nowrap disabled:opacity-70"
                  >
                    {loading ? 'Enviando...' : 'Quiero mi 10%'}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-3 text-[12px] text-white/75 underline underline-offset-[3px]"
                >
                  Volver
                </button>
              </>
            )}

            {step === 'done' && (
              <p className="text-[18px] md:text-[21px] font-medium tracking-[-0.015em]">
                Listo. Revisá tu email, ahí está el código.
              </p>
            )}
          </div>

          <p className="mt-auto pt-7 text-[10.5px] leading-[1.5] text-white/80 md:max-w-[400px]">{LEGAL}</p>
          <img src="/STYLE&CULTURE WHITE.png" alt="Style&Culture" className="h-3 w-auto self-start mt-4 opacity-90" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Barra ───────────────────────────── */

function Bar({ onClose, onSubscribed }: { onClose: () => void; onSubscribed: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Mientras la barra está abajo, WhatsApp, el reproductor y la pastilla de reseñas suben.
  useBottomShift(boxRef);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(t);
  }, [done, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try { await subscribe(email, null); } catch {}
    setLoading(false);
    onSubscribed();
    setDone(true);
  };

  return (
    <div ref={boxRef} className="fixed inset-x-0 bottom-0 z-[190] flex justify-center px-[10px] pb-3 md:px-4 md:pb-[18px] pointer-events-none">
      <div
        className="pointer-events-auto relative w-full max-w-[1000px] flex flex-wrap md:flex-nowrap items-center gap-[14px] md:gap-[22px] p-[14px] md:pr-[58px] rounded-[22px] animate-in slide-in-from-bottom-4 fade-in duration-300"
        style={{
          background: 'rgba(245,243,237,0.74)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 18px 60px rgba(0,0,0,0.28)',
        }}
        role="dialog"
        aria-label="10% Off en tu primera compra"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-[14px] right-[14px] md:top-1/2 md:-translate-y-1/2 md:right-4 w-[30px] h-[30px] flex items-center justify-center rounded-full text-foreground"
          style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.8)' }}
        >
          <CloseIcon />
        </button>

        <img
          src="/popup-hype.webp"
          alt=""
          width={76}
          height={76}
          className="w-[58px] h-[58px] md:w-[76px] md:h-[76px] flex-shrink-0 rounded-[12px] object-cover"
          style={{ objectPosition: 'center 18%' }}
        />

        <div className="flex-1 md:flex-none pr-9 md:pr-0">
          <b className="block font-bold text-[25px] md:text-[30px] leading-none tracking-[-0.03em] text-foreground">10% Off</b>
          <span className="block mt-[5px] text-[12.5px] text-foreground/70">En tu primera compra, solo para miembros.</span>
        </div>

        {done ? (
          <p className="basis-full md:basis-auto md:flex-1 text-[13px] font-medium text-foreground py-3">Listo. Revisá tu email.</p>
        ) : (
          <form onSubmit={submit} className="basis-full md:basis-auto md:flex-1 flex gap-2 min-w-0">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email"
              required
              autoComplete="email"
              className="flex-1 min-w-0 px-[18px] py-[13px] rounded-full text-[13px] text-foreground placeholder:text-foreground/45 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#0a0a0a] text-white px-[18px] md:px-6 py-[13px] text-[12px] font-bold uppercase tracking-[0.08em] whitespace-nowrap disabled:opacity-70"
            >
              {loading ? '...' : 'Unirme'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
