import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET           || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { active } = await req.json();
  if (typeof active !== 'boolean') {
    return NextResponse.json({ message: 'active debe ser boolean' }, { status: 400 });
  }

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${params.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      // Sin guión bajo: WC descarta en silencio los meta "protegidos" al
      // actualizar un customer por REST (mismo motivo que en la creación).
      meta_data: [{ key: 'es_mayorista', value: active ? 'yes' : 'no' }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[admin/mayoristas/id] WC error:', res.status, txt);
    return NextResponse.json({ message: `Error de WooCommerce (${res.status})` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, active });
}
