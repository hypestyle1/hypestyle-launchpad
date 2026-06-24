'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const PUBLIC_OPEN = new Date('2026-06-24T20:00:00-03:00').getTime();
const ORDER_LIMIT = 100;

const SLIDES = [
  '/polo-gate-1.jpeg',
  '/polo-gate-2.jpeg',
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
  const [orders,   setOrders]   = useState<{ count: number } | null>(null);

  useEffect(() => {
    if (Date.now() >= PUBLIC_OPEN) { router.replace('/'); return; }
    setReady(true);
    setTime(getCountdown());

    const tick = setInterval(() => {
      if (Date.now() >= PUBLIC_OPEN) { clearInterval(tick); router.replace('/'); return; }
      setTime(getCountdown());
    }, 1000);

    const slide = setInterval(() => setSlideIdx(i => (i + 1) % SLIDES.length), 5000);

    async function fetchOrders() {
      try {
        const r = await fetch('/api/flash-sale-status');
        const d = await r.json();
        setOrders({ count: d.count });
      } catch {}
    }
    fetchOrders();
    const poll = setInterval(fetchOrders, 30_000);

    return () => { clearInterval(tick); clearInterval(slide); clearInterval(poll); };
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

  const orderCount = orders?.count ?? 0;
  const orderPct   = Math.min(100, Math.round((orderCount / ORDER_LIMIT) * 100));

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .g-wrap {
          position: fixed; inset: 0; z-index: 9999;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          overflow: hidden;
        }

        /* Fondo */
        .g-bg {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 1;
        }

        /* Logo */
        .g-logo {
          position: absolute; top: clamp(20px,4vw,32px); left: clamp(20px,5vw,40px);
          z-index: 20;
        }
        .g-logo img {
          height: clamp(20px,3.5vw,26px); width: auto;
          filter: brightness(0) invert(1); opacity: 0.9; display: block;
        }

        /* Badge */
        .g-badge {
          position: absolute; top: clamp(20px,4vw,32px); right: clamp(20px,5vw,40px);
          z-index: 20; display: flex; align-items: center; gap: 7px;
        }
        .g-badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #ff1a1a;
          box-shadow: 0 0 8px rgba(255,26,26,0.9);
          animation: pulse 2s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.7);opacity:.4} }
        .g-badge-text {
          font-size: 10px; font-weight: 700; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(255,255,255,.4); white-space: nowrap;
        }

        /* Layout principal: columna centrada */
        .g-center {
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 24px 100px;
          gap: clamp(20px, 4vw, 32px);
        }

        /* Headline */
        .g-headline {
          text-align: center; line-height: .88; letter-spacing: -.04em;
          font-weight: 900;
        }
        .g-h-white { color: #fff; font-size: clamp(72px,18vw,130px); display: block; }
        .g-h-red   { color: #ff1a1a; font-size: clamp(72px,18vw,130px); display: block;
                     animation: blink 2.8s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.45} }

        /* Form */
        .g-form { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 8px; }
        .g-input {
          width: 100%; padding: clamp(16px,3.5vw,20px) 16px;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.25);
          color: #fff; font-size: clamp(14px,3vw,16px); font-weight: 700;
          letter-spacing: .2em; text-transform: uppercase; text-align: center;
          font-family: inherit; caret-color: #ff1a1a; outline: none;
          transition: border-color .15s, background .15s;
          -webkit-appearance: none; appearance: none;
        }
        .g-input::placeholder { color: rgba(255,255,255,.25); letter-spacing: .1em; }
        .g-input:focus { border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.12); }
        .g-input.err { border-color: #ff1a1a; }
        .g-error {
          font-size: 10px; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase; color: #ff1a1a; text-align: center;
        }
        .g-btn {
          width: 100%; padding: clamp(16px,3.5vw,20px);
          background: #ff1a1a; border: none; color: #fff;
          font-size: 11px; font-weight: 900; letter-spacing: .24em;
          text-transform: uppercase; font-family: inherit; cursor: pointer;
          transition: background .15s, color .15s; -webkit-appearance: none; appearance: none;
        }
        .g-btn:not(:disabled):hover { background: #fff; color: #0a0a0a; }
        .g-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* Bloque inferior: countdown + cupos */
        .g-bottom {
          width: 100%; max-width: 400px;
          display: flex; flex-direction: column; align-items: center;
          gap: clamp(14px,3vw,22px);
        }
        .g-sep { width: 100%; height: 1px; background: rgba(255,255,255,.1); }

        /* Countdown */
        .g-cd { display: flex; align-items: flex-start; justify-content: center; gap: 2px; }
        .g-cd-block { display: flex; flex-direction: column; align-items: center; min-width: clamp(40px,10vw,60px); }
        .g-cd-num {
          font-size: clamp(32px,8vw,52px); font-weight: 900; line-height: 1;
          letter-spacing: -.03em; color: #fff; font-variant-numeric: tabular-nums;
        }
        .g-cd-label {
          font-size: 8px; font-weight: 400; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(255,255,255,.3); margin-top: 3px;
        }
        .g-cd-sep {
          font-size: clamp(24px,6vw,40px); font-weight: 900;
          color: rgba(255,255,255,.2); line-height: 1;
          padding-bottom: clamp(4px,1vw,8px); align-self: flex-start;
          margin: 0 2px;
        }

        /* Barra FOMO */
        .g-fomo { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .g-fomo-row { display: flex; justify-content: space-between; align-items: center; }
        .g-fomo-tag {
          font-size: 9px; font-weight: 500; letter-spacing: .18em;
          text-transform: uppercase; color: rgba(255,255,255,.35);
        }
        .g-fomo-num {
          font-size: 12px; font-weight: 900; color: #ff1a1a;
          font-variant-numeric: tabular-nums;
        }
        .g-fomo-bar { width: 100%; height: 2px; background: rgba(255,255,255,.1); }
        .g-fomo-fill {
          height: 100%; background: #ff1a1a;
          transition: width .8s ease;
        }

        /* Footer */
        .g-footer {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 20;
          display: flex; justify-content: space-between;
          padding: clamp(12px,2.5vw,20px) clamp(20px,5vw,40px);
          border-top: 1px solid rgba(255,255,255,.07);
        }
        .g-footer span {
          font-size: 9px; font-weight: 500; letter-spacing: .18em;
          text-transform: lowercase; color: rgba(255,255,255,.2);
        }
      `}</style>

      <div className="g-wrap">

        {/* Slideshow */}
        {SLIDES.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            opacity: i === slideIdx ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out', zIndex: 0,
          }} />
        ))}
        <div className="g-bg" />

        {/* Logo */}
        <div className="g-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" />
        </div>

        {/* Badge */}
        <div className="g-badge">
          <div className="g-badge-dot" />
          <span className="g-badge-text">Early Access</span>
        </div>

        {/* Centro */}
        <div className="g-center">

          {/* Headline */}
          <div className="g-headline">
            <span className="g-h-white">50K =</span>
            <span className="g-h-red">50% OFF</span>
          </div>

          {/* Form */}
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
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          {/* Countdown + FOMO */}
          <div className="g-bottom">
            <div className="g-sep" />

            <div className="g-cd">
              <div className="g-cd-block">
                <span className="g-cd-num">{pad(time.h)}</span>
                <span className="g-cd-label">Hrs</span>
              </div>
              <span className="g-cd-sep">:</span>
              <div className="g-cd-block">
                <span className="g-cd-num">{pad(time.m)}</span>
                <span className="g-cd-label">Min</span>
              </div>
              <span className="g-cd-sep">:</span>
              <div className="g-cd-block">
                <span className="g-cd-num">{pad(time.s)}</span>
                <span className="g-cd-label">Seg</span>
              </div>
            </div>

            <div className="g-fomo">
              <div className="g-fomo-row">
                <span className="g-fomo-tag">Cupos tomados</span>
                <span className="g-fomo-num">{orderCount} / {ORDER_LIMIT}</span>
              </div>
              <div className="g-fomo-bar">
                <div className="g-fomo-fill" style={{ width: `${orderPct}%` }} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="g-footer">
          <span>hypestyle.com.ar</span>
          <span>@hypestyle.ar</span>
        </div>

      </div>
    </>
  );
}
