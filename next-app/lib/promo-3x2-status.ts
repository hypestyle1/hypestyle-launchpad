// Decide si el 3x2 está activo: SOLO si Argentina ganó el partido ancla (ver
// ANCHOR_MATCH_ID) o el más reciente jugado después de ese, y se mantiene activo hasta
// que arranca el próximo (cuartos de final, fecha que el bracket todavía puede no haber
// publicado). No usa getArgentinaFixture() (corta a 24h los partidos terminados); usa
// la lista completa para sostener la ventana varios días.

import { getArgentinaWorldCupFixtures, hasKey, type ArgFixture } from '@/lib/argentina-fixture';

export type Promo3x2Phase = 'pre' | 'live' | 'won' | 'lost' | 'none';

export type MatchInfo = {
  argName: string;
  oppName: string;
  argTla: string;
  oppTla: string;
  argGoals: number;
  oppGoals: number;
  elapsed: number | null;
  statusShort: string;
  stage: string | null;
  date: string | null;
};

export interface Promo3x2Status {
  configured: boolean;
  phase: Promo3x2Phase;
  promoActive: boolean;
  match: MatchInfo | null;
  kickoff: string | null;
  nextMatchDate: string | null;
  serverTime: string;
}

// Si ganamos y a los 14 días el bracket todavía no publicó el próximo partido, se apaga
// solo (protege contra bugs de la API o el caso límite de salir campeón).
const MAX_PROMO_DAYS_AFTER_WIN = 14;

// Ancla el gatillo al partido de octavos de final vs Egipto (id 537381 en
// football-data.org, 07/07/2026). Sin esto, "el último partido terminado" podía ser
// un partido anterior ya jugado y ganado (ej. octavos de 32 vs Cabo Verde, 03/07) y
// activaba el 3x2 antes de que se juegue el partido que la promo tiene que gatillar.
// Se ignora cualquier resultado anterior a este partido. Actualizar/quitar cuando
// termine el Mundial o si hace falta re-anclar a otra fase.
const ANCHOR_MATCH_ID = 537381;

function toMatchInfo(f: ArgFixture): MatchInfo {
  return {
    argName: f.argName, oppName: f.oppName, argTla: f.argTla, oppTla: f.oppTla,
    argGoals: f.argGoals, oppGoals: f.oppGoals, elapsed: f.elapsed,
    statusShort: f.statusShort, stage: f.stage, date: f.date,
  };
}

function base(phase: Promo3x2Phase, extra: Partial<Promo3x2Status> = {}): Promo3x2Status {
  return {
    configured: hasKey(),
    phase,
    promoActive: false,
    match: null,
    kickoff: null,
    nextMatchDate: null,
    serverTime: new Date().toISOString(),
    ...extra,
  };
}

// Kill switch manual: PROMO_3X2_DISABLED=true en Vercel apaga el 3x2 (y el rediseño
// albiceleste) sin depender de resultados de partidos, sin tocar código. Para
// reactivar: borrar/poner en false esa env var y redeployar — no hace falta un PR.
const FORCE_DISABLED = (process.env.PROMO_3X2_DISABLED || '').trim().toLowerCase() === 'true';

export async function getPromo3x2Status(): Promise<Promo3x2Status> {
  if (FORCE_DISABLED) return base('none');
  if (!hasKey()) return base('none');

  const allFixtures = await getArgentinaWorldCupFixtures().catch(() => [] as ArgFixture[]);
  if (!allFixtures.length) return base('none');

  const anchorIndex = allFixtures.findIndex(f => f.matchId === ANCHOR_MATCH_ID);
  if (anchorIndex === -1) return base('none'); // partido ancla no encontrado: no arriesgar

  // La final (y el tercer puesto) quedan fuera del 3x2 — ese resultado lo maneja
  // exclusivamente el 50% off "campeones" (lib/promo-champion-status.ts). Sin este
  // filtro, ganar la final pasaría a ser "el último partido ganado" acá también y
  // el 3x2 se reactivaría solo al mismo tiempo que el 50% off, mostrando dos promos
  // contradictorias a la vez.
  const fixtures = allFixtures.slice(anchorIndex).filter(f => f.stage !== 'FINAL' && f.stage !== 'THIRD_PLACE');

  const live = fixtures.find(f => f.live);
  if (live) return base('live', { match: toMatchInfo(live) });

  const finished = fixtures.filter(f => f.finished).sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  const lastFinished = finished[0];

  if (!lastFinished) {
    const upcoming = fixtures.find(f => !f.started);
    return base('pre', { kickoff: upcoming?.date ?? null, match: upcoming ? toMatchInfo(upcoming) : null });
  }

  if (!lastFinished.argWon) {
    return base('lost', { match: toMatchInfo(lastFinished) });
  }

  const next = fixtures.find(f => f.matchId !== lastFinished.matchId && f.date && lastFinished.date && new Date(f.date).getTime() > new Date(lastFinished.date).getTime());
  const nextMatchDate = next?.date ?? null;

  const daysSinceWin = lastFinished.date ? (Date.now() - new Date(lastFinished.date).getTime()) / 86_400_000 : 0;
  if (!nextMatchDate && daysSinceWin > MAX_PROMO_DAYS_AFTER_WIN) {
    return base('lost', { match: toMatchInfo(lastFinished) });
  }

  const promoActive = nextMatchDate ? Date.now() < new Date(nextMatchDate).getTime() : true;
  if (!promoActive) {
    // Ya arrancó el próximo partido: si está en curso lo hubiéramos detectado arriba
    // (live); si football-data todavía no actualizó el status, lo tratamos como 'pre'
    // del partido siguiente para no dejar el 3x2 activo de más.
    return base('pre', { kickoff: nextMatchDate, match: next ? toMatchInfo(next) : null });
  }

  return base('won', { promoActive: true, match: toMatchInfo(lastFinished), nextMatchDate });
}
