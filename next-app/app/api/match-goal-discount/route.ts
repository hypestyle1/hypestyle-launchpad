import { NextRequest, NextResponse } from 'next/server';
import { getArgentinaFixture, hasKey } from '@/lib/argentina-fixture';

// Aplica al producto LA NUESTRA un descuento de 7% por cada gol de Argentina,
// sobre el precio original, válido 24hs (Woo lo vence solo con date_on_sale_to).
// Solo necesita API_FOOTBALL_KEY: detecta el partido y su estado automáticamente.
// Pensado para que lo llame un cron cada ~2 min.

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-json/wc/v3';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const SECRET = process.env.CRON_SECRET || 'hs2026';

const PRODUCT_ID = 1571;       // LA NUESTRA - JERSEY MUNDIAL 26'
const PER_GOAL = 0.07;         // 7% por gol
const MAX_DISCOUNT = 0.5;      // tope de seguridad
const SALE_HOURS = 24;

export const revalidate = 0;

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
const wcGet = (p: string) => fetch(`${WP}${p}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
const wcPut = (p: string, body: any) =>
  fetch(`${WP}${p}`, { method: 'PUT', headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Acepta ?secret=, header x-cron-secret, o el Bearer de Vercel Cron (CRON_SECRET).
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = sp.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (provided !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Reset manual de la oferta.
  if (sp.get('clear') === '1') {
    await wcPut(`/products/${PRODUCT_ID}`, { sale_price: '', date_on_sale_from: null, date_on_sale_to: null });
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Goles: por parámetro de test, o auto desde API-Football.
  let goals: number;
  const test = sp.get('testGoals');
  if (test != null) {
    goals = Math.max(0, Number(test) || 0);
  } else {
    if (!hasKey()) return NextResponse.json({ ok: true, skip: 'sin API key' });
    const fx = await getArgentinaFixture();
    if (!fx) return NextResponse.json({ ok: true, skip: 'sin fixture' });
    // Solo actuar mientras el partido está en juego o terminó hace <24h.
    if (!fx.live && !fx.finished) return NextResponse.json({ ok: true, skip: 'partido no en curso', status: fx.statusShort });
    goals = fx.argGoals;
  }

  const product = await wcGet(`/products/${PRODUCT_ID}`);
  const regular = Math.round(Number(product.regular_price || product.price || 0));
  if (!regular) return NextResponse.json({ error: 'sin regular_price' }, { status: 500 });

  if (goals <= 0) return NextResponse.json({ ok: true, goals, note: 'sin goles → sin descuento' });

  const discount = Math.min(MAX_DISCOUNT, goals * PER_GOAL);
  const sale = Math.round(regular * (1 - discount));
  const currentSale = Math.round(Number(product.sale_price || 0));

  // Solo escribir si cambió el precio (no re-empuja el vencimiento de 24h tras cada gol).
  if (currentSale === sale) return NextResponse.json({ ok: true, goals, sale, note: 'sin cambios' });

  const from = new Date().toISOString().slice(0, 19);
  const to = new Date(Date.now() + SALE_HOURS * 3600 * 1000).toISOString().slice(0, 19);
  await wcPut(`/products/${PRODUCT_ID}`, { sale_price: String(sale), date_on_sale_from: from, date_on_sale_to: to });

  return NextResponse.json({ ok: true, goals, discount: `${Math.round(discount * 100)}%`, regular, sale, date_on_sale_to: to });
}
