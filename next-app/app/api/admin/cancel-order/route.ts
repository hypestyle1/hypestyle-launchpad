import { NextRequest, NextResponse } from 'next/server';
import { adminHeaders, isAdminRequest } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// _cb evita el caché de LiteSpeed en el server de WP, que puede devolver meta_data/stock viejo
// (crítico acá: el restock calcula stock_actual + cantidad, así que necesita el valor real).
const wcGet = (path: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
};

const wcPut = (path: string, body: any) =>
  fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

// El combo CAMO FULL SET (938) consume físicamente 1 Zip Hoodie Camo (916) + 1 SweatPant Camo (901)
// del mismo talle. Woo no vincula bundles, así que hypestyle-api.php lo descuenta a mano al crear
// la orden — acá hay que restaurarlo a mano también al cancelar, o queda un faltante fantasma.
const CAMO_COMBO_ID = 938;
const CAMO_COMBO_LINKED_IDS = [916, 901];

async function findVariationIdBySize(parentId: number, size: string): Promise<number | null> {
  const variations = await wcGet(`products/${parentId}/variations?per_page=50&_fields=id,attributes`);
  if (!Array.isArray(variations)) return null;
  const match = variations.find((v: any) =>
    (v.attributes || []).some((a: any) => String(a.option || '').trim().toUpperCase() === size.trim().toUpperCase())
  );
  return match?.id ?? null;
}

// Devuelve al stock las unidades de un ítem (variación o producto simple).
async function restoreSingle(pid: number, vid: number | null, qty: number, name: string) {
  const target = vid ? `products/${pid}/variations/${vid}` : `products/${pid}`;
  const prod = await wcGet(`${target}?_fields=id,name,manage_stock,stock_quantity`);
  if (!prod?.manage_stock || prod.stock_quantity === null || prod.stock_quantity === undefined) {
    return { name, skipped: 'no maneja stock' };
  }
  const newQty = Number(prod.stock_quantity) + Number(qty || 0);
  const upd = await wcPut(target, { stock_quantity: newQty });
  return { name, from: prod.stock_quantity, to: upd?.stock_quantity ?? newQty };
}

// Devuelve las unidades de cada talle (variación) o producto simple al stock; si es el combo CAMO
// también restaura las unidades vinculadas de Zip Hoodie y SweatPant del mismo talle.
async function restoreItem(item: any): Promise<any[]> {
  const results = [await restoreSingle(item.product_id, item.variation_id, item.quantity, item.name)];

  if (item.product_id === CAMO_COMBO_ID) {
    const size = (item.meta_data || []).find((m: any) => (m.key || '').toLowerCase() === 'talle')?.value;
    if (size) {
      for (const linkedId of CAMO_COMBO_LINKED_IDS) {
        const linkedVid = await findVariationIdBySize(linkedId, String(size));
        if (linkedVid) {
          results.push(await restoreSingle(linkedId, linkedVid, item.quantity, `(vinculado combo) ${item.name}`));
        }
      }
    }
  }
  return results;
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
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
    restored = (await Promise.all((order.line_items || []).map(restoreItem))).flat();
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
        `${req.nextUrl.origin}/api/admin/send-order-emails?order_id=${orderId}&action=cancellation`,
        { cache: 'no-store', headers: adminHeaders() }
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
