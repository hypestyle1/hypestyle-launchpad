import { NextRequest, NextResponse } from 'next/server';
import { getPromoChampionStatus, type PromoChampionStatus, type PromoChampionPhase } from '@/lib/promo-champion-status';

// Estado del 50% off "campeones del mundo" (Mundial 26', final). Mismo patrón que
// /api/promo-3x2-status: soporta override de test (?test=pre|live|won|lost&secret=...)
// para previsualizar y validar el checkout antes de que se juegue la final de verdad.

export const revalidate = 0;

const TEST_SECRET = (process.env.PROMO_TEST_SECRET || '').trim();
const VALID_PHASES: PromoChampionPhase[] = ['pre', 'live', 'won', 'lost', 'none'];

function buildTestOverride(sp: URLSearchParams): PromoChampionStatus {
  const phase = (sp.get('test') || 'none') as PromoChampionPhase;
  const now = Date.now();
  const testKickoff = sp.get('testKickoff');
  const [argGoals, oppGoals] = (sp.get('testScore') || '0-0').split('-').map(n => parseInt(n, 10) || 0);
  const elapsed = sp.get('testElapsed') ? parseInt(sp.get('testElapsed')!, 10) : null;
  const oppName = sp.get('testOpp') || 'España';

  const match = {
    argName: 'Argentina', oppName, argTla: 'ARG', oppTla: oppName.slice(0, 3).toUpperCase(),
    argGoals, oppGoals, elapsed,
    statusShort: phase === 'live' ? 'IN_PLAY' : phase === 'won' || phase === 'lost' ? 'FINISHED' : 'TIMED',
    date: testKickoff || new Date(now + 3600_000).toISOString(),
  };

  return {
    configured: true,
    phase,
    promoActive: phase === 'won',
    match: VALID_PHASES.includes(phase) && phase !== 'none' ? match : null,
    kickoff: phase === 'pre' ? (testKickoff || new Date(now + 3600_000).toISOString()) : null,
    activeUntil: phase === 'won' ? new Date(now + 48 * 3600_000).toISOString() : null,
    serverTime: new Date(now).toISOString(),
  };
}

let _cache: { at: number; data: PromoChampionStatus } | null = null;
const CACHE_TTL = 20_000;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const test = sp.get('test');
  const secret = sp.get('secret') || '';

  if (test && TEST_SECRET && secret === TEST_SECRET) {
    return NextResponse.json(buildTestOverride(sp));
  }

  if (_cache && Date.now() - _cache.at < CACHE_TTL) {
    return NextResponse.json(_cache.data);
  }
  try {
    const data = await getPromoChampionStatus();
    _cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    if (_cache) return NextResponse.json(_cache.data);
    return NextResponse.json({ configured: false, phase: 'none', promoActive: false, match: null, kickoff: null, activeUntil: null, serverTime: new Date().toISOString(), error: String(e?.message || e) });
  }
}
