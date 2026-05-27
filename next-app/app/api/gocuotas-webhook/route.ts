import { NextRequest, NextResponse } from 'next/server';

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

    if (orderId && status === 'approved') {
      const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
        body:    JSON.stringify({ status: 'processing' }),
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
