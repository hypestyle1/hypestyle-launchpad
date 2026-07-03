import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// Claves que prueban que el pedido fue despachado (rótulo Andreani o tracking).
const PROOF_KEYS = ['_tracking_number', '_andreani_tracking_number', '_order_andreani_numero_interno'];
const hasProof = (meta: any[]) =>
  (meta || []).some((m) => PROOF_KEYS.includes(m.key) && String(m.value || '').trim() !== '');

async function statusTotal(status: string, after: string): Promise<number> {
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?status=${status}&per_page=1&after=${after}&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
  );
  return parseInt(res.headers.get('X-WP-Total') || '0');
}

// Trae todas las órdenes 'processing' (con su meta) para separar las que ya tienen rótulo.
// _cb evita el caché de LiteSpeed en el server de WP, que puede devolver meta_data vieja
// (ej. tracking que en realidad ya no está, o que se acaba de cargar).
async function processingSplit(after: string) {
  let page = 1, conRotulo = 0, sinRotulo = 0;
  for (;;) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?status=processing&per_page=100&page=${page}&after=${after}&_fields=id,meta_data&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
    );
    if (!res.ok) break;
    const data = (await res.json()) as any[];
    if (!data.length) break;
    for (const o of data) (hasProof(o.meta_data) ? conRotulo++ : sinRotulo++);
    if (data.length < 100) break;
    page++;
  }
  return { conRotulo, sinRotulo };
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const after = req.nextUrl.searchParams.get('after') || '2026-05-10T00:00:00';

  const [proc, pendientes, enviados] = await Promise.all([
    processingSplit(after),
    statusTotal('pending', after),
    statusTotal('enviado', after),
  ]);

  return NextResponse.json({
    porDespachar:        proc.sinRotulo,   // pagado, sin rótulo → hay que despacharlo
    despachadoSinMarcar: proc.conRotulo,   // tiene rótulo pero sigue en "procesando"
    pendientes,                            // sin pagar
    despachados:         enviados,         // marcados como enviado
  });
}
