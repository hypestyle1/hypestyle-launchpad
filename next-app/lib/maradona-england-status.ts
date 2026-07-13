// Estado del banner "1986 · La Revancha" (semifinal Argentina vs Inglaterra, Mundial 26').
// Pieza de hype/homenaje, sin mecánica de descuento — independiente del kill switch del 3x2.
// Reusa getArgentinaWorldCupFixtures() (mismo fetch cacheado que ya usa el resto del sitio).

import { getArgentinaWorldCupFixtures, hasKey, type ArgFixture } from '@/lib/argentina-fixture';

export type MaradonaPhase = 'pre' | 'live' | 'won' | 'lost' | 'none';

export type MaradonaMatchInfo = {
  argName: string;
  oppName: string;
  argTla: string;
  oppTla: string;
  argGoals: number;
  oppGoals: number;
  elapsed: number | null;
  statusShort: string;
  date: string | null;
};

export interface MaradonaEnglandStatus {
  configured: boolean;
  phase: MaradonaPhase;
  match: MaradonaMatchInfo | null;
  kickoff: string | null;
  serverTime: string;
}

// Semifinal Argentina vs Inglaterra, 15/07/2026 19:00 UTC (16:00 ART). id en football-data.org.
const MATCH_ID = 537388;

function toMatchInfo(f: ArgFixture): MaradonaMatchInfo {
  return {
    argName: f.argName, oppName: f.oppName, argTla: f.argTla, oppTla: f.oppTla,
    argGoals: f.argGoals, oppGoals: f.oppGoals, elapsed: f.elapsed,
    statusShort: f.statusShort, date: f.date,
  };
}

function base(phase: MaradonaPhase, extra: Partial<MaradonaEnglandStatus> = {}): MaradonaEnglandStatus {
  return { configured: hasKey(), phase, match: null, kickoff: null, serverTime: new Date().toISOString(), ...extra };
}

export async function getMaradonaEnglandStatus(): Promise<MaradonaEnglandStatus> {
  if (!hasKey()) return base('none');

  const fixtures = await getArgentinaWorldCupFixtures().catch(() => [] as ArgFixture[]);
  const match = fixtures.find(f => f.matchId === MATCH_ID);
  if (!match) return base('none');

  if (match.live) return base('live', { match: toMatchInfo(match) });
  if (!match.started) return base('pre', { kickoff: match.date, match: toMatchInfo(match) });
  if (match.finished) return base(match.argWon ? 'won' : 'lost', { match: toMatchInfo(match) });

  // Estado raro (suspendido/postergado): tratar como pre con el kickoff que haya.
  return base('pre', { kickoff: match.date, match: toMatchInfo(match) });
}
