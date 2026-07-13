'use client';

import { useEffect, useState } from 'react';
import { useMaradonaEnglandStatus } from '@/hooks/useMaradonaEnglandStatus';

const GOLD = '#D4AF37';

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
    <div className="flex flex-col items-start gap-1">
      <span
        className="font-mono font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: GOLD, letterSpacing: '-0.03em' }}
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
    <div className="flex items-start gap-3 md:gap-6">
      {t.d > 0 && (
        <>
          <TimeUnit value={String(t.d)} label={t.d === 1 ? 'día' : 'días'} />
          <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(26px, 5vw, 56px)' }}>:</span>
        </>
      )}
      <TimeUnit value={pad(t.h)} label="horas" />
      <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(26px, 5vw, 56px)' }}>:</span>
      <TimeUnit value={pad(t.m)} label="minutos" />
      <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(26px, 5vw, 56px)' }}>:</span>
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

const IMG_SRC = '/maradona/maradona-vs-england.jpg';

export default function MaradonaEnglandSection() {
  const { data, phase } = useMaradonaEnglandStatus();

  if (!phase || phase === 'none') return null;

  const match = data?.match;

  const content = (
    <div className="flex flex-col items-start gap-6 text-left">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Star size={12} /><Star size={12} /><Star size={12} />
        </div>
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-white/60">
          1986 · La historia se repite
        </span>
      </div>

      {phase === 'pre' && (
        <>
          <div className="flex flex-col items-start gap-3">
            <h2
              className="font-black uppercase leading-[0.98] tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(30px, 6vw, 64px)' }}
            >
              Hoy más argentinos<br />que nunca
            </h2>
            <p
              className="font-black uppercase leading-tight tracking-[0.01em]"
              style={{ fontSize: 'clamp(16px, 2.6vw, 26px)', color: GOLD }}
            >
              Queremos repetir la historia
            </p>
            <p className="font-bold uppercase text-white/60" style={{ fontSize: 'clamp(11px, 1.6vw, 15px)', letterSpacing: '0.12em' }}>
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
            style={{ fontSize: 'clamp(40px, 9vw, 88px)' }}
          >
            {match.argTla} {match.argGoals} <span className="text-white/40">—</span> {match.oppGoals} {match.oppTla}
          </h2>
          <p className="font-black uppercase text-white/70" style={{ fontSize: 'clamp(12px, 2vw, 18px)', letterSpacing: '0.1em' }}>
            Semifinal · Mundial 26&apos;
          </p>
        </>
      )}

      {phase === 'won' && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-[13px] md:text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            Argentina ganó
          </p>
          <h2
            className="font-black uppercase leading-none tracking-[-0.03em] text-white"
            style={{ fontSize: 'clamp(34px, 7vw, 72px)' }}
          >
            A LA FINAL
          </h2>
          <p className="font-black uppercase text-white/80" style={{ fontSize: 'clamp(12px, 2vw, 18px)', letterSpacing: '0.1em' }}>
            40 años después, otra vez de Inglaterra
          </p>
        </div>
      )}

      {phase === 'lost' && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-[13px] md:text-[16px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            Orgullo albiceleste
          </p>
          <h2
            className="font-black uppercase leading-none tracking-[-0.03em] text-white"
            style={{ fontSize: 'clamp(28px, 6vw, 56px)' }}
          >
            GRACIAS POR EL CAMINO
          </h2>
          <p className="font-black uppercase text-white/70" style={{ fontSize: 'clamp(12px, 2vw, 18px)', letterSpacing: '0.1em' }}>
            Mundial 26&apos;
          </p>
        </div>
      )}
    </div>
  );

  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#0d1b3d' }}>

      {/* Mobile: la foto entera, sin recortar (ancho completo, alto natural) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={IMG_SRC} alt="Maradona vs Inglaterra, México 86'" className="block md:hidden w-full h-auto" />
      <div className="md:hidden px-6 py-10">
        {content}
      </div>

      {/* Desktop: banner full-bleed, texto a la izquierda para no tapar a Diego (a la derecha en la foto) */}
      <div className="hidden md:block relative" style={{ minHeight: '600px' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${IMG_SRC}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to right, rgba(13,27,61,0.94) 0%, rgba(13,27,61,0.80) 32%, rgba(13,27,61,0.30) 58%, rgba(13,27,61,0) 78%),
              linear-gradient(to bottom, rgba(13,27,61,0.35) 0%, rgba(13,27,61,0) 18%, rgba(13,27,61,0) 82%, rgba(13,27,61,0.45) 100%)
            `,
          }}
        />
        <div className="relative h-full flex items-center" style={{ minHeight: '600px' }}>
          <div className="max-w-[520px] pl-16 lg:pl-24 pr-8 py-16">
            {content}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />
    </section>
  );
}
