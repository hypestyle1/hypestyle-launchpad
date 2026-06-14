import { NextResponse } from 'next/server';

// Llama a API-Football (api-sports v3) por el partido de Argentina y devuelve el
// resultado normalizado. La key vive en el server (no se expone al cliente).
//
// Env requeridas (Vercel):
//   API_FOOTBALL_KEY        -> tu key de api-sports.io
//   API_FOOTBALL_FIXTURE_ID -> (recomendado) id del fixture Argentina vs Algeria
//
// Si no hay fixture id, busca por equipo Argentina (id 26) en una ventana de fechas.

const KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const FIXTURE_ID = (process.env.API_FOOTBALL_FIXTURE_ID || '').trim();
const BASE = 'https://v3.football.api-sports.io';
const ARGENTINA_TEAM_ID = 26;

export const revalidate = 0; // siempre fresco; el cliente controla la cadencia

async function af(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return res.json();
}

function normalize(item: any) {
  if (!item) return null;
  return {
    statusShort: item.fixture?.status?.short ?? 'NS', // NS, 1H, HT, 2H, ET, FT, etc.
    elapsed: item.fixture?.status?.elapsed ?? null,
    date: item.fixture?.date ?? null,
    home: { name: item.teams?.home?.name ?? '', goals: item.goals?.home ?? null },
    away: { name: item.teams?.away?.name ?? '', goals: item.goals?.away ?? null },
  };
}

export async function GET() {
  if (!KEY) {
    return NextResponse.json({ configured: false, message: 'Falta API_FOOTBALL_KEY' }, { status: 200 });
  }
  try {
    let data: any[] = [];
    if (FIXTURE_ID) {
      data = (await af(`/fixtures?id=${FIXTURE_ID}`)).response || [];
    } else {
      // Sin fixture id: traigo los próximos/últimos partidos de Argentina y filtro Algeria.
      const r = await af(`/fixtures?team=${ARGENTINA_TEAM_ID}&next=5`);
      const all = (r.response || []) as any[];
      data = all.filter(x =>
        /algeria|argelia/i.test(x.teams?.home?.name + ' ' + x.teams?.away?.name)
      );
      if (!data.length) data = all.slice(0, 1); // fallback: el próximo de Argentina
    }
    const match = normalize(data[0]);
    return NextResponse.json({ configured: true, match });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: String(e?.message || e) }, { status: 200 });
  }
}
