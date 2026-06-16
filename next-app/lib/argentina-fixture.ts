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
  argGoals: number;
  oppGoals: number;
  started: boolean;
  live: boolean;
  finished: boolean;
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
  return {
    date: m.utcDate ?? null,
    statusShort: st,
    elapsed: min,
    argName: argHome ? m.homeTeam?.name : m.awayTeam?.name,
    oppName: argHome ? m.awayTeam?.name : m.homeTeam?.name,
    argGoals: argHome ? homeG : awayG,
    oppGoals: argHome ? awayG : homeG,
    started: !PRE_STATES.includes(st) && st !== 'POSTPONED' && st !== 'CANCELLED',
    live: LIVE_STATES.includes(st),
    finished: DONE_STATES.includes(st),
  };
}

export async function getArgentinaFixture(): Promise<ArgFixture | null> {
  if (!TOKEN) return null;

  if (MATCH_ID) {
    const m = await fd(`/matches/${MATCH_ID}`);
    return m?.id ? mapMatch(m) : null;
  }

  const j = await fd(`/teams/${ARG_TEAM_ID}/matches?competitions=WC`);
  const ms: any[] = j.matches || [];
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
