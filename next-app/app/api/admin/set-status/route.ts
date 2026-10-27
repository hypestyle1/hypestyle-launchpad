import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { esEstadoWcValido, WC_ORDER_STATUSES } from '@/lib/wc-order-status';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId y status requeridos' }, { status: 400 });
  }

  // WC valida `status` contra wc_get_order_statuses() y responde 400 por un
  // estado que no existe. Se corta acá para que el error diga qué pasó en vez de
  // llegar como un 502 genérico: así se perdían las marcas de "enviado" (el PUT
  // fallaba, el panel mostraba el cambio igual y nadie se enteraba).
  if (!esEstadoWcValido(status)) {
    return NextResponse.json(
      { error: `El estado "${status}" no existe en WooCommerce. Válidos: ${WC_ORDER_STATUSES.join(', ')}.` },
      { status: 400 },
    );
  }

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || `WC ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, status: data.status });
}
