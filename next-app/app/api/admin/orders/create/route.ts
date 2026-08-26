import { NextRequest, NextResponse } from 'next/server';
import { sizeFromAttributes } from '@/lib/product-size';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  return adminSecretMatches(req.headers.get('x-admin-key'));
}

const wcGet = (path: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
};

type CreateItem = { productId: number; variationId: number | null; quantity: number };
type Discount = {
  type: 'percent' | 'fixed';
  value: number;
  label?: string;
  includeShipping?: boolean;
};
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
    discount?: Discount;
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
  const shippingTotal = body.shippingTotal || 0;
  // Los productos y el envío se cargan SIEMPRE a precio real y el descuento va aparte, como
  // línea negativa (mismo patrón que el checkout del sitio y que /orders/[id]/add-items).
  // Así el cliente ve en el mail lo que vale lo que recibió + cuánto se le bonificó, y la
  // facturación no se infla porque los totales de plata leen order.total, que queda en $0.
  // `isGift` queda como alias legacy de "100% sobre productos + envío".
  const discountInput: Discount | null = body.discount
    ?? (isGift ? { type: 'percent', value: 100, label: 'Regalo (100%)', includeShipping: true } : null);

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
    const unitPrice = isMayorista ? Math.round(basePrice * 0.5) : parseFloat(prod.price || prod.regular_price || '0');
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

  // El descuento se calcula acá con los precios reales que trajimos de Woo — nunca con un
  // monto que mande el navegador.
  const itemsSubtotal = lineItems.reduce((sum, li) => sum + parseFloat(li.total), 0);
  let discountAmount = 0;
  let discountLabel  = '';
  if (discountInput && discountInput.value > 0) {
    const base = itemsSubtotal + (discountInput.includeShipping ? shippingTotal : 0);
    const raw  = discountInput.type === 'percent'
      ? base * Math.min(100, discountInput.value) / 100
      : Math.abs(discountInput.value);
    // Tope duro: el descuento nunca puede dejar el pedido en negativo.
    discountAmount = Math.round(Math.min(raw, itemsSubtotal + shippingTotal));
    discountLabel  = discountInput.label?.trim() || 'Descuento';
  }
  const orderTotal = itemsSubtotal + shippingTotal - discountAmount;

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
  // "Regalo" = el pedido no cobra nada, sin importar cómo se haya escrito el descuento.
  if (discountAmount > 0 && orderTotal === 0) metaData.push({ key: '_es_regalo', value: 'true' });
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
  if (discountAmount > 0) orderPayload.fee_lines = [{ name: discountLabel, total: (-discountAmount).toFixed(2), tax_class: '' }];
  if (note) orderPayload.customer_note = note;

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
