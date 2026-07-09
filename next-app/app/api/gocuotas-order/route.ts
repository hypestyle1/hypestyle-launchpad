import { NextRequest, NextResponse } from 'next/server';

const GC_BASE  = 'https://www.gocuotas.com';
const SITE_URL = 'https://hypestyle.com.ar';

// Use production API key directly — no email/password auth step needed
const GC_API_KEY = (process.env.GOCUOTAS_API_KEY || '').trim();

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId, total, email, phone, orderKey } = await req.json() as {
      wcOrderId: number; total: number; email: string; phone: string; orderKey: string;
    };

    if (!GC_API_KEY) {
      console.error('[gocuotas-order] GOCUOTAS_API_KEY not set');
      return NextResponse.json({ error: 'GOcuotas API key not configured' }, { status: 500 });
    }

    // Normalizar a formato internacional argentino: 549 + código de área + número.
    // Los celulares en AR necesitan el "9" después del 54 (mismo criterio que ya
    // se usa para los links de WhatsApp en admin/pedidos) — sin el 9, el número
    // queda mal formado y GOcuotas puede rechazar o no poder validar al cliente.
    const digits = phone ? phone.replace(/\D/g, '') : '';
    const clean  = digits.startsWith('0') ? digits.slice(1) : digits;
    const phoneE164 = clean ? (clean.startsWith('54') ? clean : `549${clean}`) : '';

    const payload = {
      amount_in_cents:    Math.round(total * 100),
      order_reference_id: String(wcOrderId),
      url_success:  `${SITE_URL}/confirmacion/?order_id=${wcOrderId}&key=${orderKey}&gocuotas=approved`,
      url_failure:  `${SITE_URL}/checkout/?gocuotas=failed`,
      webhook_url:  `${SITE_URL}/api/gocuotas-webhook`,
      email,
      phone_number: phoneE164,
    };

    console.log('[gocuotas-order] payload:', JSON.stringify(payload));

    const res = await fetch(`${GC_BASE}/api_redirect/v1/checkouts`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${GC_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const rawBody = await res.text();
    console.log('[gocuotas-order] response status:', res.status);
    console.log('[gocuotas-order] response body:', rawBody);

    if (!res.ok) {
      console.error('[gocuotas-order] checkout error:', res.status, rawBody);
      return NextResponse.json({ error: `GOcuotas ${res.status}: ${rawBody}` }, { status: 502 });
    }

    let data: { url_init: string };
    try { data = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON from GOcuotas' }, { status: 502 }); }
    console.log('[gocuotas-order] url_init:', data.url_init);
    return NextResponse.json({ urlInit: data.url_init });
  } catch (err) {
    console.error('[gocuotas-order]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
