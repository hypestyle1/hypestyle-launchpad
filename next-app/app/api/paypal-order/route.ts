import { NextRequest, NextResponse } from 'next/server';
import { getUsdRate } from '@/lib/fx';
import { PAYPAL_API, paypalAccessToken } from '@/lib/paypal';
import { wcGet, wcPut, wcNote, PAYPAL_ORDER_META } from '@/lib/wc-admin';
import { totalCobrable } from '@/lib/total-cobrable';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://lightpink-rook-704850.hostingersite.com';

// La cotización vive en lib/fx y la comparte con el precio que se muestra en
// el sitio (LocaleContext vía /api/fx-rate). Antes esta ruta tenía su propia
// copia con un respaldo de 1250 mientras la vitrina usaba otro número fijo:
// se publicaba un precio y se cobraba otro.

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId: rawId, totalARS: totalCliente } = await req.json() as { wcOrderId: number; totalARS?: number };
    const wcOrderId = Number(rawId);
    if (!Number.isInteger(wcOrderId) || wcOrderId <= 0) {
      return NextResponse.json({ error: 'wcOrderId requerido' }, { status: 400 });
    }

    // El monto sale del pedido en WooCommerce, nunca del body (auditoría 28/09,
    // C1): antes se cobraba el totalARS que mandaba el navegador.
    const cobrable = totalCobrable(await wcGet<any>(`orders/${wcOrderId}`));
    if (cobrable.ok === false) {
      return NextResponse.json({ error: cobrable.error }, { status: cobrable.status });
    }
    const totalARS = cobrable.total;
    if (totalCliente && Math.round(Number(totalCliente)) !== Math.round(totalARS)) {
      console.warn('[paypal-order] el navegador mandó', totalCliente, '— el pedido', wcOrderId, 'dice', totalARS);
    }

    const [token, usdRate] = await Promise.all([paypalAccessToken(), getUsdRate()]);

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

    // El id de la orden de PayPal queda guardado en el pedido de WooCommerce
    // ANTES de mandar al cliente a pagar. Hasta el 14/08/2026 no se guardaba en
    // ningún lado: un pedido que quedaba en `pending` era indistinguible de uno
    // donde el cliente nunca aprobó, y no había forma —ni siquiera a posteriori—
    // de preguntarle a PayPal qué pasó. Es lo que hace posible la reconciliación
    // de /api/paypal-reconcile. Si falla, no se corta el pago: se pierde el
    // rastro, no la venta.
    await wcPut(`orders/${wcOrderId}`, {
      meta_data: [{ key: PAYPAL_ORDER_META, value: order.id }],
    }).catch(() => false);
    await wcNote(wcOrderId, `PayPal: orden ${order.id} creada por USD ${totalUSD} (cotización ${usdRate}). Esperando aprobación del cliente.`);

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
