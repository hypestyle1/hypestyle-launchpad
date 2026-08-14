'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PUBLIC_OPEN = new Date('2026-06-24T20:00:00-03:00').getTime();

const SLIDES = [
  '/polo-gate-1.jpeg',
  '/polo-gate-2.jpeg',
  '/fw26-camo-editorial.jpg',
  '/banner-hero (2).jpg',
  '/founders-photo.jpg',
  '/banner-hero (3).jpg',
  '/No Love, Only Style banner.webp',
  '/editorial-may26.png',
  '/stl-look-camo-outdoor.webp',
  '/Banner Movile/2-slide-1774199985089-7163840392-14dbaf7acdc4aaa8e83700e9e1d4f6b51774199990-1920-1920.webp',
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
  const [ready,    setReady]    = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [time,     setTime]     = useState({ h: 0, m: 0, s: 0 });
  const [pw,       setPw]       = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (Date.now() >= PUBLIC_OPEN) { router.replace('/'); return; }
    setReady(true);
    setTime(getCountdown());

    const tick = setInterval(() => {
      if (Date.now() >= PUBLIC_OPEN) { clearInterval(tick); router.replace('/'); return; }
      setTime(getCountdown());
    }, 1000);

    const slide = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 5000);

    return () => { clearInterval(tick); clearInterval(slide); };
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

        .g { position: fixed; inset: 0; z-index: 9999; overflow: hidden;
             font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }

        /* ── Fondo con blur ── */
        .g-slide {
          position: absolute; inset: -24px; z-index: 0;
          background-size: cover; background-position: center;
          filter: blur(18px) brightness(0.45) saturate(1.1);
          transform: scale(1.08);
          transition: opacity 1.4s ease-in-out;
        }

        /* ── Scrim gradiente ── */
        .g-scrim {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(
            160deg,
            rgba(0,0,0,.35) 0%,
            rgba(0,0,0,.10) 40%,
            rgba(0,0,0,.10) 60%,
            rgba(0,0,0,.50) 100%
          );
        }

        /* ── Logo ── */
        .g-logo {
          position: absolute; top: clamp(22px,4vw,34px); left: clamp(22px,4vw,40px);
          z-index: 30;
        }
        .g-logo img {
          height: clamp(20px,3.2vw,26px); width: auto;
          filter: brightness(0) invert(1); opacity: .92; display: block;
        }

        /* ── Badge top-right ── */
        .g-badge {
          position: absolute; top: clamp(22px,4vw,34px); right: clamp(22px,4vw,40px);
          z-index: 30; display: flex; align-items: center; gap: 7px;
        }
        .g-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          background: #ff2020; box-shadow: 0 0 8px rgba(255,32,32,.9);
          animation: dot 2s ease-in-out infinite;
        }
        @keyframes dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.8);opacity:.35} }
        .g-badge span {
          font-size: 10px; font-weight: 700; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(255,255,255,.45);
        }

        /* ── Contenedor centrado ── */
        .g-center {
          position: absolute; inset: 0; z-index: 20;
          display: flex; align-items: center; justify-content: center;
          padding: 80px 20px;
        }

        /* ── Card liquid glass ── */
        .g-card {
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,.09);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border: 1px solid rgba(255,255,255,.18);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.22),
            inset 0 -1px 0 rgba(255,255,255,.06),
            0 20px 60px rgba(0,0,0,.35);
          padding: clamp(28px,5vw,44px) clamp(24px,4vw,36px);
          display: flex; flex-direction: column;
          align-items: center; gap: clamp(20px,3.5vw,28px);
        }

        /* eyebrow */
        .g-eyebrow {
          display: flex; align-items: center; gap: 12px; width: 100%;
        }
        .g-eyebrow-line { flex: 1; height: 1px; background: rgba(255,255,255,.18); }
        .g-eyebrow-text {
          font-size: 9px; font-weight: 600; letter-spacing: .26em;
          text-transform: uppercase; color: rgba(255,255,255,.5); white-space: nowrap;
        }

        /* headline */
        .g-headline { text-align: center; line-height: .88; }
        .g-h1 {
          display: block; font-size: clamp(56px,14vw,100px);
          font-weight: 900; letter-spacing: -.04em; color: #fff;
        }
        .g-h2 {
          display: block; font-size: clamp(56px,14vw,100px);
          font-weight: 900; letter-spacing: -.04em; color: #ff2020;
          animation: flicker 3s ease-in-out infinite;
        }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:.5} }

        /* sub */
        .g-sub {
          font-size: clamp(9px,2vw,11px); font-weight: 500;
          letter-spacing: .14em; text-transform: uppercase;
          color: rgba(255,255,255,.45); text-align: center; line-height: 1.8;
        }

        /* separador */
        .g-divider { width: 100%; height: 1px; background: rgba(255,255,255,.12); }

        /* form */
        .g-form { width: 100%; display: flex; flex-direction: column; gap: 8px; }
        .g-input {
          width: 100%; padding: clamp(15px,3vw,18px) 14px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.2);
          color: #fff; font-size: clamp(13px,2.8vw,15px); font-weight: 700;
          letter-spacing: .2em; text-transform: uppercase; text-align: center;
          font-family: inherit; caret-color: #ff2020; outline: none;
          transition: border-color .15s, background .15s;
          -webkit-appearance: none; appearance: none;
          backdrop-filter: blur(4px);
        }
        .g-input::placeholder { color: rgba(255,255,255,.2); letter-spacing: .1em; }
        .g-input:focus {
          border-color: rgba(255,255,255,.45);
          background: rgba(255,255,255,.10);
        }
        .g-input.err { border-color: #ff2020; }
        .g-error {
          font-size: 10px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: #ff2020; text-align: center;
        }
        .g-btn {
          width: 100%; padding: clamp(15px,3vw,18px);
          background: #ff2020; border: none; color: #fff;
          font-size: 11px; font-weight: 900; letter-spacing: .24em;
          text-transform: uppercase; font-family: inherit; cursor: pointer;
          transition: background .15s, color .15s;
          -webkit-appearance: none; appearance: none;
        }
        .g-btn:not(:disabled):hover { background: #fff; color: #0a0a0a; }
        .g-btn:disabled { opacity: .38; cursor: not-allowed; }

        /* countdown */
        .g-cd { display: flex; align-items: flex-start; justify-content: center; gap: 0; }
        .g-cd-col { display: flex; flex-direction: column; align-items: center; min-width: clamp(44px,11vw,66px); }
        .g-cd-n {
          font-size: clamp(34px,8.5vw,54px); font-weight: 900; line-height: 1;
          letter-spacing: -.03em; color: #fff; font-variant-numeric: tabular-nums;
        }
        .g-cd-u {
          font-size: 8px; font-weight: 400; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(255,255,255,.28); margin-top: 3px;
        }
        .g-cd-sep {
          font-size: clamp(26px,6.5vw,42px); font-weight: 900;
          color: rgba(255,255,255,.2); line-height: 1;
          padding-bottom: clamp(3px,1vw,7px); align-self: flex-start;
          margin: 0 1px;
        }

        /* limit note */
        .g-limit {
          font-size: clamp(8px,1.6vw,10px); font-weight: 500;
          letter-spacing: .16em; text-transform: uppercase;
          color: rgba(255,255,255,.3); text-align: center; line-height: 1.7;
        }
        .g-limit strong { color: rgba(255,255,255,.55); font-weight: 700; }

        /* ── Footer ── */
        .g-footer {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 30;
          display: flex; justify-content: space-between;
          padding: clamp(12px,2.5vw,18px) clamp(22px,4vw,40px);
          border-top: 1px solid rgba(255,255,255,.08);
        }
        .g-footer span {
          font-size: 9px; font-weight: 400; letter-spacing: .18em;
          text-transform: lowercase; color: rgba(255,255,255,.22);
        }
      `}</style>

      <div className="g">

        {/* Slideshow — blurred */}
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className="g-slide"
            style={{
              backgroundImage: `url('${src}')`,
              opacity: i === slideIdx ? 1 : 0,
            }}
          />
        ))}
        <div className="g-scrim" />

        {/* Logo */}
        <div className="g-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" />
        </div>

        {/* Badge */}
        <div className="g-badge">
          <div className="g-dot" />
          <span>Early Access</span>
        </div>

        {/* Card centrada */}
        <div className="g-center">
          <div className="g-card">

            <div className="g-eyebrow">
              <div className="g-eyebrow-line" />
              <span className="g-eyebrow-text">50.000 en Instagram</span>
              <div className="g-eyebrow-line" />
            </div>

            <div className="g-headline">
              <span className="g-h1">50K =</span>
              <span className="g-h2">50% OFF</span>
            </div>

            <p className="g-sub">En toda la tienda · Solo hoy</p>

            <div className="g-divider" />

            <form className="g-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                className={`g-input${error ? ' err' : ''}`}
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
              {error && <div className="g-error">{error}</div>}
              <button type="submit" className="g-btn" disabled={busy || !pw}>
                {busy ? 'Verificando…' : 'Entrar al early access'}
              </button>
            </form>

            <div className="g-divider" />

            <div className="g-cd">
              <div className="g-cd-col">
                <span className="g-cd-n">{pad(time.h)}</span>
                <span className="g-cd-u">Hrs</span>
              </div>
              <span className="g-cd-sep">:</span>
              <div className="g-cd-col">
                <span className="g-cd-n">{pad(time.m)}</span>
                <span className="g-cd-u">Min</span>
              </div>
              <span className="g-cd-sep">:</span>
              <div className="g-cd-col">
                <span className="g-cd-n">{pad(time.s)}</span>
                <span className="g-cd-u">Seg</span>
              </div>
            </div>

            <p className="g-limit">
              <strong>Oferta limitada</strong> · Por 24hs o hasta<br />las primeras 100 órdenes
            </p>

          </div>
        </div>


      </div>
    </>
  );
}
