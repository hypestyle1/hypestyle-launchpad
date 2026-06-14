import { NextRequest, NextResponse } from 'next/server';

// Aplica al producto LA NUESTRA un descuento de 7% por cada gol de Argentina,
// sobre el precio original, válido 24hs (Woo lo vence solo con date_on_sale_to).
// Pensado para que lo llame un cron cada ~2 min durante el partido.

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-json/wc/v3';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const AF_KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const FIXTURE_ID = (process.env.API_FOOTBALL_FIXTURE_ID || '').trim();
const SECRET = process.env.CRON_SECRET || 'hs2026';

const PRODUCT_ID = 1571;       // LA NUESTRA - JERSEY MUNDIAL 26'
const PER_GOAL = 0.07;         // 7% por gol
const MAX_DISCOUNT = 0.5;      // tope de seguridad
const SALE_HOURS = 24;
const ARG_TEAM_ID = 26;

// Kickoff del partido (mismo valor que usa el widget). Acota la ventana en la que
// se consulta la API (evita quemar quota cuando el cron corre 24/7).
const KICKOFF = new Date(process.env.NEXT_PUBLIC_MATCH_KICKOFF || '2026-06-16T22:00:00-03:00').getTime();
const WINDOW_END = KICKOFF + 26 * 3600 * 1000; // partido + 24h de oferta + margen

export const revalidate = 0;

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
const wcGet = (p: string) => fetch(`${WP}${p}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
const wcPut = (p: string, body: any) =>
  fetch(`${WP}${p}`, { method: 'PUT', headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

async function getArgentina() {
  if (!AF_KEY) return null;
  const url = FIXTURE_ID ? `/fixtures?id=${FIXTURE_ID}` : `/fixtures?team=${ARG_TEAM_ID}&next=1`;
  const r = await fetch(`https://v3.football.api-sports.io${url}`, { headers: { 'x-apisports-key': AF_KEY }, cache: 'no-store' }).then(x => x.json());
  const it = (r.response || [])[0];
  if (!it) return null;
  const argHome = /argentin/i.test(it.teams.home.name);
  const st = it.fixture.status.short as string;
  return {
    goals: (argHome ? it.goals.home : it.goals.away) ?? 0,
    started: !['NS', 'TBD', 'PST', 'CANC'].includes(st),
    status: st,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Acepta ?secret=, header x-cron-secret, o el Bearer que manda Vercel Cron (CRON_SECRET).
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = sp.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (provided !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Limpiar oferta (reset manual).
  if (sp.get('clear') === '1') {
    await wcPut(`/products/${PRODUCT_ID}`, { sale_price: '', date_on_sale_from: null, date_on_sale_to: null });
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Goles: por parámetro de test, o desde API-Football.
  let goals: number;
  const test = sp.get('testGoals');
  if (test != null) {
    goals = Math.max(0, Number(test) || 0);
  } else {
    const now = Date.now();
    if (now < KICKOFF || now > WINDOW_END) return NextResponse.json({ ok: true, skip: 'fuera de la ventana del partido' });
    const arg = await getArgentina();
    if (!arg) return NextResponse.json({ ok: true, skip: 'sin fixture' });
    if (!arg.started) return NextResponse.json({ ok: true, skip: 'partido no empezó', status: arg.status });
    goals = arg.goals;
  }

  const product = await wcGet(`/products/${PRODUCT_ID}`);
  const regular = Math.round(Number(product.regular_price || product.price || 0));
  if (!regular) return NextResponse.json({ error: 'sin regular_price' }, { status: 500 });

  if (goals <= 0) return NextResponse.json({ ok: true, goals, note: 'sin goles → sin descuento' });

  const discount = Math.min(MAX_DISCOUNT, goals * PER_GOAL);
  const sale = Math.round(regular * (1 - discount));
  const currentSale = Math.round(Number(product.sale_price || 0));

  // Solo escribir si cambió el precio (evita re-empujar el vencimiento de 24h post-gol).
  if (currentSale === sale) return NextResponse.json({ ok: true, goals, sale, note: 'sin cambios' });

  const from = new Date().toISOString().slice(0, 19);
  const to = new Date(Date.now() + SALE_HOURS * 3600 * 1000).toISOString().slice(0, 19);
  await wcPut(`/products/${PRODUCT_ID}`, { sale_price: String(sale), date_on_sale_from: from, date_on_sale_to: to });

  return NextResponse.json({ ok: true, goals, discount: `${Math.round(discount * 100)}%`, regular, sale, date_on_sale_to: to });
}
