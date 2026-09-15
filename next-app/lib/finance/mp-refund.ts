// Refunds de Mercado Pago desde el panel.
//
// ─── Orden de escritura (obligatorio) ────────────────────────────────────────
//
//   1. Mercado Pago  `POST /v1/payments/{id}/refunds` con X-Idempotency-Key.
//   2. WooCommerce   `POST wc/v3/orders/{id}/refunds` con api_refund=false
//                    (la plata ya se movió en MP; Woo sólo registra).
//   3. Meta `_hs_refunds` (historial append-only), nota privada, re-sync del
//      snapshot financiero y audit log.
//
// Nunca al revés: un refund en Woo sin plata devuelta sería una mentira
// contable. Si MP devuelve OK y Woo falla, el refund queda persistido como
// `mp_completed_woo_pending` y se repara con `repairWooRefund`, que SÓLO
// ejecuta la parte de Woo. MP no se vuelve a llamar jamás para el mismo refund.
//
// ─── Autoridad del monto ─────────────────────────────────────────────────────
//
// `refundable = transaction_amount − transaction_amount_refunded` leído FRESCO
// de MP en el momento. El snapshot no decide: puede tener horas de atraso y otro
// operador (o alguien en el panel de MP) pudo devolver en el medio.
//
// ─── Idempotencia ────────────────────────────────────────────────────────────
//
// La key la genera el frontend al abrir el modal (`hs-refund-<orderId>-<uuid>`)
// y la reenvía idéntica ante un reintento de red. Del lado del servidor:
//   - si ya hay una entrada `completed` con esa key → se devuelve esa (replay);
//   - si hay una `mp_completed_woo_pending` → 409, hay que reparar, no repetir;
//   - si hay una `failed` sin mpRefundId → se puede reintentar con la misma key
//     (MP garantiza que no duplica).
// Además un lock corto en el pedido (`_hs_refund_lock`) frena a un segundo
// operador que intente en simultáneo.
//
// Dominio puro + orquestador con dependencias inyectadas (testeable sin red).

import { providerOf, groupOf } from './fees';

export const REFUNDS_META = '_hs_refunds';
export const REFUND_LOCK_META = '_hs_refund_lock';
/** Un lock más viejo que esto se considera abandonado (proceso muerto). */
export const LOCK_TTL_MS = 2 * 60_000;
export const SHARED_KEY_ACTOR = 'clave compartida';

const EPS = 0.011;
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type RefundType = 'full' | 'partial';
export type RefundStatus = 'completed' | 'mp_completed_woo_pending' | 'failed';
export type RefundOrigin = 'admin' | 'external';

/** Una entrada del historial `_hs_refunds`. Append-only: nunca se borra ni se
 *  reescribe la historia; sólo se completa `wcRefundId`/`status` al reparar. */
export interface HsRefundEntry {
  mpRefundId: string | null;
  paymentId: string;
  amount: number;
  type: RefundType;
  at: string;
  actor: string;
  idempotencyKey: string;
  wcRefundId: number | null;
  status: RefundStatus;
  reason?: string;
  error?: string;
  /** `admin` = se ejecutó desde el panel; `external` = apareció en MP sin pasar por acá. */
  origin: RefundOrigin;
  /** Estado del refund según MP (approved / in_process / rejected / cancelled). */
  mpStatus?: string | null;
  repairedAt?: string | null;
}

export interface RefundLock { key: string; at: string; amount: number; actor: string }

