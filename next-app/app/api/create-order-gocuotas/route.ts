import { NextRequest, NextResponse } from 'next/server';
import { getPromo3x2Status } from '@/lib/promo-3x2-status';
import { compute3x2Discount } from '@/lib/promo-3x2';
import { getPromoChampionStatus } from '@/lib/promo-champion-status';
import { computeChampionDiscount } from '@/lib/promo-champion';

const WP_URL  = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY  = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC  = process.env.WC_CONSUMER_SECRET  || '';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

// Transferencia local se cobra vía Talo Pay (CVU único por orden, confirmación automática).
const GATEWAY_IDS: Record<string, string> = {
  transferencia: 'talo-pay-cvu-woo',
};

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

// Misma sanitización server-side que /api/create-order: si el cliente manda un
// discountAmount que dice ser 3x2 o CAMPEON50 pero esa promo ya no está activa
// (resultado del partido cambió después de que cargó la página), recortamos esa
// porción antes de armar la orden. No toca cupón ni descuento por transferencia.
async function sanitizeDiscount(payload: any) {
  const label = String(payload?.discountLabel || '');
  if (!label.includes('3x2') && !label.includes('CAMPEON50')) return payload;

  const items = Array.isArray(payload.items) ? payload.items : [];
  let discountAmount = Number(payload.discountAmount || 0);

  if (label.includes('CAMPEON50')) {
    const status = await getPromoChampionStatus().catch(() => null);
    if (!status?.promoActive) {
      const realChampion = computeChampionDiscount(items.map((it: any) => ({ id: it.id, price: it.price, quantity: it.quantity })));
      discountAmount = Math.max(0, discountAmount - realChampion);
    }
  }

  if (label.includes('3x2')) {
    const status = await getPromo3x2Status().catch(() => null);
    if (!status?.promoActive) {
      const real3x2 = compute3x2Discount(items.map((it: any) => ({ price: it.price, quantity: it.quantity })));
      discountAmount = Math.max(0, discountAmount - real3x2);
    }
  }

  return { ...payload, discountAmount };
}

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.json();
    // Nunca confiar en el navegador: cualquier línea marcada como regalo (o
    // manipulada para simularlo) se descarta acá. El Gift Engine (enganchado a
    // woocommerce_rest_pre_insert_shop_order_object) recalcula y agrega el
    // regalo oficial sobre la orden real, del lado de WordPress.
    const cleanItems = Array.isArray(rawPayload.items) ? rawPayload.items.filter((it: any) => it?.isGift !== true) : [];
    const {
      items, customer, shipping, discountAmount, discountLabel, couponCode,
      paymentMethod, shippingMethodId, shippingLabel, shippingBranch, shippingBranchCode,
      fbp, fbc,
    } = await sanitizeDiscount({ ...rawPayload, items: cleanItems });

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
      transferencia: 'Talo Pay (transferencia)',
    };

    const order: Record<string, unknown> = {
      payment_method:       GATEWAY_IDS[paymentMethod] ?? paymentMethod ?? 'gocuotas',
      payment_method_title: PAYMENT_TITLES[paymentMethod] ?? paymentMethod,
      set_paid:             false,
      billing,
      shipping:             { ...billing, email: '', phone: '' },
      line_items:           lineItems,
      // Con envío gratis (promo/umbral) "shipping" llega en 0, pero igual hay que
      // registrar el shipping_line con ese method_id: sin él, Andreani no tiene de
      // dónde sacar el método de envío y rechaza el pedido al empaquetar.
      shipping_lines: shippingMethodId
        ? [{ method_id: shippingMethodId, method_title: shippingLabel ?? shippingMethodId, total: String(shipping ?? 0) }]
        : [],
      fee_lines: discountAmount > 0
        ? [{ name: discountLabel || 'Descuento', total: String(-Math.round(discountAmount)), tax_class: '' }]
        : [],
    };

    if (couponCode) order.coupon_lines = [{ code: couponCode }];

    const meta: { key: string; value: string }[] = [];
    if (customer.dni)       meta.push({ key: '_billing_dni',    value: customer.dni });
    if (customer.instagram) meta.push({ key: '_instagram',      value: customer.instagram });
    if (shippingBranch)     meta.push({ key: '_shipping_branch', value: shippingBranch });
    // `_shipping_branch` es texto para humanos; el plugin de Andreani lee SOLO
    // `_shipping_branch_code` (Andreani_Order_Mapper::get_branch_code_for_order) y sin él
    // rechaza el pedido con andreani_branch_missing antes de llamar a la API.
    if (shippingBranchCode) meta.push({ key: '_shipping_branch_code', value: String(shippingBranchCode) });
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
      console.error('[create-order-gocuotas] WC error:', res.status, txt);
      return NextResponse.json({ message: `WC ${res.status}: ${txt}` }, { status: 502 });
    }

    const wcOrder = await res.json() as { id: number; number: string; order_key: string; total: string };

    // Transferencia (Talo Pay): la orden ya quedó creada con el gateway real de Talo vía
    // wc/v3/orders. Talo genera el alias/CVU/monto de esa orden recién cuando algo visita
    // su pantalla nativa de order-pay — en vez de mandar ahí al cliente (sin marca, con un
    // selector de gateways confuso), le pedimos al mu-plugin los datos ya limpios para
    // mostrarlos en nuestra propia pantalla.
    let taloPaymentData: {
      alias: string | null; cvu: string | null; amount: number;
      beneficiario: string | null; cuit: string | null; banco: string | null; expiration: string | null;
    } | null = null;
    if (paymentMethod === 'transferencia') {
      try {
        const taloRes = await fetch(`${WP_URL}/wp-json/hypestyle/v1/talo-payment-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET, 'Authorization': `Bearer ${WP_SECRET}` },
          body: JSON.stringify({ order_id: wcOrder.id }),
        });
        if (taloRes.ok) {
          taloPaymentData = await taloRes.json();
        } else {
          console.error('[create-order-gocuotas] talo-payment-data error:', await taloRes.text());
        }
      } catch (e) {
        console.error('[create-order-gocuotas] talo-payment-data fetch error:', e);
      }
    }

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
        // Ninguno de estos confirma el pago al crear la orden: PayPal recién cuando
        // el cliente aprueba (paypal-capture/paypal-webhook), GOcuotas cuando aprueba
        // el crédito (gocuotas-webhook), Mercado Pago/tarjeta cuando vuelve de pagar
        // o llega el webhook (confirm-payment + confirm-paid). No mandar nada hasta
        // entonces.
        paymentPending: ['paypal', 'gocuotas', 'mercadopago', 'tarjeta'].includes(paymentMethod),
        // Datos reales de Talo (alias/CVU por orden) para que el mail no muestre
        // una cuenta bancaria distinta a la que se ve en /pendiente-de-pago/.
        talo: taloPaymentData,
      }),
    }).catch((e) => console.error('[create-order-gocuotas] email error:', e));

    return NextResponse.json({
      wcOrderId:     wcOrder.id,
      wcOrderNumber: String(wcOrder.number),
      orderKey:      wcOrder.order_key,
      wcTotal:       parseFloat(wcOrder.total),  // total real de WC (con sale_price aplicado)
      initPoint:     null,
      paypalUrl:     null,
      taloPaymentData,
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return NextResponse.json({ message: err.message }, { status: 409 });
    }
    console.error('[create-order-gocuotas]', err);
    return NextResponse.json({ message: 'Error al crear el pedido' }, { status: 500 });
  }
}
