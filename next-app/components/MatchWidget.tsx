'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Fecha del partido: la trae la API (auto). Si todavía no está cargado el fixture,
// se usa este fallback editable (no requiere env). Argentina vs Algeria.
const FALLBACK_KICKOFF = new Date(
  process.env.NEXT_PUBLIC_MATCH_KICKOFF || '2026-06-16T22:00:00-03:00'
);
const DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas
const POLL_MS = 120000; // 2 minutos (solo durante el partido)

// Banderas por código de equipo (3 letras). Argentina siempre local; el rival
// sale de la API (oppTla). Para un rival nuevo, sumá su PNG en /public/hero.
const FLAGS: Record<string, string> = {
  ALG: '/hero/flag-alg.png',
  ARG: '/hero/flag-arg.png',
  AUS: '/hero/flag-aus.png',
  AUT: '/hero/flag-aut.png',
  BEL: '/hero/flag-bel.png',
  BRA: '/hero/flag-bra.png',
  CAN: '/hero/flag-can.png',
  CIV: '/hero/flag-civ.png',
  CMR: '/hero/flag-cmr.png',
  COL: '/hero/flag-col.png',
  CPV: '/hero/flag-cpv.png',
  CRC: '/hero/flag-crc.png',
  CRO: '/hero/flag-cro.png',
  ECU: '/hero/flag-ecu.png',
  EGY: '/hero/flag-egy.png',
  ENG: '/hero/flag-eng.png',
  ESP: '/hero/flag-esp.png',
  FRA: '/hero/flag-fra.png',
  GEO: '/hero/flag-geo.png',
  GER: '/hero/flag-ger.png',
  GHA: '/hero/flag-gha.png',
  HON: '/hero/flag-hon.png',
  IRN: '/hero/flag-irn.png',
  ITA: '/hero/flag-ita.png',
  JOR: '/hero/flag-jor.png',
  JPN: '/hero/flag-jpn.png',
  KOR: '/hero/flag-kor.png',
  MAR: '/hero/flag-mar.png',
  MEX: '/hero/flag-mex.png',
  MLI: '/hero/flag-mli.png',
  NED: '/hero/flag-ned.png',
  NGA: '/hero/flag-nga.png',
  NZL: '/hero/flag-nzl.png',
  PAN: '/hero/flag-pan.png',
  POL: '/hero/flag-pol.png',
  POR: '/hero/flag-por.png',
  QAT: '/hero/flag-qat.png',
  ROU: '/hero/flag-rou.png',
  SAU: '/hero/flag-sau.png',
  SCO: '/hero/flag-sco.png',
  SEN: '/hero/flag-sen.png',
  SUI: '/hero/flag-sui.png',
  TUN: '/hero/flag-tun.png',
  TUR: '/hero/flag-tur.png',
  URU: '/hero/flag-uru.png',
  USA: '/hero/flag-usa.png',
  UZB: '/hero/flag-uzb.png',
  VEN: '/hero/flag-ven.png',
};

type Match = {
  date: string | null;
  statusShort: string;
  elapsed: number | null;
  argGoals: number;
  oppGoals: number;
  live: boolean;
  finished: boolean;
  argTla?: string;
  oppTla?: string;
};

function pad(n: number) { return String(n).padStart(2, '0'); }

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[34px]">
      <span className="text-[26px] font-black tabular-nums leading-none">{pad(value)}</span>
      <span className="text-[8px] md:text-[9px] uppercase tracking-[0.18em] text-white/55 mt-1">{label}</span>
    </div>
  );
}

export default function MatchWidget({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  // Reloj (se setea al montar para evitar hydration mismatch).
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Carga inicial del partido. Solo con la API key.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch('/api/match-argentina').then(res => res.json());
        if (!cancelled) setMatch(r?.match ?? null);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Durante el partido, refrescar el resultado cada 2 min.
  // Debe estar antes del early return para no violar reglas de hooks.
  const isLive = match?.live ?? false;
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch('/api/match-argentina').then(res => res.json());
        setMatch(r?.match ?? null);
      } catch { /* ignore */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isLive]);

  // No mostrar nada hasta que cargue la API (evita datos falsos mientras fetch).
  if (loading) return null;

  const ko = match?.date ? new Date(match.date).getTime() : FALLBACK_KICKOFF.getTime();
  const cur = now ?? ko - 1;

  const phase: 'pre' | 'live' | 'post' =
    match?.live ? 'live'
    : match?.finished ? 'post'
    : cur < ko ? 'pre'
    : cur < ko + DURATION_MS ? 'live'
    : 'post';

  const diff = Math.max(0, ko - cur);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const argGoals = match?.argGoals ?? 0;
  const oppGoals = match?.oppGoals ?? 0;

  // Equipos dinámicos desde la API (Argentina local; rival = oppTla).
  const HOME = { short: match?.argTla || 'ARG', flag: FLAGS[match?.argTla || 'ARG'] || '/hero/flag-arg.png' };
  const AWAY = { short: match?.oppTla || '', flag: match?.oppTla ? (FLAGS[match.oppTla] || '/hero/flag-arg.png') : '/hero/flag-arg.png' };

  // ── Variante COMPACT (mobile) ──
  if (compact) {
    return (
      <div className="w-auto rounded-[16px] bg-black/55 backdrop-blur-xl border border-white/15
                      text-white px-3.5 py-2.5 flex flex-col items-center gap-1 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        {/* Equipos */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Image src={HOME.flag} alt={HOME.short} width={24} height={24} className="drop-shadow" />
            <span className="text-[10px] font-bold uppercase">{HOME.short}</span>
          </div>
          <span className="text-[10px] text-white/45 uppercase">vs</span>
          <div className="flex items-center gap-1.5">
            <Image src={AWAY.flag} alt={AWAY.short} width={24} height={24} className="drop-shadow" />
            <span className="text-[10px] font-bold uppercase">{AWAY.short}</span>
          </div>
        </div>
        {phase === 'pre' ? (
          <>
            <p className="text-[8px] uppercase tracking-[0.22em] text-white/55">Faltan para el partido</p>
            <div className="flex items-baseline gap-1 font-black tabular-nums text-[24px] leading-none">
              <span>{pad(d)}</span><span className="text-white/30 text-[15px]">:</span>
              <span>{pad(h)}</span><span className="text-white/30 text-[15px]">:</span>
              <span>{pad(m)}</span><span className="text-white/30 text-[15px]">:</span>
              <span>{pad(s)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[28px] font-black tabular-nums leading-none">{argGoals}-{oppGoals}</span>
            <span className={`text-[9px] font-bold uppercase ${phase === 'live' ? 'text-red-400' : 'text-white/60'}`}>
              {phase === 'live' ? 'En vivo' : 'Final'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Variante normal (tarjeta) ──
  return (
    <div className="relative w-[300px] max-w-[88%] rounded-[20px] overflow-hidden
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
          <div className="flex items-start justify-center gap-1.5">
            <Cell value={d} label="Días" />
            <span className="text-white/25 text-[18px] font-thin leading-[26px]">:</span>
            <Cell value={h} label="Hs" />
            <span className="text-white/25 text-[18px] font-thin leading-[26px]">:</span>
            <Cell value={m} label="Min" />
            <span className="text-white/25 text-[18px] font-thin leading-[26px]">:</span>
            <Cell value={s} label="Seg" />
          </div>
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
