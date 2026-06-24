'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const EARLY_START = new Date('2026-06-24T19:00:00-03:00').getTime();
const PUBLIC_OPEN  = new Date('2026-06-24T20:00:00-03:00').getTime();

function pad(n: number) { return String(n).padStart(2, '0'); }

function getCountdown(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    h: Math.floor(diff / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

type Phase = 'loading' | 'soon' | 'early' | 'open';

function getPhase(): Phase {
  const now = Date.now();
  if (now >= PUBLIC_OPEN) return 'open';
  if (now >= EARLY_START) return 'early';
  return 'soon';
}

export default function AccesoPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [time,  setTime]  = useState({ h: 0, m: 0, s: 0 });
  const [pw,    setPw]    = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    const p = getPhase();
    setPhase(p);
    setTime(p === 'soon' ? getCountdown(EARLY_START) : getCountdown(PUBLIC_OPEN));
    const id = setInterval(() => {
      const p = getPhase();
      setPhase(p);
      setTime(p === 'soon' ? getCountdown(EARLY_START) : getCountdown(PUBLIC_OPEN));
      if (p === 'open') { clearInterval(id); router.replace('/'); }
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (phase === 'early') setTimeout(() => inputRef.current?.focus(), 100);
  }, [phase]);

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
      if (res.ok) { router.replace('/'); }
      else {
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

  if (phase === 'loading' || phase === 'open') return null;

  return (
    <>
      {/* Estilos globales para esta página */}
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.20; }
        }
        @keyframes eq-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.6); opacity: 0.4; }
        }
        .acceso-input::placeholder { color: rgba(255,255,255,0.22); letter-spacing: 0.14em; }
        .acceso-input:focus { border-color: rgba(255,255,255,0.35) !important; outline: none; }
        .acceso-btn:not(:disabled):hover { background: #fff !important; color: #080808 !important; }
      `}</style>

      {/* Fullscreen overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#060606',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        overflow: 'hidden',
      }}>

        {/* Noise */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px', opacity: 0.04,
        }} />

        {/* Red glow */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(255,30,30,0.16) 0%, transparent 68%)',
          pointerEvents: 'none', zIndex: 0,
          animation: 'glow-pulse 3s ease-in-out infinite',
        }} />

        {/* Logo */}
        <div style={{
          position: 'absolute', top: 32, left: 40, zIndex: 10,
        }}>
          <Image
            src="/logo-hypestyle-2026.png"
            alt="Hypestyle"
            width={140}
            height={40}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.80, height: 28, width: 'auto' }}
            priority
          />
        </div>

        {/* Live badge */}
        <div style={{
          position: 'absolute', top: 36, right: 40, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: '#ff1e1e',
            boxShadow: '0 0 8px rgba(255,30,30,0.80)',
            animation: 'dot-pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
          }}>
            {phase === 'soon' ? 'Próximamente' : 'Early Access'}
          </span>
        </div>

        {/* Contenido central */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 520 }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ height: 1, width: 40, background: 'rgba(255,255,255,0.14)' }} />
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)' }}>
              Celebramos juntos
            </span>
            <div style={{ height: 1, width: 40, background: 'rgba(255,255,255,0.14)' }} />
          </div>

          {/* Headline 50K = 50% OFF */}
          <div style={{ textAlign: 'center', lineHeight: 0.88, marginBottom: 20 }}>
            <div style={{ fontSize: 'clamp(72px, 18vw, 130px)', fontWeight: 900, letterSpacing: '-0.05em', color: '#fff' }}>
              50K
            </div>
            <div style={{
              fontSize: 'clamp(52px, 13vw, 96px)', fontWeight: 900,
              letterSpacing: '-0.03em', color: '#ff1e1e',
              animation: 'eq-blink 2.6s ease-in-out infinite',
              lineHeight: 1, margin: '4px 0',
            }}>
              =
            </div>
            <div style={{ fontSize: 'clamp(72px, 18vw, 130px)', fontWeight: 900, letterSpacing: '-0.05em', color: '#fff', lineHeight: 0.88 }}>
              50<span style={{ color: '#ff1e1e' }}>%</span>
            </div>
            <div style={{ fontSize: 'clamp(72px, 18vw, 130px)', fontWeight: 900, letterSpacing: '-0.05em', color: '#ff1e1e', lineHeight: 0.88 }}>
              OFF
            </div>
          </div>

          {/* Subtítulo */}
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)',
            textAlign: 'center', lineHeight: 1.9, marginBottom: 40,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>En toda la tienda</span>
            {' · '}Hoy 20hs hasta mañana 22hs
          </div>

          {/* Divisor */}
          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 36 }} />

          {/* — SOON: countdown a las 19hs — */}
          {phase === 'soon' && (
            <>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 20, textAlign: 'center' }}>
                Early access abre en
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {[
                  { v: time.h, l: 'Hrs' },
                  { v: time.m, l: 'Min' },
                  { v: time.s, l: 'Seg' },
                ].map(({ v, l }, i, arr) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                      <span style={{ fontSize: 72, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {pad(v)}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.26)', marginTop: 4 }}>
                        {l}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span style={{ fontSize: 52, fontWeight: 900, color: 'rgba(255,255,255,0.16)', lineHeight: 1, paddingBottom: 8 }}>:</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', textAlign: 'center' }}>
                Apertura general: 20:00hs — 50% OFF para todos
              </div>
            </>
          )}

          {/* — EARLY: form contraseña — */}
          {phase === 'early' && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)', marginBottom: 16, textAlign: 'center' }}>
                Ingresá la contraseña para entrar
              </div>

              <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  ref={inputRef}
                  className="acceso-input"
                  type="text"
                  value={pw}
                  onChange={e => { setPw(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="CONTRASEÑA"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%', padding: '18px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${error ? '#ff1e1e' : 'rgba(255,255,255,0.14)'}`,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    letterSpacing: '0.26em', textTransform: 'uppercase',
                    textAlign: 'center', caretColor: '#ff1e1e',
                    fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                />
                {error && (
                  <div style={{ fontSize: 10, color: '#ff1e1e', letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy || !pw}
                  className="acceso-btn"
                  style={{
                    width: '100%', padding: '18px',
                    background: '#ff1e1e', border: 'none',
                    color: '#fff', fontSize: 11, fontWeight: 900,
                    letterSpacing: '0.24em', textTransform: 'uppercase',
                    cursor: busy || !pw ? 'not-allowed' : 'pointer',
                    opacity: busy || !pw ? 0.45 : 1,
                    fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {busy ? 'Verificando…' : 'Entrar'}
                </button>
              </form>

              {/* Countdown a las 20hs — ambient */}
              <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  {[
                    { v: time.h, l: 'Hrs' },
                    { v: time.m, l: 'Min' },
                    { v: time.s, l: 'Seg' },
                  ].map(({ v, l }, i, arr) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52 }}>
                        <span style={{ fontSize: 44, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {pad(v)}
                        </span>
                        <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.16)', marginTop: 3 }}>
                          {l}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <span style={{ fontSize: 32, fontWeight: 900, color: 'rgba(255,255,255,0.10)', lineHeight: 1, paddingBottom: 6 }}>:</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>
                  hasta apertura general — 20:00hs
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 40px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 10,
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
            hypestyle.com.ar
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
            @hypestyle.ar
          </span>
        </div>

      </div>
    </>
  );
}
