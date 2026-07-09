import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET  || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    console.log('[gocuotas-webhook] received:', JSON.stringify(body));

    const orderId = body.order_reference_id ?? body.commerce_order_id ?? body.orderId;
    const status  = (body.status as string | undefined)?.toLowerCase();

    // Igual que el plugin oficial de WooCommerce de GOcuotas: 'approved' pasa la
    // orden a processing (y recién ahí manda la confirmación real al cliente —
    // create-order-gocuotas NO manda mail de "pago recibido" para gocuotas al
    // crear la orden), cualquier otro estado la marca failed. Antes no se hacía
    // nada si no era 'approved', así que un rechazo dejaba la orden en pending
    // para siempre, indistinguible de "el cliente nunca terminó de pagar".
    if (orderId) {
      if (status === 'approved') {
        const result = await fulfillOrder(Number(orderId), 'gocuotas');
        if (!result.ok) console.error('[gocuotas-webhook] fulfill failed:', result.reason);
      } else {
        const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
          body:    JSON.stringify({ status: 'failed' }),
        });
        if (!res.ok) {
          console.error('[gocuotas-webhook] WC update failed:', res.status, await res.text());
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[gocuotas-webhook]', err);
    return NextResponse.json({ ok: false }, { status: 200 }); // always 200 so GOcuotas retries
  }
}

// GOcuotas may also send a GET to verify the endpoint is reachable
export async function GET() {
  return NextResponse.json({ ok: true });
}
