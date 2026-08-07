import { NextRequest, NextResponse } from 'next/server';
import { sizeFromAttributes } from '@/lib/product-size';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !!ADMIN_SECRET && key === ADMIN_SECRET;
}

const wcGet = (path: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
};

type CreateItem = { productId: number; variationId: number | null; quantity: number };
type Billing = {
  first_name: string; last_name: string; email: string; phone: string; company?: string;
  address_1: string; address_2?: string; city: string; state?: string; postcode?: string;
};

// Carga manual de un pedido desde el panel (venta por WhatsApp, en persona, canje, etc) —
// igual que "crear pedido" en Shopify/Tienda Nube: elegís cliente + productos + talles y
// se crea el pedido real en WooCommerce, descontando stock.
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json() as {
    isMayorista: boolean;
    isGift?: boolean;
    customerId?: number;
    billing: Billing;
    dni?: string;
    viaCargoSucursal?: string;
    instagram?: string;
    items: CreateItem[];
    shippingTotal?: number;
    status: 'processing' | 'on-hold';
    note?: string;
  };

  const { isMayorista, isGift = false, customerId, billing = {} as Billing, dni, viaCargoSucursal, instagram, items = [], status, note } = body;
  // Un pedido 100% regalo no cobra nada — ni productos ni envío — para que la plata que
  // nunca entró no infle ningún total de facturación (esos totales solo suman order.total).
  const shippingTotal = isGift ? 0 : (body.shippingTotal || 0);

  if (!items.length) {
    return NextResponse.json({ error: 'El pedido no tiene productos' }, { status: 400 });
  }
  if (!['processing', 'on-hold'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const lineItems: any[] = [];
  const stockAdjustments: { productId: number; variationId: number | null; addedQty: number; stockBefore: number }[] = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) continue;

    const target = item.variationId ? `products/${item.productId}/variations/${item.variationId}` : `products/${item.productId}`;
    const prod = await wcGet(`${target}?_fields=id,name,attributes,regular_price,price,manage_stock,stock_quantity`);
    const basePrice = parseFloat(prod.regular_price || prod.price || '0');
    const unitPrice = isGift ? 0 : (isMayorista ? Math.round(basePrice * 0.5) : parseFloat(prod.price || prod.regular_price || '0'));
    const size = sizeFromAttributes(prod.attributes || []);

    lineItems.push({
      product_id: item.productId,
      variation_id: item.variationId || undefined,
      quantity: item.quantity,
      subtotal: (unitPrice * item.quantity).toFixed(2),
      total: (unitPrice * item.quantity).toFixed(2),
      meta_data: size ? [{ key: 'talle', value: size }] : [],
    });

    if (prod.manage_stock) {
      stockAdjustments.push({
        productId: item.productId,
        variationId: item.variationId,
        addedQty: item.quantity,
        stockBefore: Number(prod.stock_quantity ?? 0),
      });
    }
  }

  if (!lineItems.length) {
    return NextResponse.json({ error: 'Ningún ítem válido para agregar' }, { status: 400 });
  }

  const billingFull: Record<string, string> = {
    first_name: billing.first_name || '',
    last_name:  billing.last_name || '',
    phone:      billing.phone || '',
    company:    billing.company || '',
    address_1:  billing.address_1 || '',
    address_2:  billing.address_2 || '',
    city:       billing.city || '',
    state:      billing.state || '',
    postcode:   billing.postcode || '',
    country:    'AR',
  };
  // WC valida formato de email si el campo viene presente — con string vacío rechaza el
  // pedido entero ("Invalid parameter(s): billing"), así que directamente no lo mandamos.
  if (billing.email) billingFull.email = billing.email;

  const metaData: { key: string; value: string }[] = [];
  if (isMayorista) metaData.push({ key: '_es_mayorista', value: 'true' });
  if (isGift) metaData.push({ key: '_es_regalo', value: 'true' });
  if (dni) metaData.push({ key: '_billing_dni', value: dni });
  if (viaCargoSucursal) metaData.push({ key: '_via_cargo_sucursal', value: viaCargoSucursal });
  if (instagram) metaData.push({ key: '_instagram', value: instagram });

  const orderPayload: any = {
    status,
    payment_method: 'admin-manual',
    payment_method_title: 'Cargado manualmente (admin)',
    set_paid: status === 'processing',
    billing: billingFull,
    shipping: { ...billingFull, phone: undefined },
    line_items: lineItems,
    meta_data: metaData,
  };
  if (customerId) orderPayload.customer_id = customerId;
  if (shippingTotal > 0) orderPayload.shipping_lines = [{ method_id: 'admin_manual', method_title: 'Envío', total: shippingTotal.toFixed(2) }];
  const fullNote = [isGift ? 'Regalo 100% — no cobra nada.' : '', note || ''].filter(Boolean).join(' ');
  if (fullNote) orderPayload.customer_note = fullNote;

  const created = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
    method: 'POST',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  }).then(r => r.json());

  if (created?.code || !created?.id) {
    return NextResponse.json({ error: created?.message || 'No se pudo crear el pedido' }, { status: 502 });
  }

  // Descontar stock — WooCommerce a veces ya lo hace solo al crear el pedido (depende del
  // estado/gateway), así que comparamos antes/después y solo aplicamos el faltante real
  // (mismo patrón verificado en /api/admin/orders/[id]/add-items).
  await Promise.all(stockAdjustments.map(async ({ productId, variationId, addedQty, stockBefore }) => {
    const target = variationId ? `products/${productId}/variations/${variationId}` : `products/${productId}`;
    const prod = await wcGet(`${target}?_fields=id,stock_quantity`);
    const stockAfterWc = Number(prod.stock_quantity ?? 0);
    const alreadyReducedByWc = stockBefore - stockAfterWc;
    const remaining = Math.max(0, addedQty - alreadyReducedByWc);
    if (remaining === 0) return;
    await fetch(`${WP_URL}/wp-json/wc/v3/${target}`, {
      method: 'PUT',
      headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_quantity: stockAfterWc - remaining }),
    });
  }));

  return NextResponse.json({ ok: true, orderId: created.id, orderNumber: created.number, total: created.total });
}
