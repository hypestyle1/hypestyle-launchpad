import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET           || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, first_name, last_name, company, address_1, city, state, postcode, phone, min_order } = body;

  // Dirección/ciudad NO son obligatorias acá: se las pide el sitio al
  // cliente en su primer pedido (ver /api/mayorista/pedido) y quedan
  // guardadas en su perfil desde ahí en adelante.
  if (!email || !password || !first_name || !phone) {
    return NextResponse.json({ message: 'Faltan datos obligatorios' }, { status: 400 });
  }

  const billing = {
    first_name, last_name: last_name || '', company: company || '',
    address_1: address_1 || '', city: city || '', state: state || '', postcode: postcode || '', country: 'AR', phone, email,
  };

  // Sin guión bajo: WC descarta en silencio los meta "protegidos" al crear
  // un customer por REST (a diferencia de las órdenes, donde sí se graban).
  const metaData = [{ key: 'es_mayorista', value: 'yes' }];
  const minOrderNum = Number(min_order);
  if (min_order !== '' && min_order != null && Number.isFinite(minOrderNum) && minOrderNum >= 0) {
    metaData.push({ key: 'mayorista_min_order', value: String(minOrderNum) });
  }

  const customer = {
    email,
    password,
    first_name,
    last_name: last_name || '',
    billing,
    shipping: { ...billing, phone: undefined },
    meta_data: metaData,
  };

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify(customer),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[admin/mayorista-create] WC error:', res.status, txt);
    let message = `Error de WooCommerce (${res.status})`;
    try {
      const parsed = JSON.parse(txt);
      if (parsed.message) message = parsed.message;
    } catch {}
    return NextResponse.json({ message }, { status: 502 });
  }

  const created = await res.json();
  return NextResponse.json({ ok: true, customerId: created.id, email: created.email });
}
