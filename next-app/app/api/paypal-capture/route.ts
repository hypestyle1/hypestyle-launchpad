import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';

const PAYPAL_API = 'https://api-m.paypal.com';
const CLIENT_ID  = process.env.PAYPAL_CLIENT_ID!;
const SECRET     = process.env.PAYPAL_CLIENT_SECRET!;

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

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, wcOrderId } = await req.json() as { paypalOrderId: string; wcOrderId: number };
    if (!paypalOrderId || !wcOrderId) {
      return NextResponse.json({ error: 'paypalOrderId y wcOrderId requeridos' }, { status: 400 });
    }

    const token = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!captureRes.ok) {
      const err = await captureRes.text();
      console.error('[paypal-capture] capture failed:', err);
      return NextResponse.json({ error: 'No se pudo capturar el pago PayPal' }, { status: 500 });
    }

    const capture = await captureRes.json() as { status: string; id: string };

    if (capture.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Estado inesperado: ${capture.status}` }, { status: 400 });
    }

    // Recién acá el pago está confirmado — marca la orden como processing y
    // manda la confirmación real al cliente (antes de esto, create-order-intl/
    // create-order-gocuotas NO mandan mail de "pago recibido" para PayPal).
    const result = await fulfillOrder(wcOrderId, 'paypal', paypalOrderId);
    if (!result.ok) {
      console.error('[paypal-capture] fulfill failed:', result.reason);
    }

    return NextResponse.json({ success: true, paypalOrderId, wcOrderId, fulfill: result.reason });
  } catch (err) {
    console.error('[paypal-capture]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
