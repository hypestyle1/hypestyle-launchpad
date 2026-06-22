import { NextRequest, NextResponse } from 'next/server';

const WP_URL  = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY  = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC  = process.env.WC_CONSUMER_SECRET  || '';

class OutOfStockError extends Error {
  constructor(msg: string) { super(msg); this.name = 'OutOfStockError'; }
}

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function wcGet(path: string) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`WC ${res.status} on GET ${path}`);
  return res.json();
}

async function resolveItem(slug: string, size: string, itemName: string): Promise<{ product_id: number; variation_id?: number }> {
  const products = await wcGet(`products?slug=${encodeURIComponent(slug)}&_fields=id,type,stock_status&per_page=1`);
  if (!products.length) throw new Error(`Product not found: ${slug}`);
  const { id: productId, type, stock_status } = products[0];

  if (type !== 'variable') {
    if (stock_status === 'outofstock') {
      throw new OutOfStockError(`${itemName} no tiene stock disponible`);
    }
    return { product_id: productId };
  }

  const variations = await wcGet(`products/${productId}/variations?per_page=100&_fields=id,attributes,stock_status`);
  for (const v of variations) {
    const hit = (v.attributes ?? []).find((a: any) =>
      ['talle', 'pa_talle', 'size', 'color', 'pa_color'].includes((a.name ?? '').toLowerCase()) &&
      (a.option ?? '').toLowerCase() === size.toLowerCase(),
    );
    if (hit) {
      if (v.stock_status === 'outofstock') {
        throw new OutOfStockError(`${itemName} (talle ${size}) no tiene stock disponible`);
      }
      return { product_id: productId, variation_id: v.id };
    }
  }
  return { product_id: productId };
}

export async function POST(req: NextRequest) {
  try {
    const {
      items, customer, shipping, discountAmount, couponCode,
      paymentMethod, shippingMethodId, shippingLabel, shippingBranch,
      fbp, fbc,
    } = await req.json();

    const lineItems = await Promise.all(
      (items as any[]).map(async (item) => {
        const resolved = await resolveItem(item.id, item.size, item.name ?? item.id);
        // Pasar subtotal/total explícitos para que WC use el precio del carrito
        // (con descuento aplicado) en lugar de recalcular desde el catálogo.
        // Sin esto, si la ventana de sale_price expiró en WC, cobra precio lleno.
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
    if (fbp)                meta.push({ key: '_fbp',             value: String(fbp) });
    if (fbc)                meta.push({ key: '_fbc',             value: String(fbc) });
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
          name: i.name, size: i.size, quantity: i.quantity, price: i.price, customization: i.customization,
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
      wcTotal:       parseFloat(wcOrder.total),  // total real de WC (con sale_price aplicado)
      initPoint:     null,
      paypalUrl:     null,
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json({ message: err.message }, { status: 409 });
    }
    console.error('[create-order-gocuotas]', err);
    return NextResponse.json({ message: 'Error al crear el pedido' }, { status: 500 });
  }
}
