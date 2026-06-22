import { NextRequest, NextResponse } from 'next/server';

const MP_TOKEN   = process.env.MP_ACCESS_TOKEN!;
const FRONTEND   = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle-launchpad.vercel.app';
const WP_URL     = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId, wcTotal, items, customer, shipping } = await req.json();

    // Si wcTotal está disponible, escalar los precios de los ítems proporcionalmente
    // para que el cobro de MP coincida exactamente con el total de la orden en WooCommerce.
    // Esto corrige discrepancias por descuentos (ej: promo gol) que no se reflejan en el carrito del frontend.
    let adjustedItems = items;
    if (wcTotal && wcTotal > 0) {
      const frontendItemTotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
      const wcItemTotal = Number(wcTotal) - Number(shipping || 0);
      if (frontendItemTotal > 0 && Math.abs(wcItemTotal - frontendItemTotal) > 1) {
        const scale = wcItemTotal / frontendItemTotal;
        adjustedItems = items.map((i: any) => ({ ...i, price: Math.round(Number(i.price) * scale) }));
      }
    }

    const mpItems = adjustedItems.map((item: any) => {
      const title =
        item.size && item.size !== 'U' && item.size !== 'Única'
          ? `${item.name} — Talle ${item.size}`
          : item.name;
      return {
        id:          String(item.slug || item.id || 'item'),
        title,
        quantity:    Number(item.quantity),
        unit_price:  Number(item.price),
        currency_id: 'ARS',
        picture_url: item.image || undefined,
      };
    });

    if (shipping > 0) {
      mpItems.push({
        id:          'envio',
        title:       'Envío — Andreani',
        quantity:    1,
        unit_price:  Number(shipping),
        currency_id: 'ARS',
      });
    }

    const preference = {
      items: mpItems,
      external_reference: String(wcOrderId),
      back_urls: {
        success: `${FRONTEND}/confirmacion/?order=${wcOrderId}`,
        pending: `${FRONTEND}/pendiente-de-pago/?order=${wcOrderId}`,
        failure: `${FRONTEND}/checkout/`,
      },
      auto_return: 'approved',
      ...(WP_URL && { notification_url: `${WP_URL}/wp-json/hypestyle/v1/mp-webhook` }),
      payer: {
        email:   customer?.email   || '',
        name:    customer?.nombre  || '',
        surname: customer?.apellido || '',
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
