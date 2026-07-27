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
      ['talle', 'pa_talle', 'size', 'color', 'pa_color'].includes((a.name ?? '').toLowerCase()) &&
      (a.option ?? '').toLowerCase() === size.toLowerCase(),
    );
    if (hit) return { product_id: productId, variation_id: v.id };
  }
  return { product_id: productId };
}

const PAYMENT_TITLES: Record<string, string> = {
  tarjeta:       'Credit / Debit Card (MercadoPago)',
  mercadopago:   'MercadoPago',
  transferencia: 'Bank Transfer',
  paypal:        'PayPal',
  gocuotas:      'GOcuotas',
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const {
      customer, shipping, couponCode,
      paymentMethod, shippingMethodId, shippingLabel, shippingBranch,
      fbp, fbc,
    } = rawBody;
    // Nunca confiar en el navegador: cualquier línea marcada como regalo (o
    // manipulada para simularlo) se descarta acá. El Gift Engine (enganchado a
    // woocommerce_rest_pre_insert_shop_order_object) recalcula y agrega el
    // regalo oficial sobre la orden real, del lado de WordPress.
    const items = Array.isArray(rawBody.items) ? rawBody.items.filter((it: any) => it?.isGift !== true) : [];

    const country = (customer.pais && customer.pais !== 'OTHER') ? customer.pais : 'AR';

    const lineItems = await Promise.all(
      (items as any[]).map(async (item) => {
        const resolved = await resolveItem(item.id, item.size);
        const lineTotal = String(Math.round(Number(item.price) * Number(item.quantity)));
        const li: Record<string, unknown> = {
          ...resolved,
          quantity: item.quantity,
          subtotal: lineTotal,
          total: lineTotal,
        };
        // Personalización de dorsal → meta visible en la orden de WooCommerce
        const c = item.customization;
        if (c && (c.playerName || c.number)) {
          const m: { key: string; value: string }[] = [];
          if (c.number)     m.push({ key: 'Número dorsal', value: String(c.number) });
          if (c.playerName) m.push({ key: 'Nombre dorsal', value: String(c.playerName) });
          li.meta_data = m;
        }
        return li;
      }),
    );

    const billing = {
      first_name: customer.nombre   ?? '',
      last_name:  customer.apellido ?? '',
      email:      customer.email    ?? '',
      phone:      customer.telefono ?? '',
      address_1:  customer.depto ? `${customer.direccion}, ${customer.depto}` : (customer.direccion ?? ''),
      city:       customer.ciudad    ?? '',
      state:      customer.provincia ?? '',
      postcode:   customer.cp        ?? '',
      country,
    };

    const paymentTitle = PAYMENT_TITLES[paymentMethod] ?? paymentMethod;

    const order: Record<string, unknown> = {
      payment_method:       paymentMethod,
      payment_method_title: paymentTitle,
      set_paid:             false,
      billing,
      shipping:             { ...billing, email: '', phone: '' },
      line_items:           lineItems,
      shipping_lines:       shippingMethodId
        ? [{ method_id: shippingMethodId, method_title: shippingLabel ?? shippingMethodId, total: String(shipping ?? 0) }]
        : [],
    };

    if (couponCode) order.coupon_lines = [{ code: couponCode }];

    const meta: { key: string; value: string }[] = [];
    if (customer.dni)       meta.push({ key: '_billing_dni',    value: customer.dni });
    if (customer.instagram) meta.push({ key: '_instagram',      value: customer.instagram });
    if (shippingBranch)     meta.push({ key: '_shipping_branch', value: shippingBranch });
    if (fbp)                meta.push({ key: '_fbp',             value: String(fbp) });
    if (fbc)                meta.push({ key: '_fbc',             value: String(fbc) });
    // El plugin andreani-shipping valida el envío contra este meta, que WooCommerce
    // solo setea en el checkout nativo (sesión). Sin esto acá, el plugin rechaza el
    // pedido con "no es válida para envío Andreani" al querer empaquetarlo.
    if (shippingMethodId)   meta.push({ key: '_chosen_shipping', value: shippingMethodId });
    if (meta.length)        order.meta_data = meta;

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body:    JSON.stringify(order),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[create-order-intl] WC error:', res.status, txt);
      return NextResponse.json({ message: `WC ${res.status}: ${txt}` }, { status: 502 });
    }

    const wcOrder = await res.json() as { id: number; number: string; order_key: string; total: string };

    const SITE = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
    fetch(`${SITE}/api/send-confirmation`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNum:      String(wcOrder.number),
        wcOrderId:     wcOrder.id,
        orderKey:      wcOrder.order_key,
        items:         (items as any[]).map((i: any) => ({
          name: i.name, size: i.size, quantity: i.quantity, price: i.price, customization: i.customization,
        })),
        total:         parseFloat(wcOrder.total),
        email:         customer.email,
        nombre:        customer.nombre,
        apellido:      customer.apellido,
        ciudad:        customer.ciudad,
        provincia:     customer.provincia,
        paymentMethod,
        pais:          customer.pais || country,
        // PayPal recién se confirma cuando el cliente aprueba (paypal-capture /
        // paypal-webhook) — no mandarle "pago recibido" al crear la orden.
        paymentPending: paymentMethod === 'paypal',
      }),
    }).catch((e) => console.error('[create-order-intl] email error:', e));

    return NextResponse.json({
      wcOrderId:     wcOrder.id,
      wcOrderNumber: String(wcOrder.number),
      orderKey:      wcOrder.order_key,
      initPoint:     null,
      paypalUrl:     null,
    });
  } catch (err) {
    console.error('[create-order-intl]', err);
    return NextResponse.json({ message: 'Error creating order' }, { status: 500 });
  }
}
