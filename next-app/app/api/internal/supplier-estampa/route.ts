import { NextRequest, NextResponse } from 'next/server';
import { sendSupplierEmail } from '@/lib/supplier-email';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Disparado por WordPress (hook woocommerce_order_status_processing) cuando la
// orden queda PAGA. Relee la orden de Woo, reconstruye los ítems con su
// personalización (dorsal/talle) y manda la ficha + estampas al proveedor.

const WP_SECRET = (process.env.WP_SECRET || '').trim();
const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_BASE = `${WP_URL}/wp-json/wc/v3`;
const CK = (process.env.WC_CONSUMER_KEY || '').trim();
const CS = (process.env.WC_CONSUMER_SECRET || '').trim();
const wcAuth = () => 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');

function metaVal(li: any, ...keys: string[]): string {
  const md = li.meta_data || [];
  for (const k of keys) {
    const m = md.find((x: any) => String(x.display_key || x.key || '').toLowerCase() === k.toLowerCase());
    if (m && (m.display_value || m.value)) return String(m.display_value || m.value);
  }
  return '';
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const secret = req.headers.get('x-hypestyle-secret') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!WP_SECRET || (token !== WP_SECRET && secret !== WP_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return NextResponse.json({ error: 'order_id requerido' }, { status: 400 });

  const r = await fetch(`${WC_BASE}/orders/${order_id}?_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
  if (!r.ok) return NextResponse.json({ error: `WC ${r.status}` }, { status: 502 });
  const o = await r.json();

  const items = (o.line_items || []).map((li: any) => ({
    name: li.name,
    quantity: li.quantity,
    size: metaVal(li, 'Talle', 'pa_talle') || (String(li.name).match(/-\s*([A-Za-z0-9]{1,3})\s*$/)?.[1] || ''),
    customization: {
      playerName: metaVal(li, 'Nombre dorsal'),
      number: metaVal(li, 'Número dorsal', 'Numero dorsal'),
    },
  }));

  const res = await sendSupplierEmail({
    orderNum: o.number,
    nombre: o.billing?.first_name,
    apellido: o.billing?.last_name,
    email: o.billing?.email,
    items,
  });

  // status 200 si se mandó o si no había nada para mandar (ambos: WP marca el flag)
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
