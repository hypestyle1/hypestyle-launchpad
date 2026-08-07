import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

const wcReq = (method: string, path: string, body?: any) =>
  fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    method,
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

// Guarda/edita la nota interna. Se guarda como NOTA DE PEDIDO de WooCommerce
// (visible en el admin de Woo) y se mantiene editable: al editar, borra la
// nota anterior y crea una nueva. Guarda también el texto en meta para recargar el cuadro.
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId, note } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const text = String(note ?? '').trim();

  // id de la nota anterior (si existía) para reemplazarla
  const order = await (await wcReq('GET', `orders/${orderId}?_fields=id,meta_data`)).json();
  if (!order?.id) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  const prevId = (order.meta_data || []).find((m: any) => m.key === '_hs_admin_note_id')?.value;

  if (prevId) {
    await wcReq('DELETE', `orders/${orderId}/notes/${prevId}?force=true`).catch(() => {});
  }

  let newId = '';
  if (text) {
    const created = await (await wcReq('POST', `orders/${orderId}/notes`, { note: text, customer_note: false })).json();
    if (created?.id) newId = String(created.id);
  }

  const put = await wcReq('PUT', `orders/${orderId}`, {
    meta_data: [
      { key: '_hs_admin_note',    value: text },
      { key: '_hs_admin_note_id', value: newId },
    ],
  });
  if (!put.ok) {
    const err = await put.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || `WC ${put.status}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, inWoo: !!newId });
}
