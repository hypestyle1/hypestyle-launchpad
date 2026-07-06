// Busca el partido relevante de Argentina en el Mundial usando football-data.org.
// Auto-detecta: en juego > terminado hace <24h > próximo programado.
// Solo requiere FOOTBALL_DATA_TOKEN. Override opcional: FOOTBALL_DATA_MATCH_ID.

const TOKEN = (process.env.FOOTBALL_DATA_TOKEN || '').trim();
const MATCH_ID = (process.env.FOOTBALL_DATA_MATCH_ID || '').trim();
const ARG_TEAM_ID = 762;            // Argentina en football-data.org
const BASE = 'https://api.football-data.org/v4';
const LIVE_STATES = ['IN_PLAY', 'PAUSED'];
const DONE_STATES = ['FINISHED', 'AWARDED'];
const PRE_STATES = ['SCHEDULED', 'TIMED'];

export type ArgFixture = {
  date: string | null;
  statusShort: string;
  elapsed: number | null;
  argName: string;
  oppName: string;
  argTla: string;
  oppTla: string;
  argGoals: number;
  oppGoals: number;
  started: boolean;
  live: boolean;
  finished: boolean;
  matchId: number | null;
  stage: string | null;
  // 'winnerSide'/'argWon' se derivan de m.score.winner (no de los goles): en un cruce
  // eliminatorio definido por penales el marcador de tiempo puede quedar empatado.
  winnerSide: 'ARG' | 'OPP' | 'DRAW' | null;
  argWon: boolean;
};

async function fd(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Auth-Token': TOKEN }, cache: 'no-store' });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  return res.json();
}

export function hasKey() { return !!TOKEN; }

function mapMatch(m: any): ArgFixture {
  const st = m.status as string;
  const argHome = m.homeTeam?.id === ARG_TEAM_ID || m.homeTeam?.tla === 'ARG' || /argentin/i.test(m.homeTeam?.name || '');
  const homeG = m.score?.fullTime?.home ?? 0;
  const awayG = m.score?.fullTime?.away ?? 0;
  const min = m.minute == null ? null : (parseInt(String(m.minute), 10) || null);
  const finished = DONE_STATES.includes(st);
  const winner = m.score?.winner as ('HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null) ?? null;
  const winnerSide: ArgFixture['winnerSide'] = !finished || !winner ? null
    : winner === 'DRAW' ? 'DRAW'
    : (winner === 'HOME_TEAM') === argHome ? 'ARG' : 'OPP';
  return {
    date: m.utcDate ?? null,
    statusShort: st,
    elapsed: min,
    argName: argHome ? m.homeTeam?.name : m.awayTeam?.name,
    oppName: argHome ? m.awayTeam?.name : m.homeTeam?.name,
    argTla: (argHome ? m.homeTeam?.tla : m.awayTeam?.tla) || 'ARG',
    oppTla: (argHome ? m.awayTeam?.tla : m.homeTeam?.tla) || '',
    argGoals: argHome ? homeG : awayG,
    oppGoals: argHome ? awayG : homeG,
    started: !PRE_STATES.includes(st) && st !== 'POSTPONED' && st !== 'CANCELLED',
    live: LIVE_STATES.includes(st),
    finished,
    matchId: m.id ?? null,
    stage: m.stage ?? null,
    winnerSide,
    argWon: winnerSide === 'ARG',
  };
}

// Cache en memoria: football-data free tier = 10 req/min. El fixture cambia poco
// (en vivo el score; pre/post es casi estático). Esto evita el 429 con tráfico.
let _cache: { at: number; data: ArgFixture | null } | null = null;

export async function getArgentinaFixture(): Promise<ArgFixture | null> {
  if (!TOKEN) return null;
  const ttl = _cache?.data?.live ? 45000 : 300000; // en vivo 45s; pre/post 5 min
  if (_cache && Date.now() - _cache.at < ttl) return _cache.data;
  try {
    const data = await fetchFixture();
    _cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (_cache) return _cache.data; // ante 429/errores, servir el último resultado bueno
    throw e;
  }
}

async function fetchAllMatches(): Promise<any[]> {
  if (MATCH_ID) {
    const m = await fd(`/matches/${MATCH_ID}`);
    return m?.id ? [m] : [];
  }
  const j = await fd(`/teams/${ARG_TEAM_ID}/matches?competitions=WC`);
  return j.matches || [];
}

async function fetchFixture(): Promise<ArgFixture | null> {
  const ms = await fetchAllMatches();
  if (!ms.length) return null;
  const now = Date.now();
  const t = (m: any) => new Date(m.utcDate).getTime();

  // En juego
  const live = ms.find(m => LIVE_STATES.includes(m.status));
  if (live) return mapMatch(live);

  // Terminado hace <24h (el más reciente)
  const doneRecent = ms
    .filter(m => DONE_STATES.includes(m.status) && now - t(m) < 24 * 3600 * 1000)
    .sort((a, b) => t(b) - t(a))[0];
  if (doneRecent) return mapMatch(doneRecent);

  // Próximo programado
  const next = ms
    .filter(m => PRE_STATES.includes(m.status) && t(m) >= now - 3600 * 1000)
    .sort((a, b) => t(a) - t(b))[0];
  if (next) return mapMatch(next);

  // Fallback: el más cercano en el tiempo
  return mapMatch(ms.slice().sort((a, b) => Math.abs(t(a) - now) - Math.abs(t(b) - now))[0]);
}

// Lista completa de partidos de Argentina en el Mundial (sin el corte de 24h de
// fetchFixture/getArgentinaFixture) — la usa lib/promo-3x2-status.ts para poder
// sostener una ventana de varios días hasta el próximo partido tras un triunfo.
// Cache propia, separada de _cache, para no interferir con el hero widget / goal-discount.
let _matchesCache: { at: number; data: ArgFixture[] } | null = null;

export async function getArgentinaWorldCupFixtures(): Promise<ArgFixture[]> {
  if (!TOKEN) return [];
  const ttl = _matchesCache?.data.some(f => f.live) ? 45000 : 300000;
  if (_matchesCache && Date.now() - _matchesCache.at < ttl) return _matchesCache.data;
  try {
    const ms = await fetchAllMatches();
    const data = ms.map(mapMatch).sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());
    _matchesCache = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (_matchesCache) return _matchesCache.data;
    throw e;
  }
}
