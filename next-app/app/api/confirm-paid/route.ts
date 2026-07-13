import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';

// Manda la confirmación de compra UNA sola vez por orden, solo para pedidos de
// MercadoPago/tarjeta YA pagados (processing/completed). Transferencia (Talo),
// GOcuotas, PayPal e internacional usan su propio disparador de confirmación
// (fulfillOrder desde sus respectivos webhooks/capture) y quedan excluidos acá.
// Idempotente: fulfillOrder() marca la orden con meta `_hype_confirmation_sent`.
// Lo disparan: /confirmacion (al volver del pago) y el mu-plugin de WP (webhook).

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

export const revalidate = 0;

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function run(orderId: string) {
  const order = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: wcAuth() }, cache: 'no-store',
  }).then(r => r.json());

  if (!order?.id) return { ok: false, reason: 'not-found' };
  if (!['processing', 'completed'].includes(order.status)) return { ok: false, reason: 'not-paid', status: order.status };
  // MercadoPago/tarjeta pueden venir como payment_method 'tarjeta', 'mercadopago' o
  // 'woo-mercado-pago-basic'; el título suele incluir "MercadoPago".
  const pm = `${order.payment_method || ''} ${order.payment_method_title || ''}`;
  if (!/mercado|tarjeta/i.test(pm)) return { ok: false, reason: 'not-mp', pm };

  return fulfillOrder(order.id, order.payment_method || 'mercadopago');
}

async function handle(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id') || searchParams.get('order');
  if (!orderId) return NextResponse.json({ error: 'missing order_id' }, { status: 400 });
  try {
    return NextResponse.json(await run(orderId));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
