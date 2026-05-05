'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const UNLOCK_KEY = 'hype_unlocked_v1';
const PASSWORD = 'MEGADROP'; // cambiar antes del lanzamiento
const HOT_SALE = new Date('2026-05-10T00:00:00-03:00');

/* ── Countdown ─────────────────────────────────────────────────────── */
function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ── Digit con animación blur-slide ────────────────────────────────── */
function Digit({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (value === display) return;
    setAnim(true);
    const t = setTimeout(() => { setDisplay(value); setAnim(false); }, 220);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'opacity 220ms, transform 220ms, filter 220ms',
        opacity: anim ? 0 : 1,
        transform: anim ? 'translateY(-10px) scale(0.88)' : 'translateY(0) scale(1)',
        filter: anim ? 'blur(6px)' : 'blur(0)',
      }}
    >
      {String(display).padStart(2, '0')}
    </span>
  );
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className="text-[58px] md:text-[82px] font-bold text-white leading-none tabular-nums"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
      >
        <Digit value={value} />
      </div>
      <span className="text-[8px] uppercase tracking-[0.35em] text-white/25">{label}</span>
    </div>
  );
}

/* ── Gate principal ────────────────────────────────────────────────── */
export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 });
  const { d, h, m, s } = useCountdown(HOT_SALE);

  useEffect(() => {
    setUnlocked(!!localStorage.getItem(UNLOCK_KEY));
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [onMouseMove]);

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().toUpperCase() === PASSWORD) {
      localStorage.setItem(UNLOCK_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setShake(true);
      setInput('');
      setTimeout(() => { setShake(false); setError(false); }, 1600);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none">

      {/* ── Video de fondo ── */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45 }}
        >
          <source src="/gate-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Cursor spotlight (desktop) ── */}
      <div
        className="absolute inset-0 pointer-events-none hidden md:block"
        style={{
          background: `radial-gradient(circle 320px at ${mouse.x}px ${mouse.y}px, transparent 0%, rgba(0,0,0,0.9) 100%)`,
          transition: 'background 0.05s linear',
        }}
      />

      {/* ── Grain texture ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px',
        }}
      />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* ── Contenido ── */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-10 md:py-14 px-6">

        {/* Logo */}
        <img
          src="/logo-hypestyle-2026.png"
          alt="Hypestyle"
          className="h-6 w-auto object-contain"
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
        />

        {/* Centro */}
        <div className="flex flex-col items-center text-center">

          {/* Badge */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px w-8 bg-white/15" />
            <span className="text-[8px] uppercase tracking-[0.45em] text-white/30">Hot Sale · 10 — 13 Mayo</span>
            <div className="h-px w-8 bg-white/15" />
          </div>

          {/* Countdown */}
          <div className="flex items-start gap-3 md:gap-7">
            <CountUnit value={d} label="Días" />
            <span className="text-[36px] md:text-[56px] font-thin text-white/15 leading-none mt-1 md:mt-2">:</span>
            <CountUnit value={h} label="Horas" />
            <span className="text-[36px] md:text-[56px] font-thin text-white/15 leading-none mt-1 md:mt-2">:</span>
            <CountUnit value={m} label="Min" />
            <span className="text-[36px] md:text-[56px] font-thin text-white/15 leading-none mt-1 md:mt-2">:</span>
            <CountUnit value={s} label="Seg" />
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4 my-10">
            <div className="h-px w-12 bg-white/10" />
            <div className="w-1 h-1 rounded-full bg-white/15" />
            <div className="h-px w-12 bg-white/10" />
          </div>

          {/* Form */}
          <p className="text-[9px] uppercase tracking-[0.4em] text-white/25 mb-6">
            Acceso exclusivo — ingresá tu contraseña
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center gap-4 w-full"
            style={shake ? { animation: 'hype-shake 0.45s ease' } : {}}
          >
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value.toUpperCase()); setError(false); }}
              placeholder="· · · · · · · ·"
              autoComplete="off"
              spellCheck={false}
              className={`w-full max-w-[260px] bg-transparent border-b text-white text-center text-[15px] tracking-[0.4em] py-3 placeholder:text-white/15 focus:outline-none transition-colors duration-300 ${
                error ? 'border-red-400/50' : 'border-white/15 focus:border-white/40'
              }`}
            />

            {error && (
              <p className="text-[9px] uppercase tracking-[0.2em] text-red-400/60 -mt-1">
                Contraseña incorrecta
              </p>
            )}

            <button
              type="submit"
              className="group relative mt-1 overflow-hidden border border-white/20 hover:border-white/40 px-14 py-3.5 transition-colors duration-300"
            >
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-out" />
              <span className="relative z-10 text-[10px] uppercase tracking-[0.35em] text-white group-hover:text-black transition-colors duration-150 delay-150">
                Entrar
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-[8px] text-white/12 tracking-[0.2em] uppercase">
          Style&Culture · Est. 2018 · Buenos Aires
        </p>
      </div>

      <style jsx global>{`
        @keyframes hype-shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-12px); }
          30%       { transform: translateX(12px); }
          50%       { transform: translateX(-7px); }
          65%       { transform: translateX(7px); }
          80%       { transform: translateX(-3px); }
        }
      `}</style>
    </div>
  );
}
