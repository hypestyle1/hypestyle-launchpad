const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const SITE   = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const FLAG   = '_hype_confirmation_sent';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

// Marca una orden como pagada y manda la confirmación al cliente, recién cuando
// el pago está realmente aprobado (nunca antes). La usan los métodos que no
// confirman el pago en el momento de crear la orden — PayPal (paypal-capture /
// paypal-webhook) y GOcuotas (gocuotas-webhook) — cada uno pasando su propio
// paymentMethod para que el mail muestre el texto correcto. Idempotente vía la
// meta _hype_confirmation_sent, compartida con el flujo de MercadoPago (ver
// /api/confirm-paid).
export async function fulfillOrder(
  wcOrderId: number,
  paymentMethod: string,
  transactionId?: string,
): Promise<{ ok: boolean; reason: string }> {
  const orderRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${wcOrderId}`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!orderRes.ok) return { ok: false, reason: 'order-not-found' };
  const order = await orderRes.json();

  const alreadySent = (order.meta_data || []).some((m: any) => m.key === FLAG && m.value);
  if (alreadySent) return { ok: true, reason: 'already-sent' };

  if (!['processing', 'completed'].includes(order.status)) {
    await fetch(`${WP_URL}/wp-json/wc/v3/orders/${wcOrderId}`, {
      method: 'PUT',
      headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'processing', ...(transactionId ? { transaction_id: transactionId } : {}) }),
    }).catch(() => {});
  }

  const items = (order.line_items || []).map((item: any) => {
    const rawName = (item.name as string) || 'Producto';
    const sizeMatch = rawName.match(/[—\-–]\s*Talle\s*(\S+)/i);
    let size = sizeMatch ? sizeMatch[1] : '';
    if (!size) {
      const meta = (item.meta_data || []).find((m: any) =>
        ['Talle', 'talle', 'size', 'pa_talle', 'pa_size'].includes(m.key));
      if (meta) size = String(meta.value);
    }
    const qty = (item.quantity as number) || 1;
    return {
      name:     rawName.replace(/\s*[—\-–]\s*Talle\s*\S+/i, '').trim(),
      size,
      quantity: qty,
      price:    parseFloat(item.total || '0') / qty,
    };
  });

  await fetch(`${SITE}/api/send-confirmation`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-hypestyle-secret': process.env.WP_SECRET || '' },
    body: JSON.stringify({
      orderNum:  String(order.number || wcOrderId),
      wcOrderId, orderKey: order.order_key,
      items, total: parseFloat(order.total || '0'),
      email:     order.billing?.email,
      nombre:    order.billing?.first_name,
      apellido:  order.billing?.last_name,
      ciudad:    order.billing?.city,
      provincia: order.billing?.state,
      paymentMethod,
      pais: order.billing?.country || 'AR',
    }),
  }).catch(() => {});

  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${wcOrderId}`, {
    method:  'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta_data: [{ key: FLAG, value: new Date().toISOString() }] }),
  }).catch(() => {});

  return { ok: true, reason: 'sent' };
}
