const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'http://hypestyle.local';

const MP_METHODS = ['mercadopago', 'tarjeta', 'efectivo', 'paypal'];

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

export interface OrderCustomer {
  email: string;
  nombre: string;
  apellido: string;
  dni?: string;
  direccion: string;
  depto?: string;
  cp: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  instagram?: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  customer: OrderCustomer;
  shipping: number;
  discountAmount: number;
  paymentMethod: string;
}

export interface CreateOrderResponse {
  wcOrderId: number;
  wcOrderNumber: string;
  initPoint: string | null;
  error?: string;
}

export async function createOrderAndPreference(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {

  // 1 — Crear orden en WooCommerce (PHP)
  const wcRes = await fetch(`${WP_URL}/wp-json/hypestyle/v1/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!wcRes.ok) {
    const err = await wcRes.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `WC HTTP ${wcRes.status}`);
  }

  const order = await wcRes.json() as { wcOrderId: number; wcOrderNumber: string };

  // 2 — Crear preferencia MP (Next.js API, token de producción en Vercel)
  let initPoint: string | null = null;

  if (MP_METHODS.includes(payload.paymentMethod)) {
    const mpRes = await fetch('/api/mp-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wcOrderId: order.wcOrderId,
        items:     payload.items,
        customer:  payload.customer,
        shipping:  payload.shipping,
      }),
    });

    if (mpRes.ok) {
      const mpData = await mpRes.json() as { initPoint?: string };
      initPoint = mpData.initPoint ?? null;
    } else {
      console.error('[wc-client] mp-preference error:', await mpRes.text());
    }
  }

  return {
    wcOrderId:     order.wcOrderId,
    wcOrderNumber: order.wcOrderNumber,
    initPoint,
  };
}
