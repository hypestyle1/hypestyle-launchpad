import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';
// Secreto del endpoint de emails (ver app/api/admin/send-order-emails).
const MAIL_SECRET  = 'hs2026';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

const wcGet = (path: string) =>
  fetch(`${WP_URL}/wp-json/wc/v3/${path}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());

const wcPut = (path: string, body: any) =>
  fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

// Devuelve las unidades de cada talle (variación) o producto simple al stock.
async function restoreItem(item: any) {
  const pid = item.product_id, vid = item.variation_id;
  const target = vid ? `products/${pid}/variations/${vid}` : `products/${pid}`;
  const prod = await wcGet(`${target}?_fields=id,name,manage_stock,stock_quantity`);
  if (!prod?.manage_stock || prod.stock_quantity === null || prod.stock_quantity === undefined) {
    return { name: item.name, skipped: 'no maneja stock' };
  }
  const newQty = Number(prod.stock_quantity) + Number(item.quantity || 0);
  const upd = await wcPut(target, { stock_quantity: newQty });
  return { name: item.name, from: prod.stock_quantity, to: upd?.stock_quantity ?? newQty };
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId, restock = false, notify = false } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const order = await wcGet(`orders/${orderId}?_fields=id,number,status,line_items,billing,meta_data`);
  if (!order?.id) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  // Si WC ya marcó el stock como reducido, lo restaura solo al cancelar (no duplicar).
  const wcWillRestore = (order.meta_data || []).some(
    (m: any) => m.key === '_order_stock_reduced' && String(m.value).toLowerCase() === 'yes'
  );

  let restored: any[] = [];
  if (restock && !wcWillRestore) {
    restored = await Promise.all((order.line_items || []).map(restoreItem));
  }

  // Cancelar
  const cancelled = await wcPut(`orders/${orderId}`, { status: 'cancelled' });
  if (cancelled?.code) {
    return NextResponse.json({ error: cancelled.message || 'No se pudo cancelar' }, { status: 502 });
  }

  // Mail de cancelación (Brevo) vía el endpoint existente
  let mail: any = null;
  if (notify) {
    try {
      const r = await fetch(
        `${req.nextUrl.origin}/api/admin/send-order-emails?secret=${MAIL_SECRET}&order_id=${orderId}&action=cancellation`,
        { cache: 'no-store' }
      );
      mail = await r.json();
    } catch (e: any) {
      mail = { error: String(e?.message || e) };
    }
  }

  return NextResponse.json({
    ok: true,
    status: 'cancelled',
    restock: restock ? (wcWillRestore ? 'restaurado por WooCommerce' : restored) : 'no',
    notify: notify ? (mail?.ok ? 'enviado' : mail) : 'no',
  });
}
