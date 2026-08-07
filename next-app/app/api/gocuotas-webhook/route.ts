import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';
import { verifyGocuotasWebhookToken } from '@/lib/gocuotas-webhook-token';

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

    if (!orderId) {
      return NextResponse.json({ ok: false, error: 'missing order reference' }, { status: 400 });
    }

    // GOcuotas no firma sus webhooks, así que lo único que autentica este POST es
    // el token por pedido que le registramos en webhook_url al crear el checkout
    // (ver lib/gocuotas-webhook-token.ts). Sin esto, y como los IDs de pedido de
    // WooCommerce son secuenciales, cualquiera podía postear
    // {"order_reference_id": N, "status": "approved"} y marcar como pagado un
    // pedido ajeno sin haber pagado nada. Falla cerrado: si no hay token válido
    // no se toca la orden.
    const token = req.nextUrl.searchParams.get('token') || '';
    if (!verifyGocuotasWebhookToken(String(orderId), token)) {
      console.error('[gocuotas-webhook] token inválido o ausente para el pedido', orderId);
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // Segunda barrera: el webhook solo puede tocar pedidos que realmente se
    // pagaron por GOcuotas y que siguen esperando el pago. Sin esto, un token
    // filtrado de un pedido propio serviría para reabrir/cancelar ese mismo
    // pedido más adelante.
    const orderRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    if (!orderRes.ok) {
      console.error('[gocuotas-webhook] pedido inexistente:', orderId, orderRes.status);
      return NextResponse.json({ ok: false, error: 'order not found' }, { status: 404 });
    }
    const order = await orderRes.json() as { payment_method?: string; status?: string };
    const method = String(order.payment_method || '').toLowerCase();
    if (!method.includes('gocuotas')) {
      console.error('[gocuotas-webhook] el pedido', orderId, 'no es de GOcuotas (', method, ')');
      return NextResponse.json({ ok: false, error: 'payment method mismatch' }, { status: 409 });
    }

    // Igual que el plugin oficial de WooCommerce de GOcuotas: 'approved' pasa la
    // orden a processing (y recién ahí manda la confirmación real al cliente —
    // create-order-gocuotas NO manda mail de "pago recibido" para gocuotas al
    // crear la orden), cualquier otro estado la marca failed. Antes no se hacía
    // nada si no era 'approved', así que un rechazo dejaba la orden en pending
    // para siempre, indistinguible de "el cliente nunca terminó de pagar".
    if (status === 'approved') {
      const result = await fulfillOrder(Number(orderId), 'gocuotas');
      if (!result.ok) console.error('[gocuotas-webhook] fulfill failed:', result.reason);
    } else if (['processing', 'completed'].includes(String(order.status))) {
      // Un rechazo que llega tarde no puede tumbar un pedido ya cobrado.
      console.warn('[gocuotas-webhook] rechazo ignorado, el pedido', orderId, 'ya está', order.status);
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
