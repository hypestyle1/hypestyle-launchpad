/**
 * Re-pago: terminar de pagar un pedido de Woo que ya existe (/pagar/<id>).
 *
 * Reglas que viven acá y que las pruebas cubren:
 *   - Woo es la fuente de verdad: el pedido se lee en cada carga y otra vez
 *     antes de iniciar el cobro. No se guarda ninguna copia.
 *   - Un pedido pagado (o con un pago en curso) no ofrece pagar.
 *   - El total es el del pedido. Lo único que se mueve es el 10% por
 *     transferencia, que sigue al medio de pago elegido.
 *   - La order_key no se loguea ni sale del servidor: viaja en una cookie
 *     httpOnly (ver middleware.ts) y nunca se le pasa al cliente.
 *   - Esta ruta no manda ningún mail.
 */

import { timingSafeEqual } from 'node:crypto';
import { wcGet } from '@/lib/wc-admin';
import { mapLimit } from '@/lib/map-limit';
import { unavailableReason, type StockInfo } from '@/lib/mayorista-availability';

import { ORDER_KEY_RE } from '@/lib/repago-link';

export { repagoCookie, REPAGO_COOKIE_MAX_AGE, ORDER_KEY_RE } from '@/lib/repago-link';

export function sameKey(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ─── Reglas de negocio ───────────────────────────────────────────────────────

/** Pasados estos días el link deja de ofrecer el pago. */
export const REPAGO_MAX_DAYS = 30;

/** Nombre exacto del fee que crea el checkout (app/checkout/page.tsx). */
export const TRANSFER_FEE_NAME = 'Transferencia (10%)';
const TRANSFER_RATE = 0.10;

export type RepagoMethod = 'transferencia' | 'tarjeta' | 'mercadopago';
export const REPAGO_METHODS: RepagoMethod[] = ['transferencia', 'tarjeta', 'mercadopago'];

/** payment_method / título que quedan en el pedido según lo elegido. Los de
 *  Mercado Pago son los mismos del checkout (create-order-gocuotas): de ese
 *  valor dependen el mail de confirmación y el cálculo de fees del panel.
 *  La transferencia NO usa el gateway de Talo: es manual y se aprueba a mano. */
export const METHOD_FIELDS: Record<RepagoMethod, { payment_method: string; payment_method_title: string }> = {
  transferencia: { payment_method: 'transferencia', payment_method_title: 'Transferencia bancaria (manual)' },
  tarjeta:       { payment_method: 'tarjeta',       payment_method_title: 'Tarjeta de crédito / débito (MercadoPago)' },
  mercadopago:   { payment_method: 'mercadopago',   payment_method_title: 'Mercado Pago' },
};

/** Datos para transferir: alias fijo de la cuenta de Mercado Pago. No depende
 *  de Talo ni de ningún webhook: el pedido se aprueba a mano con el comprobante. */
export const TRANSFER_ACCOUNT = {
  alias: 'Hypestle2',
  banco: 'Mercado Pago',
};

export type RepagoState =
  | 'payable'       // se puede pagar
  | 'paid'          // ya está pagado
  | 'in-process'    // hay un pago acreditándose
  | 'expired'       // pasó el plazo del link
  | 'closed';       // cancelado, reembolsado, o un pedido que no se paga por acá

interface WcMeta { key: string; value: unknown; display_value?: unknown }
export interface WcOrderLike {
  id: number;
  number?: string;
  status: string;
  order_key?: string;
  currency?: string;
  total: string;
  shipping_total?: string;
  discount_total?: string;
  payment_method?: string;
  date_created_gmt?: string;
  billing?: { first_name?: string; email?: string; country?: string };
  meta_data?: WcMeta[];
  line_items?: {
    id: number; name: string; product_id: number; variation_id: number; quantity: number;
    subtotal: string; total: string; meta_data?: WcMeta[]; image?: { src?: string };
  }[];
  fee_lines?: { id: number; name: string; total: string }[];
  shipping_lines?: { method_title?: string; total?: string }[];
  coupon_lines?: { code: string; discount?: string }[];
}

const meta = (list: WcMeta[] | undefined, key: string) => (list || []).find(m => m.key === key)?.value;

export function repagoState(order: WcOrderLike, now: number = Date.now()): RepagoState {
  const status = String(order.status);
  if (status === 'processing' || status === 'completed') return 'paid';

  // Mayoristas y pedidos cargados desde el panel se cobran por fuera; los
  // internacionales van por otro circuito (PayPal / wire).
  const propio =
    order.payment_method !== 'mayorista' &&
    order.payment_method !== 'admin-manual' &&
    !meta(order.meta_data, '_es_mayorista') &&
    (order.currency || 'ARS') === 'ARS' &&
    (order.billing?.country || 'AR') === 'AR';
  if (!propio) return 'closed';

  if (status === 'on-hold') return 'in-process';
  if (status !== 'pending' && status !== 'failed') return 'closed';
  if (!(Number(order.total) > 0)) return 'closed';

  const created = Date.parse((order.date_created_gmt || '') + 'Z');
  if (!Number.isFinite(created)) return 'closed';
  if (now - created > REPAGO_MAX_DAYS * 864e5) return 'expired';
  return 'payable';
}

// ─── 10% por transferencia ───────────────────────────────────────────────────

const isGiftCardLine = (l: { name: string }) => /gift card/i.test(l.name);
const isFreeGiftLine = (l: { total: string; meta_data?: WcMeta[] }) =>
  Number(l.total) === 0 && (l.meta_data || []).some(m => m.key.startsWith('_hypestyle_purchase_gift') || m.key.startsWith('_hypestyle_gift'));

export interface TransferPlan {
  /** Qué medios se pueden ofrecer sobre este pedido. */
  methods: RepagoMethod[];
  /** Total a cobrar con cada medio. */
  totals: Record<RepagoMethod, number>;
  /** El descuento por transferencia, en pesos. */
  discount: number;
  /** id del fee de transferencia ya cargado en el pedido, si lo hay. */
  feeId: number | null;
}

/**
 * Cómo queda el total con cada medio. El 10% es un fee negativo que el checkout
 * carga cuando se elige transferencia: acá se agrega o se saca según el medio,
 * para que nadie pague con tarjeta al precio de transferencia ni al revés.
 *
 * Si el fee viene combinado con otra promo ("3x2 + Transferencia (10%)") no se
 * puede separar cuánto es de cada una: ese pedido solo se ofrece por
 * transferencia, tal cual está.
 */
export function transferPlan(order: WcOrderLike): TransferPlan {
  const total = Number(order.total);
  const fees = order.fee_lines || [];
  const exact = fees.find(f => f.name.trim() === TRANSFER_FEE_NAME);
  const combined = !exact && fees.some(f => f.name.includes('Transferencia'));

  if (combined) {
    return { methods: ['transferencia'], totals: { transferencia: total, tarjeta: total, mercadopago: total }, discount: 0, feeId: null };
  }

  if (exact) {
    const discount = Math.abs(Number(exact.total));
    const full = round2(total + discount);
    return { methods: REPAGO_METHODS, totals: { transferencia: total, tarjeta: full, mercadopago: full }, discount, feeId: exact.id };
  }

  // Misma cuenta que el checkout: 10% del subtotal de productos, sin gift cards
  // y antes de cupones.
  const base = (order.line_items || []).filter(l => !isGiftCardLine(l)).reduce((s, l) => s + Number(l.subtotal), 0);
  const discount = Math.round(base * TRANSFER_RATE);
  const conDescuento = round2(total - discount);
  // Un pedido casi todo pagado con gift card puede quedar en cero o negativo
  // con el descuento encima: en ese caso no se ofrece el descuento.
  if (!(discount > 0) || !(conDescuento > 0)) {
    return { methods: REPAGO_METHODS, totals: { transferencia: total, tarjeta: total, mercadopago: total }, discount: 0, feeId: null };
  }
  return { methods: REPAGO_METHODS, totals: { transferencia: conDescuento, tarjeta: total, mercadopago: total }, discount, feeId: null };
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * El cuerpo del PUT que deja el pedido listo para cobrar con `method`: medio de
 * pago, y el fee de transferencia agregado o sacado si corresponde. `expected`
 * es el total que tiene que devolver Woo después de guardar.
 */
export function orderUpdateFor(order: WcOrderLike, method: RepagoMethod): { body: Record<string, unknown>; expected: number } | null {
  const plan = transferPlan(order);
  if (!plan.methods.includes(method)) return null;

  const body: Record<string, unknown> = { ...METHOD_FIELDS[method] };
  const quiereFee = method === 'transferencia';
  if (quiereFee && plan.feeId === null && plan.discount > 0) {
    body.fee_lines = [{ name: TRANSFER_FEE_NAME, total: String(-plan.discount), tax_class: '' }];
  } else if (!quiereFee && plan.feeId !== null) {
    // En la REST de Woo una línea se borra mandando su id con el nombre en null.
    body.fee_lines = [{ id: plan.feeId, name: null }];
  }
  return { body, expected: plan.totals[method] };
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export interface StockProblem {
  name: string;
  size: string;
  reason: 'out-of-stock' | 'insufficient' | 'not-published' | 'no-size' | 'unknown';
}

export const lineSize = (l: { meta_data?: WcMeta[] }): string => {
  const m = (l.meta_data || []).find(x => ['talle', 'pa_talle', 'size', 'pa_size'].includes(String(x.key).toLowerCase()));
  return m ? String(m.display_value ?? m.value ?? '') : '';
};

const stockInfo = (p: any): StockInfo => ({
  status: p.status, stockStatus: p.stock_status, manageStock: p.manage_stock, stockQuantity: p.stock_quantity,
});

/**
 * Qué líneas del pedido ya no se pueden entregar. Un pedido impago no tiene
 * stock reservado (Woo descuenta recién al pagar), así que hay que mirarlo
 * contra el stock de hoy. El stock compartido ya viene resuelto en la
 * variación (lo deriva el PHP), no hay que recalcularlo acá.
 *
 * Si Woo no responde, la línea queda como 'unknown' y el pedido no se cobra:
 * preferimos pedirle que reintente antes que cobrar algo que no hay.
 */
export async function stockProblems(order: WcOrderLike): Promise<StockProblem[]> {
  // Pedido que ya descontó stock (vino de un camino viejo): el stock que falta
  // es el que él mismo reservó.
  if (String(meta(order.meta_data, '_order_stock_reduced') || '') === 'yes') return [];

  const need = new Map<string, { productId: number; variationId: number; quantity: number; name: string; size: string }>();
  for (const l of order.line_items || []) {
    if (isFreeGiftLine(l)) continue; // un regalo agotado no frena el pago
    const k = `${l.product_id}/${l.variation_id || 0}`;
    const cur = need.get(k);
    if (cur) cur.quantity += l.quantity;
    else need.set(k, { productId: l.product_id, variationId: l.variation_id || 0, quantity: l.quantity, name: l.name, size: lineSize(l) });
  }

  const cb = Date.now(); // LiteSpeed cachea los GET por URL
  const results = await mapLimit([...need.values()], 3, async (n): Promise<StockProblem | null> => {
    const fail = (reason: StockProblem['reason']): StockProblem => ({ name: n.name, size: n.size, reason });
    const product = await wcGet<any>(`products/${n.productId}?_fields=id,type,status,virtual,stock_status,manage_stock,stock_quantity&_cb=${cb}`).catch(() => null);
    if (!product) return fail('unknown');
    if (product.virtual) return null; // gift card: no tiene stock
    if (product.type === 'variable' && !n.variationId) return fail('no-size');
    let variation: any = null;
    if (n.variationId) {
      variation = await wcGet<any>(`products/${n.productId}/variations/${n.variationId}?_fields=id,status,stock_status,manage_stock,stock_quantity&_cb=${cb}`).catch(() => null);
      if (!variation) return fail('unknown');
    }
    const why = unavailableReason(stockInfo(product), variation ? stockInfo(variation) : null, n.quantity);
    return why ? fail(why.reason) : null;
  });
  return results.filter((r): r is StockProblem => r !== null);
}

// ─── Carga del pedido ────────────────────────────────────────────────────────

/** Lo que ve el cliente. Nunca incluye la order_key ni datos de contacto. */
export interface RepagoView {
  orderId: number;
  orderNumber: string;
  state: RepagoState;
  nombre: string;
  items: { name: string; size: string; quantity: number; total: number; image: string; gift: boolean }[];
  shipping: { label: string; total: number } | null;
  discounts: { label: string; total: number }[];
  total: number;
  methods: RepagoMethod[];
  totals: Record<RepagoMethod, number>;
  transferDiscount: number;
  /** El pedido ya quedó esperando una transferencia: se muestran los datos. */
  transferChosen: boolean;
  stock: StockProblem[];
  account: typeof TRANSFER_ACCOUNT;
}

export type RepagoLoad =
  | { ok: false }                       // clave incorrecta, pedido inexistente o sin clave: no se distingue
  | { ok: true; order: WcOrderLike; view: RepagoView };

export async function loadOrderForKey(orderId: number, key: string | null | undefined): Promise<WcOrderLike | null> {
  if (!Number.isInteger(orderId) || orderId <= 0 || !key || !ORDER_KEY_RE.test(key)) return null;
  const order = await wcGet<WcOrderLike>(`orders/${orderId}?_cb=${Date.now()}`).catch(() => null);
  if (!order || !sameKey(order.order_key, key)) return null;
  return order;
}

export async function loadRepago(orderId: number, key: string | null | undefined, now: number = Date.now()): Promise<RepagoLoad> {
  const order = await loadOrderForKey(orderId, key);
  if (!order) return { ok: false };

  const state = repagoState(order, now);
  const plan = transferPlan(order);
  const stock = state === 'payable' ? await stockProblems(order) : [];

  const discounts = [
    ...(order.fee_lines || []).map(f => ({ label: f.name, total: Number(f.total) })),
    ...(order.coupon_lines || []).map(c => ({ label: `Cupón ${c.code}`, total: -Number(c.discount || 0) })),
  ].filter(d => d.total !== 0);

  const ship = (order.shipping_lines || [])[0];
  const view: RepagoView = {
    orderId: order.id,
    orderNumber: String(order.number || order.id),
    state,
    nombre: order.billing?.first_name || '',
    items: (order.line_items || []).map(l => ({
      name: l.name, size: lineSize(l), quantity: l.quantity, total: Number(l.total),
      image: l.image?.src || '', gift: isFreeGiftLine(l),
    })),
    shipping: ship ? { label: ship.method_title || 'Envío', total: Number(order.shipping_total || ship.total || 0) } : null,
    discounts,
    total: Number(order.total),
    methods: plan.methods,
    totals: plan.totals,
    transferDiscount: plan.discount,
    transferChosen: state === 'payable' && order.payment_method === METHOD_FIELDS.transferencia.payment_method && plan.feeId !== null,
    stock,
    account: TRANSFER_ACCOUNT,
  };
  return { ok: true, order, view };
}
