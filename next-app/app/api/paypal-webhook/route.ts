import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';

// Respaldo server-side del capture de PayPal. Sin esto, la única forma de marcar
// una orden como pagada era que el navegador del cliente volviera a /confirmacion
// con los query params de PayPal y disparara /api/paypal-capture — si cierra la
// ventana, pierde conexión, o el fetch client-side falla, la orden quedaba
// pending para siempre aunque el pago se haya completado del lado de PayPal.
// Requiere PAYPAL_WEBHOOK_ID (se obtiene registrando esta URL en el Developer
// Dashboard de PayPal, suscripto al evento PAYMENT.CAPTURE.COMPLETED).

const PAYPAL_API   = 'https://api-m.paypal.com';
const CLIENT_ID    = process.env.PAYPAL_CLIENT_ID!;
const SECRET       = process.env.PAYPAL_CLIENT_SECRET!;
const WEBHOOK_ID   = process.env.PAYPAL_WEBHOOK_ID || '';

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function verifySignature(headers: Headers, body: unknown, token: string): Promise<boolean> {
  if (!WEBHOOK_ID) {
    console.error('[paypal-webhook] PAYPAL_WEBHOOK_ID no configurado — rechazando por seguridad');
    return false;
  }
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      auth_algo:         headers.get('paypal-auth-algo'),
      cert_url:          headers.get('paypal-cert-url'),
      transmission_id:   headers.get('paypal-transmission-id'),
      transmission_sig:  headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id:        WEBHOOK_ID,
      webhook_event:     body,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json() as { verification_status?: string };
  return data.verification_status === 'SUCCESS';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = await getAccessToken();

    const valid = await verifySignature(req.headers, body, token);
    if (!valid) {
      console.error('[paypal-webhook] firma inválida o no verificable:', body?.event_type);
      return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    if (body.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return NextResponse.json({ ok: true, skipped: body.event_type });
    }

    const resource = body.resource || {};
    if (resource.status !== 'COMPLETED') {
      return NextResponse.json({ ok: true, skipped: 'capture-not-completed' });
    }

    const paypalOrderId = resource.supplementary_data?.related_ids?.order_id as string | undefined;
    if (!paypalOrderId) {
      return NextResponse.json({ ok: false, error: 'missing order_id in capture resource' }, { status: 400 });
    }

    const orderLookup = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!orderLookup.ok) {
      return NextResponse.json({ ok: false, error: 'paypal order lookup failed' }, { status: 502 });
    }
    const ppOrder = await orderLookup.json() as { purchase_units?: { reference_id?: string }[] };
    const wcOrderId = Number(ppOrder.purchase_units?.[0]?.reference_id);
    if (!wcOrderId) {
      return NextResponse.json({ ok: false, error: 'no reference_id on paypal order' }, { status: 400 });
    }

    const result = await fulfillOrder(wcOrderId, 'paypal', paypalOrderId);
    return NextResponse.json({ ok: true, wcOrderId, result: result.reason });
  } catch (err) {
    console.error('[paypal-webhook]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