export interface OrderLite {
  id: number;
  number: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  total: number;
  customerName: string;
  email: string;
  meta: { key: string; value: unknown }[];
  /** Refunds que Woo ya tiene registrados (`refunds[]` del pedido). */
  wooRefunds: { id: number; total: number; reason: string }[];
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function parseRefundsMeta(meta: { key: string; value: unknown }[] | null | undefined): HsRefundEntry[] {
  const m = (meta || []).find((x) => x.key === REFUNDS_META);
  if (!m) return [];
  try {
    const v: any = typeof m.value === 'string' ? JSON.parse(m.value) : m.value;
    if (!Array.isArray(v)) return [];
    return v.filter((e) => e && typeof e === 'object' && typeof e.amount === 'number' && typeof e.idempotencyKey === 'string');
  } catch { return []; }
}

export function parseRefundLock(meta: { key: string; value: unknown }[] | null | undefined): RefundLock | null {
  const m = (meta || []).find((x) => x.key === REFUND_LOCK_META);
  if (!m || m.value === '' || m.value === null || m.value === undefined) return null;
  try {
    const v: any = typeof m.value === 'string' ? JSON.parse(m.value) : m.value;
    return v && typeof v.key === 'string' && typeof v.at === 'string' ? v as RefundLock : null;
  } catch { return null; }
}

/** Convierte "1.234,56", "1234.56" o 1234.56 a número con dos decimales. */
export function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? round2(v) : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/\s|\$/g, '');
  if (!s) return null;
  // Si tiene coma y punto: el último separador es el decimal.
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
}

export function isValidIdempotencyKey(key: unknown, orderId: number): key is string {
  return typeof key === 'string' && new RegExp(`^hs-refund-${orderId}-[0-9a-zA-Z-]{8,64}$`).test(key);
}

export function newIdempotencyKey(orderId: number, uuid: string): string {
  return `hs-refund-${orderId}-${uuid}`;
}

// ─── Estado del pago según MP ────────────────────────────────────────────────

export interface PaymentRefundState {
  paymentId: string;
  externalReference: string | null;
  status: string | null;
  statusDetail: string | null;
  gross: number;
  refunded: number;
  refundable: number;
  /** Refunds que MP tiene para este pago (`refunds[]` del payment). */
  mpRefunds: { id: string; amount: number; status: string | null; dateCreated: string | null }[];
}

export function paymentRefundState(pay: any): PaymentRefundState | null {
  const gross = num(pay?.transaction_amount);
  const id = pay?.id === undefined || pay?.id === null ? null : String(pay.id);
  if (gross === null || !id) return null;
  const refunded = round2(num(pay?.transaction_amount_refunded) ?? 0);
  const mpRefunds = (Array.isArray(pay?.refunds) ? pay.refunds : [])
    .filter((r: any) => r && (r.id !== undefined && r.id !== null))
    .map((r: any) => ({ id: String(r.id), amount: round2(num(r.amount) ?? 0), status: r.status ? String(r.status) : null, dateCreated: r.date_created ? String(r.date_created) : null }));
  return {
    paymentId: id,
    externalReference: pay?.external_reference === undefined || pay?.external_reference === null ? null : String(pay.external_reference),
    status: pay?.status ? String(pay.status) : null,
    statusDetail: pay?.status_detail ? String(pay.status_detail) : null,
    gross: round2(gross),
    refunded,
    refundable: Math.max(0, round2(gross - refunded)),
    mpRefunds,
  };
}

/** Estados de MP en los que un refund tiene sentido. `refunded` es un pago ya
 *  devuelto por completo: entra para que el error sea "no queda nada", no "estado inválido". */
const REFUNDABLE_STATUSES = new Set(['approved', 'refunded']);

// ─── Validación ──────────────────────────────────────────────────────────────

export type RefundValidation =
  | { ok: true; amount: number; type: RefundType }
  | { ok: false; code: string; message: string; httpStatus: number };

