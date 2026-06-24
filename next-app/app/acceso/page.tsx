'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PUBLIC_OPEN = new Date('2026-06-24T20:00:00-03:00').getTime();

const SLIDES = [
  '/fw26-hstars-editorial.jpg',
  '/banner-hero (1).jpg',
  '/fw26-camo-editorial.jpg',
  '/banner-hero (2).jpg',
  '/stl-halfzip-black.jpg',
  '/banner-hero (3).jpg',
  '/stl-halfzip-melange.jpg',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function getCountdown() {
  const diff = Math.max(0, PUBLIC_OPEN - Date.now());
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

export default function AccesoPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready,     setReady]     = useState(false);
  const [open,      setOpen]      = useState(false);
  const [slideIdx,  setSlideIdx]  = useState(0);
  const [time,      setTime]      = useState({ h: 0, m: 0, s: 0 });
  const [pw,     setPw]     = useState('');
  const [error,  setError]  = useState('');
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    if (Date.now() >= PUBLIC_OPEN) { router.replace('/'); return; }
    setReady(true);
    setTime(getCountdown());

    const id = setInterval(() => {
      if (Date.now() >= PUBLIC_OPEN) { clearInterval(id); router.replace('/'); return; }
      setTime(getCountdown());
    }, 1000);

    const slideId = setInterval(() => {
      setSlideIdx(i => (i + 1) % SLIDES.length);
    }, 5000);

    return () => { clearInterval(id); clearInterval(slideId); };
  }, [router]);

  useEffect(() => {
    if (ready) setTimeout(() => inputRef.current?.focus(), 200);
  }, [ready]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.replace('/');
      } else {
        setError('Contraseña incorrecta.');
        setPw('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .gate-wrap {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          overflow: hidden;
          padding: 0 24px;
        }

        .gate-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: rgba(0,0,0,0.78);
        }
        .gate-scrim {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.40) 0%,
            rgba(0,0,0,0.00) 30%,
            rgba(0,0,0,0.00) 60%,
            rgba(0,0,0,0.60) 100%
          );
        }
        .gate-noise {
          position: absolute; inset: 0; z-index: 3;
          pointer-events: none; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px;
        }
        .gate-glow {
          position: absolute; z-index: 3;
          left: 50%; top: 55%; transform: translate(-50%, -50%);
          width: min(700px, 90vw); height: 400px;
          background: radial-gradient(ellipse at center, rgba(255,20,20,0.18) 0%, transparent 68%);
          pointer-events: none;
          animation: glow-breathe 3.5s ease-in-out infinite;
        }
        @keyframes glow-breathe {
          0%,100% { opacity: 0.8; }
          50%      { opacity: 1.4; }
        }

        /* ── Logo ── */
        .gate-logo {
          position: absolute; top: clamp(20px, 4vw, 36px); left: clamp(20px, 5vw, 44px);
          z-index: 20;
        }
        .gate-logo img {
          height: clamp(22px, 4vw, 30px); width: auto;
          filter: brightness(0) invert(1); opacity: 0.88;
          display: block;
        }

        /* ── Badge top-right ── */
        .gate-badge {
          position: absolute; top: clamp(20px, 4vw, 36px); right: clamp(20px, 5vw, 44px);
          z-index: 20;
          display: flex; align-items: center; gap: 8px;
        }
        .gate-badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #ff1a1a;
          box-shadow: 0 0 10px rgba(255,26,26,0.90);
          animation: dot-live 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes dot-live {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.7); opacity: 0.4; }
        }
        .gate-badge-text {
          font-size: clamp(9px, 1.8vw, 11px); font-weight: 700;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          white-space: nowrap;
        }

        /* ── Contenido central ── */
        .gate-inner {
          position: relative; z-index: 10;
          display: flex; flex-direction: column;
          align-items: center;
          width: 100%; max-width: 480px;
        }

        /* eyebrow */
        .gate-eyebrow {
          display: flex; align-items: center; gap: 14px;
          margin-bottom: clamp(20px, 4vw, 36px);
        }
        .gate-eyebrow-line { height: 1px; width: 36px; background: rgba(255,255,255,0.16); }
        .gate-eyebrow-text {
          font-size: clamp(9px, 1.8vw, 11px); font-weight: 500;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: rgba(255,255,255,0.38); white-space: nowrap;
        }

        /* headline */
        .gate-headline {
          text-align: center;
          margin-bottom: clamp(12px, 3vw, 24px);
          line-height: 0.88;
        }
        .gate-h-50k {
          display: block;
          font-size: clamp(80px, 22vw, 140px);
          font-weight: 900; letter-spacing: -0.05em; color: #fff;
        }
        .gate-h-eq {
          display: block;
          font-size: clamp(48px, 13vw, 88px);
          font-weight: 900; letter-spacing: -0.04em; color: #ff1a1a;
          margin: clamp(2px, 1vw, 8px) 0;
          animation: eq-blink 2.8s ease-in-out infinite;
          line-height: 1;
        }
        @keyframes eq-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.42; }
        }
        .gate-h-pct {
          display: block;
          font-size: clamp(80px, 22vw, 140px);
          font-weight: 900; letter-spacing: -0.05em; color: #fff;
        }
        .gate-h-off {
          display: block;
          font-size: clamp(80px, 22vw, 140px);
          font-weight: 900; letter-spacing: -0.05em; color: #ff1a1a;
        }

        /* subtítulo */
        .gate-sub {
          font-size: clamp(10px, 2.4vw, 13px); font-weight: 500;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: rgba(255,255,255,0.42); text-align: center; line-height: 1.9;
          margin-bottom: clamp(20px, 4vw, 36px);
        }
        .gate-sub strong { color: rgba(255,255,255,0.80); font-weight: 700; }

        /* divisor */
        .gate-divider {
          width: 100%; height: 1px;
          background: rgba(255,255,255,0.08);
          margin-bottom: clamp(20px, 4vw, 32px);
        }

        /* countdown */
        .gate-cd-label {
          font-size: clamp(9px, 1.8vw, 11px); font-weight: 400;
          letter-spacing: 0.26em; text-transform: uppercase;
          color: rgba(255,255,255,0.28); text-align: center;
          margin-bottom: 14px;
        }
        .gate-cd-row {
          display: flex; align-items: flex-start; justify-content: center;
          gap: clamp(4px, 1.5vw, 10px);
          margin-bottom: clamp(24px, 5vw, 40px);
        }
        .gate-cd-block {
          display: flex; flex-direction: column; align-items: center;
          min-width: clamp(52px, 13vw, 80px);
        }
        .gate-cd-num {
          font-size: clamp(44px, 12vw, 72px);
          font-weight: 900; line-height: 1;
          letter-spacing: -0.04em; color: #fff;
          font-variant-numeric: tabular-nums;
        }
        .gate-cd-unit {
          font-size: clamp(8px, 1.5vw, 10px); font-weight: 400;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.26); margin-top: 4px;
        }
        .gate-cd-sep {
          font-size: clamp(32px, 9vw, 52px); font-weight: 900;
          color: rgba(255,255,255,0.18); line-height: 1;
          padding-bottom: clamp(6px, 2vw, 12px);
          align-self: flex-start;
        }

        /* form */
        .gate-form-label {
          font-size: clamp(9px, 1.8vw, 10px); font-weight: 700;
          letter-spacing: 0.26em; text-transform: uppercase;
          color: rgba(255,255,255,0.32); text-align: center;
          margin-bottom: 14px;
        }
        .gate-form {
          width: 100%; display: flex; flex-direction: column; gap: 10px;
        }
        .gate-input {
          width: 100%; padding: clamp(15px, 3vw, 18px) 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff; font-size: clamp(13px, 3vw, 15px);
          font-weight: 700; letter-spacing: 0.22em;
          text-transform: uppercase; text-align: center;
          font-family: inherit; caret-color: #ff1a1a;
          outline: none; transition: border-color 0.15s;
          -webkit-appearance: none; appearance: none;
        }
        .gate-input::placeholder { color: rgba(255,255,255,0.22); letter-spacing: 0.12em; }
        .gate-input:focus { border-color: rgba(255,255,255,0.40); }
        .gate-input.error { border-color: #ff1a1a; }

        .gate-error {
          font-size: clamp(9px, 1.8vw, 10px); font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: #ff1a1a; text-align: center;
        }
        .gate-btn {
          width: 100%; padding: clamp(15px, 3vw, 18px);
          background: #ff1a1a; border: none; color: #fff;
          font-size: clamp(10px, 2vw, 11px); font-weight: 900;
          letter-spacing: 0.26em; text-transform: uppercase;
          font-family: inherit; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          -webkit-appearance: none; appearance: none;
        }
        .gate-btn:not(:disabled):hover { background: #fff; color: #0a0a0a; }
        .gate-btn:disabled { opacity: 0.40; cursor: not-allowed; }

        /* footer */
        .gate-footer {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 20;
          display: flex; align-items: center; justify-content: space-between;
          padding: clamp(14px, 3vw, 22px) clamp(20px, 5vw, 44px);
          border-top: 1px solid rgba(255,255,255,0.07);
        }
        .gate-footer-text {
          font-size: clamp(9px, 1.8vw, 10px); font-weight: 500;
          letter-spacing: 0.20em; text-transform: lowercase;
          color: rgba(255,255,255,0.24);
        }
      `}</style>

      <div className="gate-wrap">

        {/* Slideshow de fondo — crossfade cada 5s */}
        {SLIDES.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 30%',
              opacity: i === slideIdx ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              zIndex: 0,
            }}
          />
        ))}
        <div className="gate-overlay" />
        <div className="gate-scrim" />
        <div className="gate-noise" />
        <div className="gate-glow" />

        {/* Logo */}
        <div className="gate-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" />
        </div>

        {/* Badge */}
        <div className="gate-badge">
          <div className="gate-badge-dot" />
          <span className="gate-badge-text">Early Access</span>
        </div>

        {/* Contenido */}
        <div className="gate-inner">

          <div className="gate-eyebrow">
            <div className="gate-eyebrow-line" />
            <span className="gate-eyebrow-text">Celebramos juntos</span>
            <div className="gate-eyebrow-line" />
          </div>

          <div className="gate-headline">
            <span className="gate-h-50k">50K</span>
            <span className="gate-h-eq">=</span>
            <span className="gate-h-pct">50<span style={{ color: '#ff1a1a' }}>%</span></span>
            <span className="gate-h-off">OFF</span>
          </div>

          <div className="gate-sub">
            <strong>En toda la tienda</strong>{' · '}Hoy 20hs hasta mañana 22hs
          </div>

          <div className="gate-divider" />

          {/* Countdown a las 20hs */}
          <div className="gate-cd-label">Apertura general en</div>
          <div className="gate-cd-row">
            <div className="gate-cd-block">
              <span className="gate-cd-num">{pad(time.h)}</span>
              <span className="gate-cd-unit">Hrs</span>
            </div>
            <span className="gate-cd-sep">:</span>
            <div className="gate-cd-block">
              <span className="gate-cd-num">{pad(time.m)}</span>
              <span className="gate-cd-unit">Min</span>
            </div>
            <span className="gate-cd-sep">:</span>
            <div className="gate-cd-block">
              <span className="gate-cd-num">{pad(time.s)}</span>
              <span className="gate-cd-unit">Seg</span>
            </div>
          </div>

          {/* Form contraseña */}
          <div className="gate-form-label">Ingresá tu contraseña de acceso</div>
          <form className="gate-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className={`gate-input${error ? ' error' : ''}`}
              type="text"
              inputMode="text"
              value={pw}
              onChange={e => { setPw(e.target.value.toUpperCase()); setError(''); }}
              placeholder="CONTRASEÑA"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            {error && <div className="gate-error">{error}</div>}
            <button
              type="submit"
              className="gate-btn"
              disabled={busy || !pw}
            >
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="gate-footer">
          <span className="gate-footer-text">hypestyle.com.ar</span>
          <span className="gate-footer-text">@hypestyle.ar</span>
        </div>

      </div>
    </>
  );
}
