import { NextRequest, NextResponse } from 'next/server';
import { wcGet } from '@/lib/wc-admin';

const MP_TOKEN   = process.env.MP_ACCESS_TOKEN!;
const FRONTEND   = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle-launchpad.vercel.app';
const WP_URL     = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

// Estados en los que el pedido ya no admite un nuevo intento de cobro.
const NO_PAYABLE = new Set(['processing', 'completed', 'cancelled', 'refunded', 'trash']);

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId, items } = await req.json();

    const orderId = Number(wcOrderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }

    // El monto a cobrar sale SIEMPRE del pedido en WooCommerce, nunca del body:
    // el total que manda el browser es manipulable y MP marca como pago lo que
    // matchee external_reference, sin importar cuánto se cobró.
    const order = await wcGet<any>(`orders/${orderId}`);
    if (!order) {
      return NextResponse.json({ error: 'Pedido inexistente' }, { status: 400 });
    }
    if (NO_PAYABLE.has(String(order.status))) {
      return NextResponse.json({ error: 'El pedido no admite pago' }, { status: 409 });
    }

    const wcTotal    = Number(order.total);
    const wcShipping = Number(order.shipping_total || 0);
    const wcItemTotal = wcTotal - wcShipping;
    if (!(wcTotal > 0) || wcItemTotal < 0) {
      return NextResponse.json({ error: 'Pedido sin total' }, { status: 409 });
    }

    // Los items del body se usan sólo para que el checkout de MP muestre líneas
    // legibles. Si escalarlos al total real no cierra exacto (promos, redondeo),
    // se consolida en una sola línea: la suma cobrada tiene que ser wcItemTotal.
    let mpItems: any[] | null = null;
    if (Array.isArray(items) && items.length > 0) {
      const frontendItemTotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
      if (frontendItemTotal > 0) {
        const scale = wcItemTotal / frontendItemTotal;
        const scaled = items.map((item: any) => {
          const title =
            item.size && item.size !== 'U' && item.size !== 'Única'
              ? `${item.name} — Talle ${item.size}`
              : item.name;
          return {
            id:          String(item.slug || item.id || 'item'),
            title:       String(title || 'Producto'),
            quantity:    Number(item.quantity),
            unit_price:  Math.round(Number(item.price) * scale),
            currency_id: 'ARS',
            picture_url: item.image || undefined,
          };
        });
        const scaledTotal = scaled.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0);
        if (scaledTotal === wcItemTotal && scaled.every((i: any) => i.unit_price >= 0 && i.quantity > 0)) {
          mpItems = scaled;
        }
      }
    }
    if (!mpItems) {
      mpItems = wcItemTotal > 0
        ? [{ id: `pedido-${orderId}`, title: `Pedido #${orderId} — Hypestyle`, quantity: 1, unit_price: wcItemTotal, currency_id: 'ARS' }]
        : [];
    }

    if (wcShipping > 0) {
      mpItems.push({
        id:          'envio',
        title:       'Envío — Andreani',
        quantity:    1,
        unit_price:  wcShipping,
        currency_id: 'ARS',
      });
    }

    const preference = {
      items: mpItems,
      external_reference: String(orderId),
      back_urls: {
        success: `${FRONTEND}/confirmacion/?order=${orderId}`,
        pending: `${FRONTEND}/pendiente-de-pago/?order=${orderId}`,
        failure: `${FRONTEND}/checkout/`,
      },
      auto_return: 'approved',
      ...(WP_URL && { notification_url: `${WP_URL}/wp-json/hypestyle/v1/mp-webhook` }),
      payer: {
        email:   order.billing?.email      || '',
        name:    order.billing?.first_name || '',
        surname: order.billing?.last_name  || '',
      },
      payment_methods: { installments: 3 },
    };

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[mp-preference] MP error:', data);
      return NextResponse.json({ error: data.message || 'Error MP' }, { status: 500 });
    }

    return NextResponse.json({ initPoint: data.init_point });
  } catch (err) {
    console.error('[mp-preference] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
