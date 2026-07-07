import { NextRequest, NextResponse } from 'next/server';
import { getPromo3x2Status, type Promo3x2Status, type Promo3x2Phase } from '@/lib/promo-3x2-status';

// Estado del 3x2 "condicional al triunfo de Argentina", para Navbar/Promo3x2Bar/
// CartDrawer/checkout. Soporta override de test (?test=pre|live|won|lost&secret=...)
// para previsualizar y aprobar el diseño de las 3 fases antes de que el partido real
// determine el resultado. Sin el secret correcto, ?test se ignora y se sirve el estado real.

export const revalidate = 0;

const TEST_SECRET = (process.env.PROMO_TEST_SECRET || '').trim();
const VALID_PHASES: Promo3x2Phase[] = ['pre', 'live', 'won', 'lost', 'none'];

function buildTestOverride(sp: URLSearchParams): Promo3x2Status {
  const phase = (sp.get('test') || 'none') as Promo3x2Phase;
  const now = Date.now();
  const testKickoff = sp.get('testKickoff');
  const testNextMatch = sp.get('testNextMatch');
  const [argGoals, oppGoals] = (sp.get('testScore') || '0-0').split('-').map(n => parseInt(n, 10) || 0);
  const elapsed = sp.get('testElapsed') ? parseInt(sp.get('testElapsed')!, 10) : null;

  const match = {
    argName: 'Argentina', oppName: 'Egipto', argTla: 'ARG', oppTla: 'EGY',
    argGoals, oppGoals, elapsed, statusShort: phase === 'live' ? 'IN_PLAY' : phase === 'won' || phase === 'lost' ? 'FINISHED' : 'TIMED',
    stage: 'LAST_16', date: testKickoff || new Date(now + 3600_000).toISOString(),
  };

  return {
    configured: true,
    phase,
    promoActive: phase === 'won',
    match: VALID_PHASES.includes(phase) && phase !== 'none' ? match : null,
    kickoff: phase === 'pre' ? (testKickoff || new Date(now + 3600_000).toISOString()) : null,
    nextMatchDate: phase === 'won' ? (testNextMatch || null) : null,
    serverTime: new Date(now).toISOString(),
  };
}

// Cache in-memory corta: no le pegamos a football-data en cada request de cada visitante.
let _cache: { at: number; data: Promo3x2Status } | null = null;
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
    const data = await getPromo3x2Status();
    _cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e: any) {
    if (_cache) return NextResponse.json(_cache.data);
    return NextResponse.json({ configured: false, phase: 'none', promoActive: false, match: null, kickoff: null, nextMatchDate: null, serverTime: new Date().toISOString(), error: String(e?.message || e) });
  }
}
