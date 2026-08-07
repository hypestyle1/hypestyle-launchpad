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

// La orden de PayPal se crea con reference_id = wcOrderId (ver /api/paypal-order),
// así que es PayPal quien dice a qué pedido de WooCommerce corresponde el pago —
// nunca el body del request. Sin este chequeo, un atacante podía pagar su propio
// pedido barato y después llamar a /api/paypal-capture con ese paypalOrderId ya
// pagado pero mandando el wcOrderId de un pedido ajeno caro, y fulfillOrder lo
// marcaba como pagado. Mismo patrón que ya usa paypal-webhook.
async function referencedWcOrderId(paypalOrderId: string, token: string): Promise<number | null> {
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const order = await res.json() as { purchase_units?: { reference_id?: string }[] };
  const ref = Number(order.purchase_units?.[0]?.reference_id);
  return Number.isFinite(ref) && ref > 0 ? ref : null;
}

export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, wcOrderId } = await req.json() as { paypalOrderId: string; wcOrderId: number };
    if (!paypalOrderId || !wcOrderId) {
      return NextResponse.json({ error: 'paypalOrderId y wcOrderId requeridos' }, { status: 400 });
    }

    const token = await getAccessToken();

    // Se verifica ANTES de capturar: si el pedido no coincide, no se cobra nada.
    const referenced = await referencedWcOrderId(paypalOrderId, token);
    if (referenced === null) {
      console.error('[paypal-capture] no se pudo leer la orden de PayPal', paypalOrderId);
      return NextResponse.json({ error: 'No se pudo verificar el pago con PayPal' }, { status: 502 });
    }
    if (referenced !== Number(wcOrderId)) {
      console.error('[paypal-capture] reference_id', referenced, '!= wcOrderId', wcOrderId);
      return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 });
    }

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

    const capture = await captureRes.json() as {
      status: string;
      id: string;
      purchase_units?: { reference_id?: string }[];
    };

    if (capture.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Estado inesperado: ${capture.status}` }, { status: 400 });
    }

    // Segunda pasada sobre la respuesta del capture (no solo sobre el GET previo),
    // por si la orden se modificó entre una llamada y la otra.
    const capturedRef = Number(capture.purchase_units?.[0]?.reference_id);
    if (Number.isFinite(capturedRef) && capturedRef !== Number(wcOrderId)) {
      console.error('[paypal-capture] reference_id del capture', capturedRef, '!= wcOrderId', wcOrderId);
      return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 });
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
