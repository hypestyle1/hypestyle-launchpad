import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY!;
const WC_SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { billing, items, notes } = await req.json();

    const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

    const lineItems = items.map((item: any) => ({
      name: item.size && item.size !== 'U'
        ? `${item.name} — Talle ${item.size}`
        : item.name,
      quantity: item.quantity,
      subtotal: String(item.price * item.quantity),
      total: String(item.price * item.quantity),
    }));

    const orderBody = {
      payment_method: 'woo-mercado-pago-basic',
      payment_method_title: 'MercadoPago',
      status: 'pending',
      billing: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        email: billing.email,
        phone: billing.phone,
        address_1: billing.address,
        address_2: billing.addressExtra || '',
        city: billing.city,
        state: billing.province,
        postcode: billing.postcode,
        country: 'AR',
      },
      shipping: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        address_1: billing.address,
        address_2: billing.addressExtra || '',
        city: billing.city,
        state: billing.province,
        postcode: billing.postcode,
        country: 'AR',
      },
      line_items: lineItems,
      customer_note: notes || '',
    };

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(orderBody),
    });

    const order = await res.json();

    if (!res.ok) {
      console.error('WC order error:', order);
      return NextResponse.json(
        { error: order.message || 'Error al crear la orden' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      orderId: order.id,
      orderKey: order.order_key,
      paymentUrl: order.payment_url,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
