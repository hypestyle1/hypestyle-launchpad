import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const sp     = req.nextUrl.searchParams;
  const page   = sp.get('page')   || '1';
  const status = sp.get('status') || 'any';
  const search = sp.get('search') || '';
  const after  = sp.get('after')  || '2026-05-10T00:00:00';

  const params = new URLSearchParams({
    per_page: '100',
    page,
    orderby: 'date',
    order:   'desc',
    after,
    _cb:     String(Date.now()), // evita el caché de LiteSpeed en el server de WP (devuelve meta_data vieja)
    ...(status !== 'any' && { status }),
    ...(search && { search }),
  });

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
    headers: { Authorization: wcAuth() },
    next:    { revalidate: 0 },
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });
  }

  const raw        = await res.json() as any[];
  const total      = parseInt(res.headers.get('X-WP-Total')      || '0');
  const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');

  const orders = raw.map((o) => {
    const meta = (o.meta_data as any[]) || [];
    const mv = (k: string) => meta.find((m: any) => m.key === k)?.value || '';
    const tracking = String(mv('_tracking_number')).trim();
    const andreani = String(mv('_order_andreani_numero_interno') || mv('_andreani_tracking_number')).trim();
    const pedidoId = String(mv('_order_andreani_pedido_id')).trim();
    // Empaquetado = se generó el rótulo en Andreani (pedidoId/numero interno), pero
    // Andreani todavía no le asignó guía real — para eso hace falta pagar el envío en
    // su portal. Enviado = ya tiene guía (_tracking_number), prueba real de que entró
    // al circuito de despacho. Antes se los trataba como lo mismo ("dispatched").
    const packaged = !!(pedidoId || andreani);
    const shipped  = !!tracking;
    return {
      id:            o.id,
      number:        o.number,
      date:          o.date_created,
      status:        o.status,
      isMayorista:   mv('_es_mayorista') === 'true',
      customer:      {
        first_name: o.billing.first_name,
        last_name:  o.billing.last_name,
        email:      o.billing.email,
        phone:      o.billing.phone,
      },
      items: (o.line_items as any[]).map((i) => ({
        name:     i.name,
        quantity: i.quantity,
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
      total:                parseFloat(o.total),
      shipping_total:       parseFloat(o.shipping_total),
      payment_method_title: o.payment_method_title,
      tracking,
      andreani,
      packaged,
      shipped,
      notified:      String(mv('_tracking_notified')).trim(),
      order_key:     o.order_key,
      customer_note: o.customer_note || '',
    };
  });

  return NextResponse.json({ orders, total, totalPages, page: parseInt(page) });
}
