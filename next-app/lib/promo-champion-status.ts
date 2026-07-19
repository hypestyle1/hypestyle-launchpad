// Decide si el 50% OFF "campeones del mundo" está activo: SOLO si Argentina ganó la
// final (stage FINAL en el fixture). Se mantiene activo por PROMO_WINDOW_HOURS desde
// el pitazo final — no hay "próximo partido" contra el cual anclar el apagado, a
// diferencia del 3x2, así que usamos una ventana fija.

import { getArgentinaWorldCupFixtures, hasKey, type ArgFixture } from '@/lib/argentina-fixture';

export type PromoChampionPhase = 'pre' | 'live' | 'won' | 'lost' | 'none';

export type MatchInfo = {
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

export interface PromoChampionStatus {
  configured: boolean;
  phase: PromoChampionPhase;
  promoActive: boolean;
  match: MatchInfo | null;
  kickoff: string | null;
  activeUntil: string | null;
  serverTime: string;
}

// Ventana de vigencia del 50% off después de confirmarse el título — se apaga solo
// pasado este tiempo, sin depender de un "próximo partido" (no lo hay, es la final).
const PROMO_WINDOW_HOURS = 48;

const FINAL_STAGES = ['FINAL', 'THIRD_PLACE'];

function isFinalStage(f: ArgFixture) {
  return !!f.stage && FINAL_STAGES.includes(f.stage);
}

function toMatchInfo(f: ArgFixture): MatchInfo {
  return {
    argName: f.argName, oppName: f.oppName, argTla: f.argTla, oppTla: f.oppTla,
    argGoals: f.argGoals, oppGoals: f.oppGoals, elapsed: f.elapsed,
    statusShort: f.statusShort, date: f.date,
  };
}

function base(phase: PromoChampionPhase, extra: Partial<PromoChampionStatus> = {}): PromoChampionStatus {
  return {
    configured: hasKey(),
    phase,
    promoActive: false,
    match: null,
    kickoff: null,
    activeUntil: null,
    serverTime: new Date().toISOString(),
    ...extra,
  };
}

// Kill switch manual: PROMO_CHAMPION_DISABLED=true en Vercel apaga el 50% off al toque,
// sin tocar código ni depender de resultados. Pensado como freno de emergencia dado el
// impacto (descuento en todo el catálogo).
const FORCE_DISABLED = (process.env.PROMO_CHAMPION_DISABLED || '').trim().toLowerCase() === 'true';

export async function getPromoChampionStatus(): Promise<PromoChampionStatus> {
  if (FORCE_DISABLED) return base('none');
  if (!hasKey()) return base('none');

  const fixtures = await getArgentinaWorldCupFixtures().catch(() => [] as ArgFixture[]);
  const match = fixtures.find(isFinalStage);
  if (!match) return base('none');

  if (match.live) return base('live', { match: toMatchInfo(match) });
  if (!match.started) return base('pre', { kickoff: match.date, match: toMatchInfo(match) });

  if (match.finished) {
    if (!match.argWon) return base('lost', { match: toMatchInfo(match) });

    const activeUntilMs = match.date ? new Date(match.date).getTime() + PROMO_WINDOW_HOURS * 3_600_000 : 0;
    const promoActive = activeUntilMs > Date.now();
    return base(promoActive ? 'won' : 'lost', {
      promoActive,
      match: toMatchInfo(match),
      activeUntil: activeUntilMs ? new Date(activeUntilMs).toISOString() : null,
    });
  }

  return base('pre', { kickoff: match.date, match: toMatchInfo(match) });
}
