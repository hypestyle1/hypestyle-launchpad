/**
 * Acceso a la API de PayPal, compartido por las cuatro rutas del flujo
 * (paypal-order, paypal-capture, paypal-webhook, paypal-reconcile).
 *
 * El checkout NO usa el plugin nativo de WooCommerce: le pega directo a la API
 * de PayPal desde Vercel con credenciales propias. Si `PAYPAL_CLIENT_ID` /
 * `PAYPAL_CLIENT_SECRET` no están cargadas, el `!` de TypeScript no salva nada
 * en runtime y el Basic auth sale como "undefined:undefined" ⇒ 401 en todas las
 * llamadas. Eso fue exactamente lo que pasó entre el 27/05 y el 07/08/2026, y
 * desde el panel de WooCommerce era indistinguible de "el cliente no terminó de
 * pagar". Por eso `paypalAccessToken` distingue el caso y lo dice.
 */

export const PAYPAL_API = 'https://api-m.paypal.com';

const CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || '').trim();
const SECRET    = (process.env.PAYPAL_CLIENT_SECRET || '').trim();

export function paypalConfigured(): boolean {
  return !!CLIENT_ID && !!SECRET;
}

export async function paypalAccessToken(): Promise<string> {
  if (!paypalConfigured()) {
    throw new Error('PayPal sin credenciales: falta PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET');
  }
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export interface PayPalOrder {
  id: string;
  /** CREATED | PAYER_ACTION_REQUIRED | APPROVED | COMPLETED | VOIDED */
  status: string;
  /** El wcOrderId, tal como lo grabó paypal-order. Es PayPal quien dice a qué
   *  pedido corresponde el pago — nunca el body de un request nuestro. */
  wcOrderId: number | null;
}

function referenceOf(order: { purchase_units?: { reference_id?: string }[] }): number | null {
  const ref = Number(order.purchase_units?.[0]?.reference_id);
  return Number.isFinite(ref) && ref > 0 ? ref : null;
}

export async function getPayPalOrder(paypalOrderId: string, token: string): Promise<PayPalOrder | null> {
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const order = await res.json() as { id: string; status: string; purchase_units?: { reference_id?: string }[] };
  return { id: order.id, status: order.status, wcOrderId: referenceOf(order) };
}

export interface CaptureResult {
  ok: boolean;
  /** COMPLETED cuando el dinero efectivamente se cobró. */
  status?: string;
  wcOrderId?: number | null;
  /** Nombre del issue de PayPal (ORDER_ALREADY_CAPTURED, etc.) o el HTTP. */
  error?: string;
}

export async function capturePayPalOrder(paypalOrderId: string, token: string): Promise<CaptureResult> {
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { /* respuesta no-JSON: queda en error */ }

  if (!res.ok) {
    // ORDER_ALREADY_CAPTURED no es un fallo: significa que el dinero ya entró y
    // lo que falta es registrarlo de nuestro lado. Quien llama decide qué hacer.
    const issue = body?.details?.[0]?.issue || `http ${res.status}`;
    return { ok: false, error: issue };
  }
  return { ok: true, status: body.status, wcOrderId: referenceOf(body) };
}
