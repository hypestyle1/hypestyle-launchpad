import { NextRequest, NextResponse } from 'next/server';

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

// Quita un producto de un pedido (quantity: 0) o le baja la cantidad, sin cancelar el
// pedido entero. Complemento de add-items (que solo suma) — pedido en el que se basó:
// se cargó un Half-Zip Polo Melange S de más en un pedido real y no había forma de
// sacarlo sin cancelar todo.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { lineItemId, newQuantity } = await req.json() as { lineItemId: number; newQuantity: number };
  if (!lineItemId || newQuantity === undefined || newQuantity < 0) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  const order = await wcGet(`orders/${params.id}?_fields=id,line_items`);
  if (!order?.id) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const lineItem = (order.line_items || []).find((li: any) => li.id === lineItemId);
  if (!lineItem) return NextResponse.json({ error: 'Ítem no encontrado en el pedido' }, { status: 404 });

  if (newQuantity >= lineItem.quantity) {
    return NextResponse.json({ error: 'La nueva cantidad tiene que ser menor a la actual' }, { status: 400 });
  }

  const removedQty = lineItem.quantity - newQuantity;
  const unitPrice = parseFloat(lineItem.total) / lineItem.quantity;

  const lineItemUpdate = newQuantity === 0
    ? { id: lineItemId, quantity: 0 }
    : {
        id: lineItemId,
        quantity: newQuantity,
        subtotal: (unitPrice * newQuantity).toFixed(2),
        total: (unitPrice * newQuantity).toFixed(2),
      };

  // Snapshot de stock antes del PUT — WooCommerce a veces ya restaura el stock solo al
  // sacar/bajar un ítem de un pedido que ya lo tenía reducido (mismo comportamiento
  // inconsistente que al agregar, ver add-items) — así que después comparamos y solo
  // aplicamos el faltante real, para no restaurar de más.
  let stockBefore: number | null = null;
  let manageStock = false;
  const target = lineItem.variation_id
    ? `products/${lineItem.product_id}/variations/${lineItem.variation_id}`
    : `products/${lineItem.product_id}`;
  if (lineItem.product_id) {
    const prod = await wcGet(`${target}?_fields=id,manage_stock,stock_quantity`);
    manageStock = !!prod.manage_stock;
    stockBefore = Number(prod.stock_quantity ?? 0);
  }

  const updated = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_items: [lineItemUpdate] }),
  }).then(r => r.json());

  if (updated?.code) {
    return NextResponse.json({ error: updated.message || 'No se pudo actualizar el pedido' }, { status: 502 });
  }

  if (manageStock && stockBefore !== null) {
    const prodAfter = await wcGet(`${target}?_fields=id,stock_quantity`);
    const stockAfterWc = Number(prodAfter.stock_quantity ?? 0);
    const alreadyRestoredByWc = stockAfterWc - stockBefore;
    const remaining = Math.max(0, removedQty - alreadyRestoredByWc);
    if (remaining > 0) {
      await fetch(`${WP_URL}/wp-json/wc/v3/${target}`, {
        method: 'PUT',
        headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: stockAfterWc + remaining }),
      });
    }
  }

  return NextResponse.json({ ok: true, total: updated.total });
}