export function validateRefundRequest(input: {
  orderId: number;
  order: OrderLite;
  payment: PaymentRefundState | null;
  mode: unknown;
  amount?: unknown;
}): RefundValidation {
  const { orderId, order, payment } = input;
  const bad = (code: string, message: string, httpStatus = 400): RefundValidation => ({ ok: false, code, message, httpStatus });

  if (groupOf(providerOf(order.paymentMethod)) !== 'mercadopago') return bad('not_mercadopago', 'El pedido no se cobró por Mercado Pago.', 409);
  if (!order.transactionId) return bad('missing_payment_id', 'El pedido no tiene Payment ID de Mercado Pago.', 409);
  if (!payment) return bad('payment_not_found', 'Mercado Pago no devolvió el pago.', 502);
  if (payment.paymentId !== String(order.transactionId)) return bad('payment_mismatch', 'El pago de Mercado Pago no coincide con el Payment ID del pedido.', 409);
  if (payment.externalReference !== String(orderId)) {
    return bad('external_reference_mismatch', `El pago pertenece a otro pedido (external_reference=${payment.externalReference ?? 'vacío'}).`, 409);
  }
  if (!payment.status || !REFUNDABLE_STATUSES.has(payment.status)) return bad('payment_status', `El pago está en estado "${payment.status ?? '?'}" y no admite reembolso.`, 409);
  if (payment.refundable <= EPS) return bad('nothing_refundable', 'El pago ya fue reembolsado por completo.', 409);

  if (input.mode !== 'full' && input.mode !== 'partial') return bad('bad_mode', 'Modo inválido: full o partial.');
  if (input.mode === 'full') return { ok: true, amount: payment.refundable, type: 'full' };

  const amount = parseAmount(input.amount);
  if (amount === null) return bad('bad_amount', 'Monto inválido.');
  if (amount <= 0) return bad('amount_zero', 'El monto tiene que ser mayor a cero.');
  // Los dos vienen redondeados a centavos: un centavo de más ya es de más.
  if (amount > payment.refundable) return bad('amount_exceeds', `El monto supera lo disponible para reembolsar ($${payment.refundable.toFixed(2)}).`);
  // Un parcial que agota lo disponible es, a todos los efectos, un total.
  const type: RefundType = Math.abs(amount - payment.refundable) <= EPS ? 'full' : 'partial';
  return { ok: true, amount, type };
}

// ─── Cliente MP (GET pago + POST refund) ─────────────────────────────────────

export type MpRefundResult =
  | { ok: true; refund: { id: string; amount: number; status: string | null; dateCreated: string | null }; httpStatus: number }
  | { ok: false; httpStatus: number; error: string };

export interface MpRefundClient {
  getPayment(paymentId: string): Promise<{ ok: true; payment: any } | { ok: false; status: number; error: string }>;
  createRefund(paymentId: string, amount: number | null, idempotencyKey: string): Promise<MpRefundResult>;
}

