'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  if (now >= PUBLIC_OPEN)  return 'open';
  if (now >= EARLY_START)  return 'early';
  return 'soon';
}

export default function AccesoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [time, setTime]   = useState({ h: 0, m: 0, s: 0 });
  const [pw, setPw]       = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (phase === 'early') inputRef.current?.focus();
  }, [phase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'loading' || phase === 'open') return null;

  const S = {
    wrap: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 9999,
      background: '#080808',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    },
    logo: {
      fontSize: 52,
      fontWeight: 900,
      color: '#fff',
      letterSpacing: '-0.04em',
      lineHeight: 1,
      marginBottom: 64,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.28em',
      textTransform: 'uppercase' as const,
      color: '#ff2020',
      marginBottom: 20,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '0.20em',
      textTransform: 'uppercase' as const,
      color: 'rgba(255,255,255,0.36)',
      marginBottom: 52,
      textAlign: 'center' as const,
      lineHeight: 1.8,
    },
    cdRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
    },
    cdBlock: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      minWidth: 72,
    },
    cdNum: (dim?: boolean) => ({
      fontSize: dim ? 52 : 68,
      fontWeight: 900,
      lineHeight: 1,
      letterSpacing: '-0.04em',
      fontVariantNumeric: 'tabular-nums' as const,
      color: dim ? 'rgba(255,255,255,0.22)' : '#fff',
    }),
    cdUnit: (dim?: boolean) => ({
      fontSize: 9,
      fontWeight: 500,
      letterSpacing: '0.22em',
      textTransform: 'uppercase' as const,
      color: dim ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.28)',
      marginTop: 4,
    }),
    cdSep: (dim?: boolean) => ({
      fontSize: dim ? 40 : 52,
      fontWeight: 900,
      color: dim ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.18)',
      lineHeight: 1,
      paddingBottom: 10,
      alignSelf: 'flex-start' as const,
    }),
    divider: {
      width: '100%',
      maxWidth: 360,
      height: 1,
      background: 'rgba(255,255,255,0.07)',
      margin: '48px 0',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: 12,
      width: '100%',
      maxWidth: 360,
    },
    input: (hasError: boolean) => ({
      width: '100%',
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${hasError ? '#ff2020' : 'rgba(255,255,255,0.12)'}`,
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase' as const,
      textAlign: 'center' as const,
      outline: 'none',
      caretColor: '#ff2020',
      fontFamily: 'inherit',
    }),
    btn: (disabled: boolean) => ({
      width: '100%',
      padding: '16px',
      background: disabled ? 'rgba(255,32,32,0.4)' : '#ff2020',
      border: 'none',
      color: '#fff',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '0.24em',
      textTransform: 'uppercase' as const,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
      fontFamily: 'inherit',
    }),
    errorText: {
      fontSize: 10,
      color: '#ff2020',
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      textAlign: 'center' as const,
    },
    cdNote: {
      fontSize: 10,
      letterSpacing: '0.16em',
      textTransform: 'uppercase' as const,
      color: 'rgba(255,255,255,0.18)',
      marginTop: 10,
      textAlign: 'center' as const,
    },
  };

  return (
    <div style={S.wrap}>
      <div style={S.logo}>Hype.</div>

      {phase === 'soon' ? (
        <>
          <div style={S.eyebrow}>Early Access</div>
          <div style={S.subtitle}>
            Abre para mejores amigos a las 19:00hs<br />
            Apertura general: 20:00hs — 50% OFF
          </div>

          <div style={S.cdRow}>
            <div style={S.cdBlock}>
              <span style={S.cdNum()}>{pad(time.h)}</span>
              <span style={S.cdUnit()}>Hrs</span>
            </div>
            <span style={S.cdSep()}>:</span>
            <div style={S.cdBlock}>
              <span style={S.cdNum()}>{pad(time.m)}</span>
              <span style={S.cdUnit()}>Min</span>
            </div>
            <span style={S.cdSep()}>:</span>
            <div style={S.cdBlock}>
              <span style={S.cdNum()}>{pad(time.s)}</span>
              <span style={S.cdUnit()}>Seg</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={S.eyebrow}>50K — Early Access</div>
          <div style={S.subtitle}>Ingresá la contraseña para entrar</div>

          <form onSubmit={handleSubmit} style={S.form}>
            <input
              ref={inputRef}
              type="text"
              value={pw}
              onChange={e => { setPw(e.target.value.toUpperCase()); setError(''); }}
              placeholder="••••••••"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              style={S.input(!!error)}
            />
            {error && <div style={S.errorText}>{error}</div>}
            <button type="submit" disabled={busy || !pw} style={S.btn(busy || !pw)}>
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          <div style={S.divider} />

          <div style={S.cdRow}>
            <div style={S.cdBlock}>
              <span style={S.cdNum(true)}>{pad(time.h)}</span>
              <span style={S.cdUnit(true)}>Hrs</span>
            </div>
            <span style={S.cdSep(true)}>:</span>
            <div style={S.cdBlock}>
              <span style={S.cdNum(true)}>{pad(time.m)}</span>
              <span style={S.cdUnit(true)}>Min</span>
            </div>
            <span style={S.cdSep(true)}>:</span>
            <div style={S.cdBlock}>
              <span style={S.cdNum(true)}>{pad(time.s)}</span>
              <span style={S.cdUnit(true)}>Seg</span>
            </div>
          </div>
          <div style={S.cdNote}>hasta apertura general — 20:00hs</div>
        </>
      )}
    </div>
  );
}
