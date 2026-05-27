import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API = 'https://api-m.paypal.com';
const CLIENT_ID  = process.env.PAYPAL_CLIENT_ID!;
const SECRET     = process.env.PAYPAL_CLIENT_SECRET!;
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://lightpink-rook-704850.hostingersite.com';

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function getUsdRate(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', { cache: 'no-store' });
    if (!res.ok) return 1250;
    const data = await res.json() as { venta?: number };
    return data.venta ?? 1250;
  } catch {
    return 1250;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId, totalARS } = await req.json() as { wcOrderId: number; totalARS: number };
    if (!wcOrderId || !totalARS) {
      return NextResponse.json({ error: 'wcOrderId y totalARS requeridos' }, { status: 400 });
    }

    const [token, usdRate] = await Promise.all([getAccessToken(), getUsdRate()]);

    const totalUSD = (totalARS / usdRate).toFixed(2);

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: String(wcOrderId),
          amount: {
            currency_code: 'USD',
            value: totalUSD,
          },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: `${FRONTEND_URL}/confirmacion/?order=${wcOrderId}`,
              cancel_url: `${FRONTEND_URL}/checkout`,
              user_action: 'PAY_NOW',
              brand_name: 'Hypestyle',
              locale: 'en-US',
              landing_page: 'BILLING',
            },
          },
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error('[paypal-order] create failed:', err);
      return NextResponse.json({ error: 'No se pudo crear la orden PayPal' }, { status: 500 });
    }

    const order = await orderRes.json() as {
      id: string;
      links: { rel: string; href: string }[];
    };

    const approvalLink = order.links.find(l => l.rel === 'payer-action' || l.rel === 'approve');
    if (!approvalLink) {
      return NextResponse.json({ error: 'No se encontró el link de aprobación' }, { status: 500 });
    }

    return NextResponse.json({
      paypalOrderId: order.id,
      approvalUrl: approvalLink.href,
      totalUSD,
      usdRate,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[paypal-order]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
