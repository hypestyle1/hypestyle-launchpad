'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMaradonaEnglandStatus } from '@/hooks/useMaradonaEnglandStatus';

const GOLD = '#D4AF37';
const CELESTE = '#75AADB';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function timeLeft(targetISO: string | null) {
  if (!targetISO) return null;
  const diff = new Date(targetISO).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { d, h, m, s };
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-mono font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(36px, 7vw, 80px)', color: GOLD, letterSpacing: '-0.03em' }}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-white/40">
        {label}
      </span>
    </div>
  );
}

function Countdown({ targetISO }: { targetISO: string | null }) {
  const [t, setT] = useState(() => timeLeft(targetISO));
  useEffect(() => {
    setT(timeLeft(targetISO));
    const id = setInterval(() => setT(timeLeft(targetISO)), 1000);
    return () => clearInterval(id);
  }, [targetISO]);
  if (!t) return null;
  return (
    <div className="flex items-start gap-4 md:gap-8">
      {t.d > 0 && (
        <>
          <TimeUnit value={String(t.d)} label={t.d === 1 ? 'día' : 'días'} />
          <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(30px, 6vw, 70px)' }}>:</span>
        </>
      )}
      <TimeUnit value={pad(t.h)} label="horas" />
      <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(30px, 6vw, 70px)' }}>:</span>
      <TimeUnit value={pad(t.m)} label="minutos" />
      <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(30px, 6vw, 70px)' }}>:</span>
      <TimeUnit value={pad(t.s)} label="segundos" />
    </div>
  );
}

function Star({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

export default function MaradonaEnglandSection() {
  const { data, phase } = useMaradonaEnglandStatus();

  if (!phase || phase === 'none') return null;

  const match = data?.match;

  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#0d1b3d' }}>
      {/* Foto de fondo — reemplazar por la foto real en /public/maradona/1986-inglaterra.jpg */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/maradona/1986-inglaterra.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          filter: 'grayscale(0.25) sepia(0.18) contrast(1.05)',
        }}
      />

      {/* Scrim albiceleste + vintage */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(13,27,61,0.55) 0%, rgba(20,54,111,0.25) 30%, rgba(20,54,111,0.35) 55%, rgba(13,27,61,0.90) 82%, rgba(13,27,61,0.97) 100%),
            linear-gradient(160deg, rgba(117,170,219,0.30) 0%, rgba(13,27,61,0) 45%)
          `,
        }}
      />

      {/* Grano sutil (textura vintage) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px',
        }}
      />

      <div className="relative max-w-[900px] mx-auto px-6 py-16 md:py-20 flex flex-col items-center text-center gap-8">

        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-white/20" />
          <div className="flex items-center gap-1.5">
            <Star size={12} /><Star size={12} /><Star size={12} />
          </div>
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-white/60">
            1986 · La revancha
          </span>
          <div className="h-px w-8 bg-white/20" />
        </div>

        {phase === 'pre' && (
          <>
            <div className="flex flex-col items-center gap-3">
              <h2
                className="font-black uppercase leading-[0.98] tracking-[-0.03em] text-white"
                style={{ fontSize: 'clamp(34px, 7vw, 76px)' }}
              >
                Hoy más argentinos<br />que nunca
              </h2>
              <p
                className="font-black uppercase leading-tight tracking-[0.01em]"
                style={{ fontSize: 'clamp(18px, 3.2vw, 32px)', color: GOLD }}
              >
                Queremos repetir la historia
              </p>
              <p className="font-bold uppercase text-white/60 mt-1" style={{ fontSize: 'clamp(12px, 2vw, 18px)', letterSpacing: '0.12em' }}>
                Argentina vs Inglaterra · Semifinal · Mundial 26&apos;
              </p>
            </div>
            <Countdown targetISO={data?.kickoff ?? null} />
          </>
        )}

        {phase === 'live' && match && (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GOLD }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: GOLD }} />
              </span>
              <span className="text-[13px] font-black tracking-[0.2em] uppercase text-white">En vivo</span>
              {match.elapsed != null && <span className="text-[13px] font-bold text-white/60">{match.elapsed}&apos;</span>}
            </div>
            <h2
              className="font-black uppercase leading-none tracking-[-0.03em] text-white tabular-nums"
              style={{ fontSize: 'clamp(48px, 12vw, 120px)' }}
            >
              {match.argTla} {match.argGoals} <span className="text-white/40">—</span> {match.oppGoals} {match.oppTla}
            </h2>
            <p className="font-black uppercase text-white/70" style={{ fontSize: 'clamp(14px, 2.5vw, 24px)', letterSpacing: '0.1em' }}>
              Semifinal · Mundial 26&apos;
            </p>
          </>
        )}

        {phase === 'won' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] md:text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
              Argentina ganó
            </p>
            <h2
              className="font-black uppercase leading-none tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(40px, 9vw, 100px)' }}
            >
              A LA FINAL
            </h2>
            <p className="font-black uppercase text-white/80" style={{ fontSize: 'clamp(14px, 2.5vw, 24px)', letterSpacing: '0.1em' }}>
              40 años después, otra vez de Inglaterra
            </p>
          </div>
        )}

        {phase === 'lost' && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] md:text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
              Orgullo albiceleste
            </p>
            <h2
              className="font-black uppercase leading-none tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(32px, 7vw, 72px)' }}
            >
              GRACIAS POR EL CAMINO
            </h2>
            <p className="font-black uppercase text-white/70" style={{ fontSize: 'clamp(14px, 2.5vw, 24px)', letterSpacing: '0.1em' }}>
              Mundial 26&apos;
            </p>
          </div>
        )}

        <Link
          href="/productos/"
          className="group inline-flex items-center gap-3 px-8 py-4 font-black text-[11px] tracking-[0.2em] uppercase transition-all duration-200"
          style={{ background: GOLD, color: '#0d1b3d' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = GOLD; }}
        >
          Ver la colección
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
            <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />
    </section>
  );
}
