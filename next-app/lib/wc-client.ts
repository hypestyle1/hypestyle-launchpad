import type { Attribution } from '@/lib/attribution';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

const MP_METHODS = ['mercadopago', 'tarjeta', 'efectivo'];

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  customization?: { playerName: string; number: string };
  /** Gift card: el PHP lo guarda como meta de la línea y lo usa para el mail. */
  gift?: { paraEmail?: string; paraNombre?: string; deNombre?: string; mensaje?: string; enviarEl?: string };
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
  pais?: string;
  telefono: string;
  instagram?: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  customer: OrderCustomer;
  shipping: number;
  discountAmount: number;
  discountLabel?: string;
  couponCode?: string;
  /** Descuento del cupón que el checkout mostró. Solo para medir la paridad
   *  contra lo que Woo descuenta de verdad — el server no lo usa para cobrar. */
  couponDiscount?: number;
  paymentMethod: string;
  shippingMethodId?: string;
  shippingLabel?: string;
  shippingBranch?: string;
  /** Código Andreani de la sucursal (ej. "RGA"). Sin esto el plugin no puede empaquetar. */
  shippingBranchCode?: string;
  /** Calle y localidad de la sucursal: son el destino del envío cuando el
   *  comprador retira ahí y no deja domicilio. Ver lib/sucursal-destino.ts. */
  shippingBranchStreet?: string;
  shippingBranchCity?: string;
  fbp?: string;
  fbc?: string;
  /** Origen de la visita (utm/fbclid/referrer/landing). Ver lib/attribution.ts. */
  attribution?: Attribution;
  /** IDs anónimos de Microsoft Clarity (cookies _clck/_clsk) para encontrar la
   *  grabación de la sesión desde el pedido. Ver lib/clarity-tracking.ts. */
  clarityUser?: string;
  claritySession?: string;
}

export interface TaloPaymentData {
  alias: string | null;
  cvu: string | null;
  amount: number;
  beneficiario: string | null;
  cuit: string | null;
  banco: string | null;
  expiration: string | null;
}

export interface CreateOrderResponse {
  wcOrderId: number;
  wcOrderNumber: string;
  orderKey: string;
  wcTotal: number;          // total real de WooCommerce (con sale_price y cupones aplicados)
  initPoint: string | null;
  paypalUrl: string | null;
  taloPaymentData: TaloPaymentData | null;
  /** El pedido se creó sin el cupón porque Woo lo rechazó (ver create-order-gocuotas). */
  couponDropped?: { code: string; reason: string } | null;
  /** El pedido salió con el regalo FIRST10 (línea a $0 agregada por WordPress). */
  first10?: boolean;
  error?: string;
}

/**
 * Error de la ruta que crea el pedido, con el estado y los errores por campo
 * intactos. Antes se aplanaba a `new Error(message)` y el checkout no tenía
 * forma de distinguir un 422 por datos inválidos de una caída de red: con el
 * `status` puede volver al paso 1 y marcar el campo en vez de mostrar un cartel
 * genérico.
 *
 * No es una unión discriminada a propósito: el repo compila con
 * `strictNullChecks: false` y TypeScript no estrecha uniones por un booleano.
 */
export class CreateOrderError extends Error {
  status: number;
  codigo: string | null;
  errores: Record<string, string> | null;
  constructor(message: string, status: number, codigo?: string, errores?: Record<string, string>) {
    super(message);
    this.name = 'CreateOrderError';
    this.status = status;
    this.codigo = codigo ?? null;
    this.errores = errores ?? null;
  }
}

export async function createOrderAndPreference(
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {

  // 1 — Crear orden en WooCommerce
  // All domestic orders use the WC REST API path (create-order-gocuotas).
  // The WP custom endpoint is not used — it has an unpredictable payment-method whitelist.
  const isIntl = payload.customer.pais && payload.customer.pais !== 'AR';
  const orderEndpoint = isIntl
    ? '/api/create-order-intl'
    : '/api/create-order-gocuotas';

  const wcRes = await fetch(orderEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!wcRes.ok) {
    const err = await wcRes.json().catch(() => ({})) as { message?: string; codigo?: string; errores?: Record<string, string> };
    throw new CreateOrderError(err.message || `WC HTTP ${wcRes.status}`, wcRes.status, err.codigo, err.errores);
  }

  const order = await wcRes.json() as { wcOrderId: number; wcOrderNumber: string; orderKey: string; wcTotal?: number; paypalUrl?: string | null; taloPaymentData?: TaloPaymentData | null };

  // 2 — Crear preferencia MP (Next.js API, token de producción en Vercel)
  let initPoint: string | null = null;

  if (MP_METHODS.includes(payload.paymentMethod)) {
    const mpRes = await fetch('/api/mp-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wcOrderId: order.wcOrderId,
        wcTotal:   order.wcTotal,   // total real de WC → MP cobra el monto correcto
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
    orderKey:      order.orderKey ?? '',
    wcTotal:       order.wcTotal ?? 0,
    initPoint,
    paypalUrl:     order.paypalUrl ?? null,
    taloPaymentData: order.taloPaymentData ?? null,
  };
}
