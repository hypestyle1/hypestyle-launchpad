import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !ADMIN_SECRET || key === ADMIN_SECRET;
}

const wcGet = (path: string) => {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' }).then(r => r.json());
};

type AddItem = { productId: number; variationId: number | null; quantity: number };

// Agrega productos a un pedido ya existente (sin cancelarlo) y, opcionalmente, aplica un
// descuento manual como fee_line negativo. Si el pedido es mayorista, el precio unitario de
// lo que se agrega es el 50% del regular_price (igual que el catálogo de /mayoristas), no el
// precio de venta al público — si no, se factura el producto agregado al doble de lo que corresponde.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { items = [], discountName, discountAmount } = await req.json() as {
    items: AddItem[]; discountName?: string; discountAmount?: number;
  };

  const order = await wcGet(`orders/${params.id}?_fields=id,line_items,fee_lines,meta_data`);
  if (!order?.id) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const isMayorista = (order.meta_data || []).some(
    (m: any) => m.key === '_es_mayorista' && String(m.value) === 'true'
  );

  const existingLineItems: any[] = order.line_items || [];
  const newLineItems: any[] = [];
  // WooCommerce a veces ya ajusta el stock solo cuando se editan line_items de un pedido que
  // ya tuvo el stock reducido (tanto por cambio de cantidad de un ítem existente como por un
  // ítem nuevo agregado) — confirmado empíricamente con un pedido de prueba. Para no descontar
  // dos veces, guardamos el stock ANTES del PUT y después solo aplicamos el faltante real.
  const stockAdjustments: { productId: number; variationId: number | null; addedQty: number; stockBefore: number }[] = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) continue;

    const target = item.variationId ? `products/${item.productId}/variations/${item.variationId}` : `products/${item.productId}`;
    const prod = await wcGet(`${target}?_fields=id,name,regular_price,price,manage_stock,stock_quantity`);
    const basePrice = parseFloat(prod.regular_price || prod.price || '0');
    const unitPrice = isMayorista ? Math.round(basePrice * 0.5) : basePrice;

    const existing = existingLineItems.find(
      (li: any) => li.product_id === item.productId && (li.variation_id || null) === (item.variationId || null)
    );

    if (existing) {
      const newQty = existing.quantity + item.quantity;
      newLineItems.push({
        id: existing.id,
        quantity: newQty,
        subtotal: (unitPrice * newQty).toFixed(2),
        total: (unitPrice * newQty).toFixed(2),
      });
    } else {
      newLineItems.push({
        product_id: item.productId,
        variation_id: item.variationId || undefined,
        quantity: item.quantity,
        subtotal: (unitPrice * item.quantity).toFixed(2),
        total: (unitPrice * item.quantity).toFixed(2),
      });
    }

    if (prod.manage_stock) {
      stockAdjustments.push({
        productId: item.productId,
        variationId: item.variationId,
        addedQty: item.quantity,
        stockBefore: Number(prod.stock_quantity ?? 0),
      });
    }
  }

  if (newLineItems.length === 0 && !discountAmount) {
    return NextResponse.json({ error: 'Nada para agregar' }, { status: 400 });
  }

  const body: any = {};
  if (newLineItems.length > 0) body.line_items = newLineItems;
  if (discountAmount && discountAmount > 0) {
    body.fee_lines = [{ name: discountName || 'Descuento', total: (-Math.abs(discountAmount)).toFixed(2) }];
  }

  const updated = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

  if (updated?.code) {
    return NextResponse.json({ error: updated.message || 'No se pudo actualizar el pedido' }, { status: 502 });
  }

  // Descontar SOLO lo que WooCommerce no haya ajustado ya solo (ver comentario arriba).
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

  return NextResponse.json({ ok: true, total: updated.total, feeLines: updated.fee_lines });
}
