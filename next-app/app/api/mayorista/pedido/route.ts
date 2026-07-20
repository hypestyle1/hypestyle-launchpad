import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { formatArs } from '@/lib/mayorista-format';
import { getGlobalMinOrder, customerMinOrderOverride } from '@/lib/mayorista-settings';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_EMAIL = 'hypestylearg@gmail.com';
const SENDER = { name: 'Hypestyle Mayoristas', email: 'info@hypestyle.com.ar' };

interface PedidoItem {
  slug: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
}

interface ShippingInfo {
  first_name: string; last_name: string; company?: string;
  address_1: string; address_2?: string; city: string; state?: string;
  postcode?: string; country?: string; phone: string;
  dni: string; via_cargo_sucursal: string;
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

// Guarda la dirección/DNI/sucursal cargados en este pedido como perfil del
// cliente, para que /api/mayorista/perfil los precargue de ahí en adelante
// — así los tiene que tipear una vez por cuenta (y puede corregirlos en
// cualquier pedido posterior, el formulario sigue editable). dni/sucursal
// van sin guión bajo en meta_data: WC descarta en silencio los meta
// "protegidos" al actualizar un customer por REST.
async function saveCustomerProfile(customerId: number, billing: Record<string, unknown>, dni: string, viaCargoSucursal: string) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      billing,
      shipping: { ...billing, phone: undefined },
      meta_data: [
        { key: 'dni', value: dni },
        { key: 'via_cargo_sucursal', value: viaCargoSucursal },
      ],
    }),
  });
  if (!res.ok) console.error('[mayorista/pedido] no se pudo guardar el perfil del cliente:', res.status);
}

async function resolveItem(slug: string, size: string): Promise<{ product_id: number; variation_id?: number }> {
  const products = await wcGet(`products?slug=${encodeURIComponent(slug)}&_fields=id,type&per_page=1`);
  if (!products.length) throw new Error(`Producto no encontrado: ${slug}`);
  const { id: productId, type } = products[0];

  if (type !== 'variable') return { product_id: productId };

  const variations = await wcGet(`products/${productId}/variations?per_page=100&_fields=id,attributes`);
  const needle = size.toLowerCase().trim();
  const hit = variations.find((v: any) =>
    (v.attributes ?? []).some((a: any) => (a.option ?? '').toLowerCase().trim() === needle),
  );
  return hit ? { product_id: productId, variation_id: hit.id } : { product_id: productId };
}

async function sendAdminEmail(label: string, shipping: ShippingInfo, items: PedidoItem[], total: number, orderNumber: string) {
  if (!BREVO_API_KEY) return;
  const rows = items.map(it => `<tr>
    <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.size}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.quantity}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${formatArs(it.price)}</td>
  </tr>`).join('');

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Pedido mayorista — Hype.</h2>
    <p style="font-size:13px">Cliente: <b>${label}</b> — DNI ${shipping.dni}</p>
    <p style="font-size:12px;color:#444">${shipping.address_1}, ${shipping.city} ${shipping.state ?? ''} — ${shipping.phone}</p>
    <p style="font-size:12px;color:#444">Sucursal Via Cargo: <b>${shipping.via_cargo_sucursal}</b></p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Talle</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Cant.</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Precio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:13px;margin-top:10px">Total: <b>${formatArs(total)}</b></p>
    <p style="font-size:12px;color:#888">Orden WooCommerce #${orderNumber} (on-hold).</p>
  </div>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: ADMIN_EMAIL, name: 'Hypestyle' }],
      subject: `Pedido mayorista #${orderNumber} — ${label}`,
      htmlContent: html,
    }),
  }).catch((e) => console.error('[mayorista/pedido] email error:', e));
}

// Copia del resumen para el cliente — así queda guardado en su propio mail
// (el carrito no persiste después de confirmar, y no hay checkout/pago para
// que quede un comprobante de esa instancia).
async function sendCustomerEmail(toEmail: string, items: PedidoItem[], total: number, orderNumber: string) {
  if (!BREVO_API_KEY || !toEmail) return;
  const rows = items.map(it => `<tr>
    <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.size}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.quantity}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${formatArs(it.price)}</td>
  </tr>`).join('');

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Hype. — Resumen de tu pedido</h2>
    <p style="font-size:13px">Recibimos tu pedido <b>#${orderNumber}</b>. Te contactamos para coordinar preparación y entrega.</p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Talle</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Cant.</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Precio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:13px;margin-top:10px">Total: <b>${formatArs(total)}</b></p>
  </div>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: toEmail }],
      subject: `Tu pedido #${orderNumber} — Hype.`,
      htmlContent: html,
    }),
  }).catch((e) => console.error('[mayorista/pedido] customer email error:', e));
}

export async function POST(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { items, shipping } = await req.json() as { items: PedidoItem[]; shipping: ShippingInfo };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'El pedido está vacío' }, { status: 400 });
    }
    if (!shipping?.first_name || !shipping?.address_1 || !shipping?.city || !shipping?.phone || !shipping?.dni || !shipping?.via_cargo_sucursal) {
      return NextResponse.json({ message: 'Faltan datos de envío' }, { status: 400 });
    }

    const lineItems = await Promise.all(items.map(async (item) => {
      const resolved = await resolveItem(item.slug, item.size);
      const lineTotal = String(Math.round(item.price * item.quantity));
      return { ...resolved, quantity: item.quantity, subtotal: lineTotal, total: lineTotal };
    }));

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const customer = await wcGet(`customers/${customerId}?_fields=meta_data,email`);
    const minOrder = customerMinOrderOverride(customer.meta_data) ?? await getGlobalMinOrder();
    if (total < minOrder) {
      return NextResponse.json({ message: `El pedido mínimo es ${formatArs(minOrder)}` }, { status: 400 });
    }

    const label = shipping.company || `${shipping.first_name} ${shipping.last_name}`.trim();

    const billing = {
      first_name: shipping.first_name,
      last_name:  shipping.last_name,
      company:    shipping.company ?? '',
      address_1:  shipping.address_1,
      address_2:  shipping.address_2 ?? '',
      city:       shipping.city,
      state:      shipping.state ?? '',
      postcode:   shipping.postcode ?? '',
      country:    shipping.country ?? 'AR',
      phone:      shipping.phone,
    };

    const order = {
      customer_id:          customerId,
      status:                'on-hold',
      payment_method:        'mayorista',
      payment_method_title:  'Pedido mayorista',
      set_paid:              false,
      billing,
      shipping:              { ...billing, phone: undefined },
      line_items:            lineItems,
      meta_data: [
        { key: '_es_mayorista', value: 'true' },
        { key: '_billing_dni', value: shipping.dni },
        { key: '_via_cargo_sucursal', value: shipping.via_cargo_sucursal },
      ],
    };

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify(order),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[mayorista/pedido] WC error:', res.status, txt);
      return NextResponse.json({ message: `Error de WooCommerce (${res.status})` }, { status: 502 });
    }

    const wcOrder = await res.json() as { id: number; number: string };

    await Promise.all([
      sendAdminEmail(label, shipping, items, total, String(wcOrder.number)),
      sendCustomerEmail(customer.email, items, total, String(wcOrder.number)),
      saveCustomerProfile(customerId, billing, shipping.dni, shipping.via_cargo_sucursal),
    ]);

    return NextResponse.json({ wcOrderId: wcOrder.id, wcOrderNumber: String(wcOrder.number) });
  } catch (err) {
    console.error('[mayorista/pedido]', err);
    return NextResponse.json({ message: 'Error al crear el pedido' }, { status: 500 });
  }
}
