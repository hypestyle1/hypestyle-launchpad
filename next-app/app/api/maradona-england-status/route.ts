import { NextRequest, NextResponse } from 'next/server';
import { getMaradonaEnglandStatus, type MaradonaEnglandStatus, type MaradonaPhase } from '@/lib/maradona-england-status';

// Estado del banner "1986 · La Revancha" (semifinal vs Inglaterra). Mismo patrón de
// override de test que /api/promo-3x2-status, reusando el mismo secret.

export const revalidate = 0;

const TEST_SECRET = (process.env.PROMO_TEST_SECRET || '').trim();

function buildTestOverride(sp: URLSearchParams): MaradonaEnglandStatus {
  const phase = (sp.get('test') || 'none') as MaradonaPhase;
  const now = Date.now();
  const testKickoff = sp.get('testKickoff');
  const [argGoals, oppGoals] = (sp.get('testScore') || '0-0').split('-').map(n => parseInt(n, 10) || 0);
  const elapsed = sp.get('testElapsed') ? parseInt(sp.get('testElapsed')!, 10) : null;

  const match = {
    argName: 'Argentina', oppName: 'Inglaterra', argTla: 'ARG', oppTla: 'ENG',
    argGoals, oppGoals, elapsed,
    statusShort: phase === 'live' ? 'IN_PLAY' : phase === 'won' || phase === 'lost' ? 'FINISHED' : 'TIMED',
    date: testKickoff || new Date(now + 3600_000).toISOString(),
  };

  return {
    configured: true,
    phase,
    match: phase !== 'none' ? match : null,
    kickoff: phase === 'pre' ? (testKickoff || new Date(now + 3600_000).toISOString()) : null,
    serverTime: new Date(now).toISOString(),
  };
}

let _cache: { at: number; data: MaradonaEnglandStatus } | null = null;
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
    const data = await getMaradonaEnglandStatus();
    _cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    if (_cache) return NextResponse.json(_cache.data);
    return NextResponse.json({ configured: false, phase: 'none', match: null, kickoff: null, serverTime: new Date().toISOString(), error: String(e?.message || e) });
  }
}
