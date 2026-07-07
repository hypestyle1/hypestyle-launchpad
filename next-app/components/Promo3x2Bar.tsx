'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePromo3x2Status } from '@/hooks/usePromo3x2Status';

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

const GOLD = '#D4AF37';
const CELESTE = '#75AADB';

function Star({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
      <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.9l-6.18 3.25L7 12.14 2 7.27l6.91-1.01L12 0z" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Star /><Star /><Star />
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
    <div className="flex items-center gap-px font-mono text-[13px] font-bold tabular-nums shrink-0" style={{ color: GOLD }}>
      {t.d > 0 && <><span>{t.d}d</span><span className="text-white/40 mx-[3px]">·</span></>}
      <span>{pad(t.h)}</span>
      <span className="text-white/40 mx-[2px]">:</span>
      <span>{pad(t.m)}</span>
      <span className="text-white/40 mx-[2px]">:</span>
      <span>{pad(t.s)}</span>
    </div>
  );
}

export default function Promo3x2Bar() {
  const pathname = usePathname();
  const { data, phase } = usePromo3x2Status();

  if (!phase || phase === 'lost' || phase === 'none' || pathname?.startsWith('/admin')) return null;

  const match = data?.match;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] h-[40px] flex items-center justify-center gap-3 px-4"
      style={{
        background: `linear-gradient(135deg, #0d1b3d 0%, #1B3B6F 45%, ${CELESTE} 100%)`,
        borderBottom: `1px solid ${GOLD}`,
      }}
    >
      <Stars />

      {phase === 'pre' && (
        <>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="text-[10px] font-black tracking-[0.14em] uppercase text-white">
              Si Argentina gana hoy
            </span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: GOLD }}>
              3X2 en todo el catálogo
            </span>
          </div>
          <span className="text-white/25 text-[10px] hidden sm:block">·</span>
          <Countdown targetISO={data?.kickoff ?? null} />
        </>
      )}

      {phase === 'live' && match && (
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: GOLD }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: GOLD }} />
          </span>
          <span className="text-[11px] font-black tracking-[0.1em] uppercase text-white">
            EN VIVO
          </span>
          <span className="text-white/30 text-[10px]">·</span>
          <span className="text-[13px] font-bold tabular-nums text-white">
            {match.argTla} {match.argGoals} — {match.oppGoals} {match.oppTla}
          </span>
          {match.elapsed != null && (
            <span className="text-[11px] font-semibold text-white/70">{match.elapsed}&apos;</span>
          )}
        </div>
      )}

      {phase === 'won' && (
        <>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: GOLD }}>
              3X2 ACTIVO
            </span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-[10px] font-black tracking-[0.14em] uppercase text-white">
              Argentina ganó · en todo el catálogo
            </span>
          </div>
          <span className="text-white/25 text-[10px] hidden sm:block">·</span>
          {data?.nextMatchDate ? (
            <Countdown targetISO={data.nextMatchDate} />
          ) : (
            <span className="text-[11px] text-white/70 hidden sm:block">válido hasta el próximo partido</span>
          )}
        </>
      )}

      <span className="text-white/25 text-[10px] hidden sm:block">·</span>

      <Link
        href="/productos/"
        className="hidden sm:flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase text-white border px-3 py-1 hover:bg-white hover:text-[#1B3B6F] transition-colors duration-150 shrink-0"
        style={{ borderColor: `${GOLD}66` }}
      >
        Comprar
      </Link>
    </div>
  );
}
