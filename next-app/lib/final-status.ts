// Estado del banner "La gran final" (Mundial 26'). Pieza de hype/homenaje, sin
// mecánica de descuento — independiente del kill switch del 3x2.
// Reusa getArgentinaWorldCupFixtures() (mismo fetch cacheado que ya usa el resto del sitio).
// A diferencia del banner de la semifinal (lib/maradona-england-status.ts), acá no hay
// un matchId fijo: se busca dinámicamente el partido cuyo stage sea la final.

import { getArgentinaWorldCupFixtures, hasKey, type ArgFixture } from '@/lib/argentina-fixture';

export type FinalPhase = 'pre' | 'live' | 'won' | 'lost' | 'none';

export type FinalMatchInfo = {
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

export interface FinalStatus {
  configured: boolean;
  phase: FinalPhase;
  match: FinalMatchInfo | null;
  kickoff: string | null;
  serverTime: string;
}

const FINAL_STAGES = ['FINAL', 'THIRD_PLACE']; // por si football-data marca distinto, filtramos por si acaso

function isFinalStage(f: ArgFixture) {
  return !!f.stage && FINAL_STAGES.includes(f.stage);
}

function toMatchInfo(f: ArgFixture): FinalMatchInfo {
  return {
    argName: f.argName, oppName: f.oppName, argTla: f.argTla, oppTla: f.oppTla,
    argGoals: f.argGoals, oppGoals: f.oppGoals, elapsed: f.elapsed,
    statusShort: f.statusShort, date: f.date,
  };
}

function base(phase: FinalPhase, extra: Partial<FinalStatus> = {}): FinalStatus {
  return { configured: hasKey(), phase, match: null, kickoff: null, serverTime: new Date().toISOString(), ...extra };
}

export async function getFinalStatus(): Promise<FinalStatus> {
  if (!hasKey()) return base('none');

  const fixtures = await getArgentinaWorldCupFixtures().catch(() => [] as ArgFixture[]);
  const match = fixtures.find(isFinalStage);
  if (!match) return base('none');

  if (match.live) return base('live', { match: toMatchInfo(match) });
  if (!match.started) return base('pre', { kickoff: match.date, match: toMatchInfo(match) });
  if (match.finished) return base(match.argWon ? 'won' : 'lost', { match: toMatchInfo(match) });

  // Estado raro (suspendido/postergado): tratar como pre con el kickoff que haya.
  return base('pre', { kickoff: match.date, match: toMatchInfo(match) });
}
