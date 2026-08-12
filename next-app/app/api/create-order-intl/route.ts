import { NextRequest, NextResponse } from 'next/server';
import { quoteIntlShipping, IntlShippingLine } from '@/lib/shipping-intl';

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

async function resolveItem(
  slug: string,
  size: string,
): Promise<{ product_id: number; variation_id?: number; category?: string; weightKg?: number }> {
  const products = await wcGet(
    `products?slug=${encodeURIComponent(slug)}&_fields=id,type,weight,categories&per_page=1`,
  );
  if (!products.length) throw new Error(`Product not found: ${slug}`);
  const { id: productId, type, weight, categories } = products[0];
  // Categoría y peso viajan con el ítem para poder recalcular el envío acá y no
  // depender del número que mandó el navegador.
  const meta = {
    category: categories?.[0]?.name as string | undefined,
    weightKg: Number(weight) > 0 ? Number(weight) : undefined,
  };

  if (type !== 'variable') return { product_id: productId, ...meta };

  const variations = await wcGet(`products/${productId}/variations?per_page=100&_fields=id,attributes`);
  for (const v of variations) {
    const hit = (v.attributes ?? []).find((a: any) =>
      ['talle', 'pa_talle', 'size', 'color', 'pa_color'].includes((a.name ?? '').toLowerCase()) &&
      (a.option ?? '').toLowerCase() === size.toLowerCase(),
    );
    if (hit) return { product_id: productId, variation_id: v.id, ...meta };
  }
  return { product_id: productId, ...meta };
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
      // shippingLabel del cliente ya no se usa: la etiqueta la arma el
      // recálculo de abajo, junto con el costo.
      paymentMethod, shippingMethodId, shippingBranch,
      fbp, fbc,
    } = rawBody;
    // Nunca confiar en el navegador: cualquier línea marcada como regalo (o
    // manipulada para simularlo) se descarta acá. El Gift Engine (enganchado a
    // woocommerce_rest_pre_insert_shop_order_object) recalcula y agrega el
    // regalo oficial sobre la orden real, del lado de WordPress.
    const items = Array.isArray(rawBody.items) ? rawBody.items.filter((it: any) => it?.isGift !== true) : [];

    const country = (customer.pais && customer.pais !== 'OTHER') ? customer.pais : 'AR';

    const shippingLines: IntlShippingLine[] = [];

    const lineItems = await Promise.all(
      (items as any[]).map(async (item) => {
        const { category, weightKg, ...resolved } = await resolveItem(item.id, item.size);
        shippingLines.push({ category, weightKg, quantity: Number(item.quantity) || 1 });
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

    // El envío se recalcula acá, con la categoría y el peso que se acaban de
    // leer de WooCommerce. El costo que mandó el navegador se ignora a
    // propósito: es el importe que después se le cobra al cliente vía wcTotal,
    // así que no puede salir del cliente. El checkout corre esta misma función
    // sobre los mismos datos, o sea que lo mostrado y lo cobrado coinciden.
    const quote = quoteIntlShipping(customer.pais ?? '', shippingLines);
    if (Math.round(quote.cost) !== Math.round(Number(shipping) || 0)) {
      console.warn(
        '[create-order-intl] envío recalculado:', quote.cost,
        '— el cliente había mandado:', shipping,
        `(${quote.zone}/${quote.tier}, ${quote.volumetricKg}kg vol, ${quote.actualKg}kg real)`,
      );
    }

    const order: Record<string, unknown> = {
      payment_method:       paymentMethod,
      payment_method_title: paymentTitle,
      set_paid:             false,
      billing,
      shipping:             { ...billing, email: '', phone: '' },
      line_items:           lineItems,
      shipping_lines:       [{
        method_id:    'fedex_international',
        method_title: quote.label,
        total:        String(Math.round(quote.cost)),
      }],
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
        shipping:      Math.round(quote.cost),
        shippingLabel: quote.label,
        // PayPal recién se confirma cuando el cliente aprueba (paypal-capture /
        // paypal-webhook) — no mandarle "pago recibido" al crear la orden.
        paymentPending: paymentMethod === 'paypal',
      }),
    }).catch((e) => console.error('[create-order-intl] email error:', e));

    return NextResponse.json({
      wcOrderId:     wcOrder.id,
      wcOrderNumber: String(wcOrder.number),
      orderKey:      wcOrder.order_key,
      // Total real de WooCommerce. El checkout cobra `wcTotal || totalFinal`, y
      // como esta ruta no lo devolvía, el pedido internacional caía siempre al
      // total calculado en el navegador: a PayPal se le pedía un importe que
      // venía del cliente y no de la orden. El flujo doméstico ya lo devuelve
      // (create-order-gocuotas); esto lo empareja.
      wcTotal:       parseFloat(wcOrder.total),
      initPoint:     null,
      paypalUrl:     null,
    });
  } catch (err) {
    console.error('[create-order-intl]', err);
    return NextResponse.json({ message: 'Error creating order' }, { status: 500 });
  }
}
