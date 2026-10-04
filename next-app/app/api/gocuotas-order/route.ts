import { NextRequest, NextResponse } from 'next/server';
import { gocuotasWebhookToken } from '@/lib/gocuotas-webhook-token';
import { wcGet } from '@/lib/wc-admin';
import { totalCobrable } from '@/lib/total-cobrable';

const GC_BASE  = 'https://www.gocuotas.com';
const SITE_URL = 'https://hypestyle.com.ar';

// Use production API key directly — no email/password auth step needed
const GC_API_KEY = (process.env.GOCUOTAS_API_KEY || '').trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      wcOrderId: number; total?: number; email: string; phone: string; orderKey: string;
    };
    const wcOrderId = Number(body.wcOrderId);
    if (!Number.isInteger(wcOrderId) || wcOrderId <= 0) {
      return NextResponse.json({ error: 'wcOrderId requerido' }, { status: 400 });
    }
    // El monto sale del pedido en WooCommerce, nunca del body (auditoría 28/09,
    // C1): antes se mandaba a GOcuotas el total que decía el navegador.
    const pedido = await wcGet<any>(`orders/${wcOrderId}`);
    const cobrable = totalCobrable(pedido);
    if (cobrable.ok === false) {
      return NextResponse.json({ error: cobrable.error }, { status: cobrable.status });
    }
    const total = cobrable.total;
    if (body.total && Math.round(Number(body.total)) !== Math.round(total)) {
      console.warn('[gocuotas-order] el navegador mandó', body.total, '— el pedido', wcOrderId, 'dice', total);
    }
    // La clave del pedido también sale de Woo: va en la URL de vuelta.
    const orderKey = String(pedido?.order_key || body.orderKey || '');
    const email = String(pedido?.billing?.email || body.email || '');
    const phone = String(pedido?.billing?.phone || body.phone || '');

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
      // Token por pedido: es lo único que autentica el POST de vuelta (GOcuotas
      // no firma sus webhooks). Ver lib/gocuotas-webhook-token.ts.
      webhook_url:  `${SITE_URL}/api/gocuotas-webhook?token=${gocuotasWebhookToken(wcOrderId)}`,
      email,
      phone_number: phoneE164,
    };

    // El token del webhook no va al log (queda en los logs de Vercel para siempre).
    console.log('[gocuotas-order] payload:', JSON.stringify({
      ...payload,
      webhook_url: `${SITE_URL}/api/gocuotas-webhook?token=***`,
    }));

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