/** Cliente real. El token sólo vive acá; nunca se loguea ni se devuelve. */
export function mpRefundClient(token: string, fetchImpl: typeof fetch = fetch): MpRefundClient {
  const base = 'https://api.mercadopago.com/v1/payments';
  return {
    async getPayment(paymentId) {
      try {
        const res = await fetchImpl(`${base}/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const body: any = await res.json().catch(() => null);
        if (res.status === 200 && body) return { ok: true, payment: body };
        return { ok: false, status: res.status, error: String(body?.message || body?.error || `http_${res.status}`) };
      } catch (e) {
        return { ok: false, status: 0, error: e instanceof Error ? e.message : 'network' };
      }
    },
    async createRefund(paymentId, amount, idempotencyKey) {
      try {
        const res = await fetchImpl(`${base}/${encodeURIComponent(paymentId)}/refunds`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(amount === null ? {} : { amount }),
          cache: 'no-store',
        });
        const body: any = await res.json().catch(() => null);
        if ((res.status === 200 || res.status === 201) && body && body.id !== undefined && body.id !== null) {
          return {
            ok: true, httpStatus: res.status,
            refund: { id: String(body.id), amount: round2(num(body.amount) ?? amount ?? 0), status: body.status ? String(body.status) : null, dateCreated: body.date_created ? String(body.date_created) : null },
          };
        }
        const cause = Array.isArray(body?.cause) && body.cause.length ? ` (${body.cause.map((c: any) => c?.description || c?.code).filter(Boolean).join('; ')})` : '';
        return { ok: false, httpStatus: res.status, error: `${String(body?.message || body?.error || `http_${res.status}`)}${cause}` };
      } catch (e) {
        return { ok: false, httpStatus: 0, error: e instanceof Error ? e.message : 'network' };
      }
    },
  };
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export type RefundAuditAction = 'refund_created' | 'refund_failed' | 'refund_woo_pending' | 'refund_woo_repaired' | 'refund_external_detected';

export interface RefundAuditEvent {
  action: RefundAuditAction;
  actor: string;
  orderId: number;
  paymentId: string | null;
  mpRefundId: string | null;
  wcRefundId: number | null;
  amount: number;
  at: string;
  result: 'ok' | 'error';
  error?: string | null;
}

// ─── Dependencias del orquestador ────────────────────────────────────────────

export interface RefundDeps {
  getOrder(orderId: number): Promise<OrderLite | null>;
  mp: MpRefundClient;
  wc: {
    createRefund(orderId: number, amount: number, reason: string): Promise<{ ok: boolean; id: number | null; error: string | null }>;
    writeMeta(orderId: number, meta: { key: string; value: unknown }[]): Promise<boolean>;
    note(orderId: number, text: string): Promise<void>;
  };
  /** Re-sync forzado del snapshot. Best-effort: un fallo acá no invalida el refund. */
  sync(orderId: number): Promise<void>;
  audit(event: RefundAuditEvent): Promise<void>;
  now(): Date;
}

export interface RefundInput {
  orderId: number;
  mode: 'full' | 'partial';
  amount?: unknown;
  idempotencyKey: unknown;
  actor: string;
  reason?: string;
}

export type RefundOutcome =
  | { ok: true; httpStatus: 200; replay: boolean; entry: HsRefundEntry; refundable: number; refunded: number }
  | { ok: false; httpStatus: number; code: string; message: string; entry?: HsRefundEntry; repairable?: boolean };

const fmtArs = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function upsertEntry(entries: HsRefundEntry[], entry: HsRefundEntry): HsRefundEntry[] {
  const i = entries.findIndex((e) => e.idempotencyKey === entry.idempotencyKey);
  if (i === -1) return [...entries, entry];
  const next = entries.slice();
  next[i] = entry;
  return next;
}

async function persist(deps: RefundDeps, orderId: number, entries: HsRefundEntry[], lock: RefundLock | null): Promise<boolean> {
  return deps.wc.writeMeta(orderId, [
    { key: REFUNDS_META, value: JSON.stringify(entries) },
    { key: REFUND_LOCK_META, value: lock ? JSON.stringify(lock) : '' },
  ]);
}

/**
 * Ejecuta un refund completo: validación fresca → MP → Woo → meta/nota/sync/audit.
 */
export async function executeRefund(deps: RefundDeps, input: RefundInput): Promise<RefundOutcome> {
  const { orderId } = input;
  const fail = (httpStatus: number, code: string, message: string, extra: Partial<RefundOutcome> = {}): RefundOutcome =>
    ({ ok: false, httpStatus, code, message, ...(extra as any) });

  if (!isValidIdempotencyKey(input.idempotencyKey, orderId)) return fail(400, 'bad_idempotency_key', 'Falta la clave de idempotencia del intento.');
  const key = input.idempotencyKey;

  const order = await deps.getOrder(orderId);
  if (!order) return fail(404, 'order_not_found', 'Pedido no encontrado.');

  // Replay / estado previo del mismo intento.
  const entries = parseRefundsMeta(order.meta);
  const prev = entries.find((e) => e.idempotencyKey === key);
  if (prev?.status === 'completed') {
    return { ok: true, httpStatus: 200, replay: true, entry: prev, refundable: NaN, refunded: NaN };
  }
  if (prev?.status === 'mp_completed_woo_pending') {
    return fail(409, 'woo_pending', 'Este reembolso ya se hizo en Mercado Pago y falta registrarlo en WooCommerce. Usá "Reintentar registro en Woo".', { entry: prev, repairable: true });
  }

  // Lock contra un segundo operador.
  const nowIso = deps.now().toISOString();
  const lock = parseRefundLock(order.meta);
  if (lock && lock.key !== key && deps.now().getTime() - Date.parse(lock.at) < LOCK_TTL_MS) {
    return fail(409, 'refund_in_progress', `Hay otro reembolso en curso sobre este pedido (${lock.actor}). Esperá un minuto y volvé a cargar.`);
  }

  // Validación fresca contra MP.
  if (!order.transactionId) return fail(409, 'missing_payment_id', 'El pedido no tiene Payment ID de Mercado Pago.');
  const payRes = await deps.mp.getPayment(order.transactionId);
  if (payRes.ok === false) return fail(502, 'mp_get_failed', `Mercado Pago no respondió el pago: ${payRes.error}`);
  const state = paymentRefundState(payRes.payment);
  const v = validateRefundRequest({ orderId, order, payment: state, mode: input.mode, amount: input.amount });
  if (v.ok === false) return fail(v.httpStatus, v.code, v.message);
  const st = state!;

  const reason = (input.reason || '').trim();
  const lockNow: RefundLock = { key, at: nowIso, amount: v.amount, actor: input.actor };
  const locked = await persist(deps, orderId, entries, lockNow);
  if (!locked) return fail(502, 'lock_failed', 'No se pudo reservar el pedido en WooCommerce. No se tocó Mercado Pago.');

  // 1) Mercado Pago. Full = sin amount; parcial = amount. Misma key ante retry.
  const mpAmount = v.type === 'full' && Math.abs(v.amount - st.refundable) <= EPS && st.refunded <= EPS ? null : v.amount;
  const mp = await deps.mp.createRefund(st.paymentId, mpAmount, key);

  if (mp.ok === false) {
    const entry: HsRefundEntry = {
      mpRefundId: null, paymentId: st.paymentId, amount: v.amount, type: v.type, at: nowIso, actor: input.actor,
      idempotencyKey: key, wcRefundId: null, status: 'failed', reason: reason || undefined, error: `mp_${mp.httpStatus}:${mp.error}`, origin: 'admin', mpStatus: null,
    };
    await persist(deps, orderId, upsertEntry(entries, entry), null);
    await deps.audit({ action: 'refund_failed', actor: input.actor, orderId, paymentId: st.paymentId, mpRefundId: null, wcRefundId: null, amount: v.amount, at: nowIso, result: 'error', error: entry.error });
    return fail(502, 'mp_refund_failed', `Mercado Pago rechazó el reembolso: ${mp.error}`, { entry });
  }

  // MP confirmó: persistir ANTES de tocar Woo, así el resultado nunca se pierde.
  let entry: HsRefundEntry = {
    mpRefundId: mp.refund.id, paymentId: st.paymentId, amount: v.amount, type: v.type, at: nowIso, actor: input.actor,
    idempotencyKey: key, wcRefundId: null, status: 'mp_completed_woo_pending', reason: reason || undefined, origin: 'admin', mpStatus: mp.refund.status,
  };
  let list = upsertEntry(entries, entry);
  await persist(deps, orderId, list, lockNow);

  // 2) WooCommerce (registro contable, sin mover plata).
  const wooReason = `Reembolso Mercado Pago ${entry.mpRefundId}${reason ? ` — ${reason}` : ''}`;
  const wc = await deps.wc.createRefund(orderId, v.amount, wooReason);

  if (!wc.ok || !wc.id) {
    entry = { ...entry, error: `woo:${wc.error || 'sin id'}` };
    list = upsertEntry(entries, entry);
    await persist(deps, orderId, list, null);
    await deps.wc.note(orderId, `Reembolso ${v.type === 'full' ? 'total' : 'parcial'} de ${fmtArs(v.amount)} HECHO en Mercado Pago (refund ${entry.mpRefundId}) pero NO registrado en WooCommerce: ${wc.error || 'sin id'}. Reparar desde el panel. Actor: ${input.actor}.`);
    await deps.audit({ action: 'refund_woo_pending', actor: input.actor, orderId, paymentId: st.paymentId, mpRefundId: entry.mpRefundId, wcRefundId: null, amount: v.amount, at: nowIso, result: 'error', error: entry.error });
    await deps.sync(orderId).catch(() => undefined);
    return fail(502, 'woo_refund_failed', 'El dinero fue reembolsado correctamente en Mercado Pago, pero falta registrar el refund en WooCommerce.', { entry, repairable: true });
  }

  // 3) Todo OK.
  entry = { ...entry, wcRefundId: wc.id, status: 'completed', error: undefined };
  list = upsertEntry(entries, entry);
  await persist(deps, orderId, list, null);
  await deps.wc.note(orderId, `Reembolso ${v.type === 'full' ? 'total' : 'parcial'} de ${fmtArs(v.amount)} vía Mercado Pago. MP refund ${entry.mpRefundId} · Woo refund #${wc.id}${reason ? ` · ${reason}` : ''}. Actor: ${input.actor}.`);
  await deps.audit({ action: 'refund_created', actor: input.actor, orderId, paymentId: st.paymentId, mpRefundId: entry.mpRefundId, wcRefundId: wc.id, amount: v.amount, at: nowIso, result: 'ok' });
  await deps.sync(orderId).catch(() => undefined);

  return { ok: true, httpStatus: 200, replay: false, entry, refunded: round2(st.refunded + v.amount), refundable: round2(st.refundable - v.amount) };
}

// ─── Reparación: sólo la parte de Woo ────────────────────────────────────────

export interface RepairInput { orderId: number; mpRefundId: string; actor: string }

export type RepairOutcome =
  | { ok: true; httpStatus: 200; entry: HsRefundEntry; alreadyDone: boolean }
  | { ok: false; httpStatus: number; code: string; message: string };

/**
 * Registra en Woo un refund que YA existe en MP (por fallo previo de Woo o
 * porque se hizo desde el panel de MP). Nunca llama a `createRefund` de MP.
 */
export async function repairWooRefund(deps: RefundDeps, input: RepairInput): Promise<RepairOutcome> {
  const { orderId, mpRefundId } = input;
  const fail = (httpStatus: number, code: string, message: string): RepairOutcome => ({ ok: false, httpStatus, code, message });
  if (!mpRefundId || typeof mpRefundId !== 'string') return fail(400, 'bad_refund_id', 'Falta el id del refund de Mercado Pago.');

  const order = await deps.getOrder(orderId);
  if (!order) return fail(404, 'order_not_found', 'Pedido no encontrado.');
  if (!order.transactionId) return fail(409, 'missing_payment_id', 'El pedido no tiene Payment ID de Mercado Pago.');

  const entries = parseRefundsMeta(order.meta);
  let entry = entries.find((e) => e.mpRefundId === mpRefundId) || null;
  if (entry?.status === 'completed' && entry.wcRefundId) return { ok: true, httpStatus: 200, entry, alreadyDone: true };

  // Confirmar contra MP que el refund existe y cuánto fue (nunca se inventa).
  const payRes = await deps.mp.getPayment(order.transactionId);
  if (payRes.ok === false) return fail(502, 'mp_get_failed', `Mercado Pago no respondió el pago: ${payRes.error}`);
  const st = paymentRefundState(payRes.payment);
  if (!st || st.externalReference !== String(orderId)) return fail(409, 'external_reference_mismatch', 'El pago no pertenece a este pedido.');
  const mpRefund = st.mpRefunds.find((r) => r.id === mpRefundId);
  if (!mpRefund) return fail(404, 'mp_refund_not_found', 'Mercado Pago no tiene un refund con ese id para este pago.');
  if (mpRefund.status && mpRefund.status !== 'approved') return fail(409, 'mp_refund_not_approved', `El refund está "${mpRefund.status}" en Mercado Pago; sólo se registra un refund aprobado.`);

  const nowIso = deps.now().toISOString();
  if (!entry) {
    entry = {
      mpRefundId, paymentId: st.paymentId, amount: mpRefund.amount, type: Math.abs(mpRefund.amount - st.gross) <= EPS ? 'full' : 'partial',
      at: mpRefund.dateCreated || nowIso, actor: 'externo (Mercado Pago)', idempotencyKey: `hs-refund-${orderId}-external-${mpRefundId}`,
      wcRefundId: null, status: 'mp_completed_woo_pending', origin: 'external', mpStatus: mpRefund.status,
    };
  }
  if (entry.status === 'completed' && !entry.wcRefundId) entry = { ...entry, status: 'mp_completed_woo_pending' };

  const wc = await deps.wc.createRefund(orderId, entry.amount, `Reembolso Mercado Pago ${mpRefundId} (registro reparado)`);
  if (!wc.ok || !wc.id) {
    const failed = { ...entry, error: `woo:${wc.error || 'sin id'}` };
    await persist(deps, orderId, upsertEntry(entries, failed), null);
    return fail(502, 'woo_refund_failed', `WooCommerce no pudo registrar el refund: ${wc.error || 'sin id'}`);
  }
  const done: HsRefundEntry = { ...entry, wcRefundId: wc.id, status: 'completed', error: undefined, repairedAt: nowIso };
  await persist(deps, orderId, upsertEntry(entries, done), null);
  await deps.wc.note(orderId, `Refund de Mercado Pago ${mpRefundId} (${fmtArs(done.amount)}) registrado en WooCommerce como refund #${wc.id}. Origen: ${done.origin === 'external' ? 'externo (hecho en MP)' : 'panel (reparación)'}. Actor: ${input.actor}.`);
  await deps.audit({ action: 'refund_woo_repaired', actor: input.actor, orderId, paymentId: st.paymentId, mpRefundId, wcRefundId: wc.id, amount: done.amount, at: nowIso, result: 'ok' });
  await deps.sync(orderId).catch(() => undefined);
  return { ok: true, httpStatus: 200, entry: done, alreadyDone: false };
}

// ─── Detección de refunds externos ───────────────────────────────────────────

/** Refunds aprobados en MP que no figuran en `_hs_refunds`: alguien los hizo
 *  desde el panel de MP (o el registro se perdió). Se devuelven como entradas
 *  `external` / `mp_completed_woo_pending` para que el panel las muestre como
 *  "REFUND EXTERNO / SIN REGISTRO WOO" y permita repararlas. */
export function detectExternalRefunds(state: PaymentRefundState, entries: HsRefundEntry[], nowIso: string): HsRefundEntry[] {
  const known = new Set(entries.map((e) => e.mpRefundId).filter(Boolean));
  return state.mpRefunds
    .filter((r) => !known.has(r.id) && (!r.status || r.status === 'approved'))
    .map((r) => ({
      mpRefundId: r.id, paymentId: state.paymentId, amount: r.amount, type: Math.abs(r.amount - state.gross) <= EPS ? 'full' : 'partial',
      at: r.dateCreated || nowIso, actor: 'externo (Mercado Pago)', idempotencyKey: `hs-refund-${state.externalReference ?? '0'}-external-${r.id}`,
      wcRefundId: null, status: 'mp_completed_woo_pending', origin: 'external', mpStatus: r.status,
    }));
}

/** Resumen para el panel: cuánto se devolvió, cuánto queda, y qué hay sin registrar. */
export function refundSummary(state: PaymentRefundState | null, entries: HsRefundEntry[], wooRefundedTotal: number) {
  const registered = entries.filter((e) => e.status === 'completed').reduce((s, e) => s + e.amount, 0);
  const pending = entries.filter((e) => e.status === 'mp_completed_woo_pending');
  return {
    gross: state?.gross ?? null,
    refunded: state?.refunded ?? null,
    refundable: state?.refundable ?? null,
    registeredInWoo: round2(wooRefundedTotal),
    registeredInHs: round2(registered),
    pendingWoo: pending.map((e) => ({ mpRefundId: e.mpRefundId, amount: e.amount, origin: e.origin, at: e.at })),
    /** Diferencia entre lo devuelto en MP y lo registrado en Woo. Cero = todo cerrado. */
    unregistered: state ? round2(state.refunded - wooRefundedTotal) : null,
  };
}
