import { NextRequest, NextResponse } from 'next/server';

// Manda la confirmación de compra UNA sola vez por orden, solo para pedidos de
// MercadoPago/tarjeta YA pagados (processing/completed). Transferencia, GOcuotas e
// internacional ya mandan su confirmación desde el checkout, así que se excluyen.
// Idempotente: marca la orden con meta `_hype_confirmation_sent` vía WC REST.
// Lo disparan: /confirmacion (al volver del pago) y el mu-plugin de WP (webhook).

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const MAIL_SECRET = 'hs2026';
const FLAG = '_hype_confirmation_sent';

export const revalidate = 0;

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function run(orderId: string, origin: string) {
  const order = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: wcAuth() }, cache: 'no-store',
  }).then(r => r.json());

  if (!order?.id) return { ok: false, reason: 'not-found' };
  if (!['processing', 'completed'].includes(order.status)) return { ok: false, reason: 'not-paid', status: order.status };
  if (!/mercado/i.test(order.payment_method || '')) return { ok: false, reason: 'not-mp', pm: order.payment_method };
  if ((order.meta_data || []).some((m: any) => m.key === FLAG && m.value)) return { ok: true, reason: 'already-sent' };

  // Reusa el endpoint de emails (mismo template que el reenvío del admin).
  const sent = await fetch(
    `${origin}/api/admin/send-order-emails?secret=${MAIL_SECRET}&order_id=${orderId}&action=confirmation`,
    { cache: 'no-store' },
  ).then(r => r.json()).catch(() => null);
  if (!sent?.ok) return { ok: false, reason: 'send-failed', detail: sent };

  // Marca enviado para no repetir (browser + webhook comparten este flag).
  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta_data: [{ key: FLAG, value: new Date().toISOString() }] }),
  }).catch(() => {});

  return { ok: true, reason: 'sent', email: sent.email };
}

async function handle(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const orderId = searchParams.get('order_id') || searchParams.get('order');
  if (!orderId) return NextResponse.json({ error: 'missing order_id' }, { status: 400 });
  try {
    return NextResponse.json(await run(orderId, origin));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
