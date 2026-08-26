import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  return adminSecretMatches(req.headers.get('x-admin-key'));
}

// Edita la dirección de envío (+ teléfono/DNI) de un pedido ya creado. Ojo: esto solo
// actualiza WooCommerce. Si Andreani ya generó la guía con la dirección vieja, el envío
// en Andreani NO se actualiza solo — su plugin lee la dirección del pedido recién al
// crear el envío, no hay una API oficial para editar una guía ya emitida (ver nota en
// el frontend). Si el envío todavía no se generó, esto sí queda reflejado ahí después.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json() as {
    shipping: { first_name: string; last_name: string; address_1: string; address_2?: string; city: string; state?: string; postcode?: string };
    phone?: string;
    dni?: string;
  };

  const { shipping, phone, dni } = body;
  if (!shipping?.first_name || !shipping?.last_name || !shipping?.address_1 || !shipping?.city) {
    return NextResponse.json({ error: 'Faltan datos de la dirección' }, { status: 400 });
  }

  const payload: any = {
    shipping: {
      first_name: shipping.first_name,
      last_name:  shipping.last_name,
      address_1:  shipping.address_1,
      address_2:  shipping.address_2 || '',
      city:       shipping.city,
      state:      shipping.state || '',
      postcode:   shipping.postcode || '',
      country:    'AR',
    },
  };
  if (phone !== undefined) payload.billing = { phone };
  if (dni !== undefined) payload.meta_data = [{ key: '_billing_dni', value: dni }];

  const updated = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json());

  if (updated?.code) {
    return NextResponse.json({ error: updated.message || 'No se pudo actualizar la dirección' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
