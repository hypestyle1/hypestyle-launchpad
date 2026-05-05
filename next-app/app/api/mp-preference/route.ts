import { NextRequest, NextResponse } from 'next/server';

const MP_TOKEN   = process.env.MP_ACCESS_TOKEN!;
const FRONTEND   = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle-launchpad.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const { wcOrderId, items, customer, shipping } = await req.json();

    const mpItems = items.map((item: any) => {
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
