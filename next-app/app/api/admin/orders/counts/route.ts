import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// _order_andreani_pedido_id / _order_andreani_numero_interno se cargan al EMPAQUETAR
// (se generó el rótulo en Andreani). _tracking_number solo aparece cuando Andreani ya
// le asignó guía real — recién ahí entró de verdad al circuito de envío (para cuentas
// Pyme, eso pasa después de pagar el envío en el portal de Andreani).
const PACKAGED_KEYS = ['_order_andreani_pedido_id', '_order_andreani_numero_interno', '_andreani_tracking_number'];
const hasMeta = (meta: any[], keys: string[]) =>
  (meta || []).some((m) => keys.includes(m.key) && String(m.value || '').trim() !== '');

async function statusTotal(status: string, after: string): Promise<number> {
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?status=${status}&per_page=1&after=${after}&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
  );
  return parseInt(res.headers.get('X-WP-Total') || '0');
}

// Trae todas las órdenes 'processing' (con su meta) para separar sin-empaquetar /
// empaquetado-sin-enviar / enviado. _cb evita el caché de LiteSpeed en el server de
// WP, que puede devolver meta_data vieja (ej. tracking que se acaba de cargar).
async function processingSplit(after: string) {
  let page = 1, sinEmpaquetar = 0, empaquetados = 0, enviados = 0;
  for (;;) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?status=processing&per_page=100&page=${page}&after=${after}&_fields=id,meta_data&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
    );
    if (!res.ok) break;
    const data = (await res.json()) as any[];
    if (!data.length) break;
    for (const o of data) {
      if (hasMeta(o.meta_data, ['_tracking_number'])) enviados++;
      else if (hasMeta(o.meta_data, PACKAGED_KEYS)) empaquetados++;
      else sinEmpaquetar++;
    }
    if (data.length < 100) break;
    page++;
  }
  return { sinEmpaquetar, empaquetados, enviados };
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const after = req.nextUrl.searchParams.get('after') || '2026-05-10T00:00:00';

  const [proc, pendientes, enviados] = await Promise.all([
    processingSplit(after),
    statusTotal('pending', after),
    statusTotal('enviado', after),
  ]);

  return NextResponse.json({
    porEmpaquetar:     proc.sinEmpaquetar, // pagado, sin rótulo → hay que empaquetarlo en Andreani
    empaquetados:      proc.empaquetados,  // tiene rótulo, falta que Andreani le asigne guía (pagar en su portal)
    enviadosSinMarcar: proc.enviados,      // ya tiene guía real pero sigue en estado "procesando"
    pendientes,                            // sin pagar
    despachados:       enviados,           // pedidos marcados manualmente como estado "enviado"
  });
}
