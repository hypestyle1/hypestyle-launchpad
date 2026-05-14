import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = 'https://api-m.paypal.com';
const CLIENT_ID  = process.env.PAYPAL_CLIENT_ID!;
const SECRET     = process.env.PAYPAL_CLIENT_SECRET!;
const WP_URL     = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY     = process.env.WC_CONSUMER_KEY!;
const WC_SECRET  = process.env.WC_CONSUMER_SECRET!;

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

    // Mark WC order as processing
    const wcRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${wcOrderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        status: 'processing',
        transaction_id: paypalOrderId,
      }),
    });

    if (!wcRes.ok) {
      console.error('[paypal-capture] WC update failed:', await wcRes.text());
    }

    return NextResponse.json({ success: true, paypalOrderId, wcOrderId });
  } catch (err) {
    console.error('[paypal-capture]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
