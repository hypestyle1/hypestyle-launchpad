import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { armarCola, estaPorEmpaquetar, type PodOrderLike, type PodPendiente } from '@/lib/pod';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// Cola de estampado: las prendas print on demand de los pedidos que todavía
// están por empaquetar. En cuanto el pedido tiene rótulo la prenda ya está
// hecha, así que sale de la lista sola — no hace falta marcar nada a mano.
export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const after = req.nextUrl.searchParams.get('after') || '2026-05-10T00:00:00';

  // _cb saltea el caché de LiteSpeed del server de WP, que devuelve meta vieja
  // (un rótulo recién generado tiene que sacar la prenda de la cola en el acto).
  const orders: PodOrderLike[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?status=processing&per_page=100&page=${page}&after=${after}`
      + `&_fields=id,number,meta_data,line_items&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    orders.push(...data);
    if (data.length < 100) break;
  }

  const porEmpaquetar = orders.filter(estaPorEmpaquetar);

  const payload: PodPendiente = {
    revisados: orders.length,
    porEmpaquetar: porEmpaquetar.length,
    ...armarCola(porEmpaquetar),
  };

  return NextResponse.json(payload);
}
