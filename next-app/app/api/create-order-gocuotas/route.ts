import { NextRequest, NextResponse } from 'next/server';

const WP_URL  = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY  = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC  = process.env.WC_CONSUMER_SECRET  || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function wcGet(path: string) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: wcAuth() },
  });
  if (!res.ok) throw new Error(`WC ${res.status} on GET ${path}`);
  return res.json();
}

async function resolveItem(slug: string, size: string): Promise<{ product_id: number; variation_id?: number }> {
  const products = await wcGet(`products?slug=${encodeURIComponent(slug)}&_fields=id,type&per_page=1`);
  if (!products.length) throw new Error(`Product not found: ${slug}`);
  const { id: productId, type } = products[0];

  if (type !== 'variable') return { product_id: productId };

  const variations = await wcGet(`products/${productId}/variations?per_page=100&_fields=id,attributes`);
  for (const v of variations) {
    const hit = (v.attributes ?? []).find((a: any) =>
      ['talle', 'talle', 'pa_talle', 'size'].includes((a.name ?? '').toLowerCase()) &&
      (a.option ?? '').toLowerCase() === size.toLowerCase(),
    );
    if (hit) return { product_id: productId, variation_id: v.id };
  }
  return { product_id: productId };
}

export async function POST(req: NextRequest) {
  try {
    const {
      items, customer, shipping, discountAmount, couponCode,
      paymentMethod, shippingMethodId, shippingLabel, shippingBranch,
    } = await req.json();

    const lineItems = await Promise.all(
      (items as any[]).map(async (item) => {
        const resolved = await resolveItem(item.id, item.size);
        return { ...resolved, quantity: item.quantity };
      }),
    );

    const billing = {
      first_name: customer.nombre   ?? '',
      last_name:  customer.apellido ?? '',
      email:      customer.email    ?? '',
      phone:      customer.telefono ?? '',
      address_1:  customer.depto ? `${customer.direccion}, ${customer.depto}` : (customer.direccion ?? ''),
      city:       customer.ciudad   ?? '',
      state:      customer.provincia ?? '',
      postcode:   customer.cp       ?? '',
      country:    'AR',
    };

    const PAYMENT_TITLES: Record<string, string> = {
      mercadopago:   'Mercado Pago',
      tarjeta:       'Tarjeta de crédito / débito (MercadoPago)',
      efectivo:      'Efectivo (MercadoPago)',
      gocuotas:      'GOcuotas — Cuotas con débito',
      transferencia: 'Transferencia bancaria',
    };

    const order: Record<string, unknown> = {
      payment_method:       paymentMethod ?? 'gocuotas',
      payment_method_title: PAYMENT_TITLES[paymentMethod] ?? paymentMethod,
      set_paid:             false,
      billing,
      shipping:             { ...billing, email: '', phone: '' },
      line_items:           lineItems,
      shipping_lines: shipping > 0 && shippingMethodId
        ? [{ method_id: shippingMethodId, method_title: shippingLabel ?? shippingMethodId, total: String(shipping) }]
        : [],
      fee_lines: discountAmount > 0
        ? [{ name: 'Descuento transferencia (10%)', total: String(-Math.round(discountAmount)), tax_class: '' }]
        : [],
    };

    if (couponCode) order.coupon_lines = [{ code: couponCode }];

    const meta: { key: string; value: string }[] = [];
    if (customer.dni)       meta.push({ key: '_billing_dni',    value: customer.dni });
    if (customer.instagram) meta.push({ key: '_instagram',      value: customer.instagram });
    if (shippingBranch)     meta.push({ key: '_shipping_branch', value: shippingBranch });
    if (meta.length)        order.meta_data = meta;

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body:    JSON.stringify(order),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[create-order-gocuotas] WC error:', res.status, txt);
      return NextResponse.json({ message: `WC ${res.status}: ${txt}` }, { status: 502 });
    }

    const wcOrder = await res.json() as { id: number; number: string; order_key: string; total: string };

    // Send confirmation email server-side — don't rely on frontend sessionStorage
    const SITE = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
    fetch(`${SITE}/api/send-confirmation`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNum:      String(wcOrder.number),
        wcOrderId:     wcOrder.id,
        orderKey:      wcOrder.order_key,
        items:         (items as any[]).map((i: any) => ({
          name: i.name, size: i.size, quantity: i.quantity, price: i.price,
        })),
        total:         parseFloat(wcOrder.total),
        email:         customer.email,
        nombre:        customer.nombre,
        apellido:      customer.apellido,
        ciudad:        customer.ciudad,
        provincia:     customer.provincia,
        paymentMethod,
        pais:          'AR',
      }),
    }).catch((e) => console.error('[create-order-gocuotas] email error:', e));

    return NextResponse.json({
      wcOrderId:     wcOrder.id,
      wcOrderNumber: String(wcOrder.number),
      orderKey:      wcOrder.order_key,
      initPoint:     null,
      paypalUrl:     null,
    });
  } catch (err) {
    console.error('[create-order-gocuotas]', err);
    return NextResponse.json({ message: 'Error al crear el pedido' }, { status: 500 });
  }
}
