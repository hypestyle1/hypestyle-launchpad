'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Partido: Argentina vs Algeria — Martes 16/06/2026 22:00 hora Argentina (UTC-3).
// TODO: confirmar fecha/hora exacta del partido.
const KICKOFF = new Date('2026-06-16T22:00:00-03:00');
const DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas
const POLL_MS = 120000; // 2 minutos

// Test: fuerza el modo "en vivo" para probar contra un partido en curso. En prod: false.
const TEST_FORCE_LIVE = false;

// Equipos (para los próximos partidos cambiá el rival aquí + el fixture id en env).
const HOME = { short: 'Arg', flag: '/hero/flag-arg.png' }; // Argentina (siempre)
const AWAY = { short: 'Alg', flag: '/hero/flag-alg.png' }; // rival (hoy Algeria)

type Match = {
  statusShort: string;
  elapsed: number | null;
  home: { name: string; goals: number | null };
  away: { name: string; goals: number | null };
};

function pad(n: number) { return String(n).padStart(2, '0'); }

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[26px] md:text-[34px] font-black tabular-nums leading-none">{pad(value)}</span>
      <span className="text-[8px] md:text-[9px] uppercase tracking-[0.18em] text-white/55 mt-1">{label}</span>
    </div>
  );
}

export default function MatchWidget() {
  // now arranca en null: en SSR y primer render del cliente no dependemos del reloj
  // (evita hydration mismatch). Se setea al montar.
  const [now, setNow] = useState<number | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ko = KICKOFF.getTime();
  const cur = now ?? ko - 1; // hasta montar: tratamos como 'pre' con countdown ~0
  const finishedByStatus = !!match && ['FT', 'AET', 'PEN'].includes(match.statusShort);
  const phase: 'pre' | 'live' | 'post' =
    TEST_FORCE_LIVE ? 'live'
    : cur < ko ? 'pre' : cur < ko + DURATION_MS && !finishedByStatus ? 'live' : 'post';

  // Llamados a la API: nada antes del kickoff; durante el partido cada 2 min; al final, una vez.
  useEffect(() => {
    if (phase === 'pre') return;
    let id: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const r = await fetch('/api/match-argentina').then(res => res.json());
        if (r?.match) setMatch(r.match);
      } catch { /* ignore */ }
    };
    load();
    if (phase === 'live') id = setInterval(load, POLL_MS);
    return () => { if (id) clearInterval(id); };
  }, [phase]);

  const diff = Math.max(0, ko - cur);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  // Goles mapeados por nombre (Argentina puede ser local o visitante en el fixture).
  const argIsHome = match ? /argentin/i.test(match.home.name) : true;
  const argGoals = match ? (argIsHome ? match.home.goals : match.away.goals) ?? 0 : 0;
  const oppGoals = match ? (argIsHome ? match.away.goals : match.home.goals) ?? 0 : 0;

  return (
    <div className="relative w-[300px] md:w-[400px] max-w-[88%] rounded-[20px] overflow-hidden
                    bg-black/40 backdrop-blur-xl border border-white/20 text-white
                    shadow-[0_10px_40px_rgba(0,0,0,0.4)] px-6 py-5">
      {/* Equipos */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="flex flex-col items-center gap-1.5 w-[64px]">
          <Image src={HOME.flag} alt={HOME.short} width={40} height={40} className="drop-shadow" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{HOME.short}</span>
        </div>
        <span className="text-[12px] font-semibold text-white/55 uppercase tracking-[0.2em]">vs</span>
        <div className="flex flex-col items-center gap-1.5 w-[64px]">
          <Image src={AWAY.flag} alt={AWAY.short} width={40} height={40} className="drop-shadow" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{AWAY.short}</span>
        </div>
      </div>

      {phase === 'pre' && (
        <>
          <p className="text-center text-[9px] uppercase tracking-[0.24em] text-white/55 mb-3">
            Faltan para el partido
          </p>
          <div className="flex items-start justify-center gap-3 md:gap-4">
            <Cell value={d} label="Días" />
            <span className="text-white/25 text-[22px] font-thin">:</span>
            <Cell value={h} label="Hs" />
            <span className="text-white/25 text-[22px] font-thin">:</span>
            <Cell value={m} label="Min" />
            <span className="text-white/25 text-[22px] font-thin">:</span>
            <Cell value={s} label="Seg" />
          </div>
          <p className="text-center text-[9px] uppercase tracking-[0.18em] text-white/45 mt-3">
            Martes 22:00 · Argentina
          </p>
        </>
      )}

      {phase !== 'pre' && (
        <>
          <div className="flex items-center justify-center gap-5">
            <span className="text-[44px] md:text-[54px] font-black tabular-nums leading-none">{argGoals}</span>
            <span className="text-white/30 text-[28px] font-thin">-</span>
            <span className="text-[44px] md:text-[54px] font-black tabular-nums leading-none">{oppGoals}</span>
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.22em] mt-3">
            {phase === 'live' ? (
              <span className="text-red-400 font-bold">
                ● En vivo{match?.elapsed ? ` · ${match.elapsed}'` : ''}
              </span>
            ) : (
              <span className="text-white/60 font-bold">Final</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
