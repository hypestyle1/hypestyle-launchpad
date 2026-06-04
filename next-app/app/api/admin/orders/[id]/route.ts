import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [orderRes, notesRes] = await Promise.all([
    fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}`, {
      headers: { Authorization: wcAuth() },
      next: { revalidate: 0 },
    }),
    fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}/notes`, {
      headers: { Authorization: wcAuth() },
      next: { revalidate: 0 },
    }),
  ]);

  if (!orderRes.ok) {
    return NextResponse.json({ error: `WC ${orderRes.status}` }, { status: orderRes.status === 404 ? 404 : 502 });
  }

  const o     = await orderRes.json();
  const notes = notesRes.ok ? await notesRes.json() : [];

  const getMeta = (key: string) =>
    (o.meta_data as any[])?.find((m: any) => m.key === key)?.value || '';

  return NextResponse.json({
    id:      o.id,
    number:  o.number,
    status:  o.status,
    date:    o.date_created,
    customer: {
      first_name: o.billing.first_name,
      last_name:  o.billing.last_name,
      email:      o.billing.email,
      phone:      o.billing.phone,
    },
    billing: {
      address_1: o.billing.address_1,
      address_2: o.billing.address_2,
      city:      o.billing.city,
      state:     o.billing.state,
      postcode:  o.billing.postcode,
    },
    shipping: {
      first_name: o.shipping.first_name,
      last_name:  o.shipping.last_name,
      address_1:  o.shipping.address_1,
      address_2:  o.shipping.address_2,
      city:       o.shipping.city,
      state:      o.shipping.state,
      postcode:   o.shipping.postcode,
    },
    items: (o.line_items as any[]).map((i: any) => ({
      id:       i.id,
      name:     i.name,
      quantity: i.quantity,
      price:    parseFloat(i.price),
      total:    parseFloat(i.total),
      image:    i.image?.src || '',
      size:     (i.meta_data as any[])?.find((m: any) =>
        ['talle', 'pa_talle', 'size', 'pa_size'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalName:   (i.meta_data as any[])?.find((m: any) =>
        ['nombre dorsal', 'player name'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalNumber: (i.meta_data as any[])?.find((m: any) =>
        ['número dorsal', 'numero dorsal', 'number'].includes((m.key || '').toLowerCase())
      )?.value || '',
    })),
    shipping_lines: (o.shipping_lines as any[]).map((s: any) => ({
      method_title: s.method_title,
      total:        parseFloat(s.total),
    })),
    total:                parseFloat(o.total),
    shipping_total:       parseFloat(o.shipping_total),
    discount_total:       parseFloat(o.discount_total),
    payment_method:       o.payment_method,
    payment_method_title: o.payment_method_title,
    customer_note:        o.customer_note,
    adminNote:            getMeta('_hs_admin_note'),
    order_key:            o.order_key,
    tracking:   getMeta('_tracking_number'),
    notified:   getMeta('_tracking_notified'),
    andreani:   getMeta('_andreani_numero_de_envio') || getMeta('_andreani_remito'),
    pedido_id:  getMeta('_order_andreani_pedido_id'),
    notes: (notes as any[])
      .filter((n: any) => n.author && n.author !== 'system')
      .map((n: any) => ({ id: n.id, note: n.note, date: n.date_created, customer_note: n.customer_note })),
  });
}
