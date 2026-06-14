// Busca el partido relevante de Argentina en API-Football usando SOLO la API key.
// Auto-detecta: si hay uno en juego o terminado hace <24h lo usa; si no, el próximo.
// Opcional: API_FOOTBALL_FIXTURE_ID fuerza un fixture puntual (override / testing).

const AF_KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const FIXTURE_ID = (process.env.API_FOOTBALL_FIXTURE_ID || '').trim();
const ARG_TEAM_ID = 26;
const BASE = 'https://v3.football.api-sports.io';
const LIVE_STATES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'];
const DONE_STATES = ['FT', 'AET', 'PEN'];

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

async function af(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': AF_KEY }, cache: 'no-store' });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return res.json();
}

export function hasKey() { return !!AF_KEY; }

export async function getArgentinaFixture(): Promise<ArgFixture | null> {
  if (!AF_KEY) return null;

  let item: any;
  if (FIXTURE_ID) {
    item = (await af(`/fixtures?id=${FIXTURE_ID}`)).response?.[0];
  } else {
    const [nx, ls] = await Promise.all([
      af(`/fixtures?team=${ARG_TEAM_ID}&next=1`),
      af(`/fixtures?team=${ARG_TEAM_ID}&last=1`),
    ]);
    const next = nx.response?.[0];
    const last = ls.response?.[0];
    const lastSt = last?.fixture?.status?.short;
    const lastRecent =
      last && Date.now() - new Date(last.fixture.date).getTime() < 24 * 3600 * 1000;
    if (last && LIVE_STATES.includes(lastSt)) item = last;            // en juego
    else if (last && DONE_STATES.includes(lastSt) && lastRecent) item = last; // terminó hace <24h
    else item = next || last;                                          // próximo
  }
  if (!item) return null;

  const st = item.fixture.status.short as string;
  const argHome = /argentin/i.test(item.teams.home.name);
  const homeGoals = item.goals.home ?? 0;
  const awayGoals = item.goals.away ?? 0;
  return {
    date: item.fixture.date ?? null,
    statusShort: st,
    elapsed: item.fixture.status.elapsed ?? null,
    argName: argHome ? item.teams.home.name : item.teams.away.name,
    oppName: argHome ? item.teams.away.name : item.teams.home.name,
    argGoals: argHome ? homeGoals : awayGoals,
    oppGoals: argHome ? awayGoals : homeGoals,
    started: !['NS', 'TBD', 'PST', 'CANC'].includes(st),
    live: LIVE_STATES.includes(st),
    finished: DONE_STATES.includes(st),
  };
}
