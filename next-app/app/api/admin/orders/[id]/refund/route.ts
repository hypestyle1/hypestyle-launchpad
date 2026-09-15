import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { authorizeAdmin } from '@/lib/admin-auth';
import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-profiles';
import { wcGet, wcPut, wcRequest, wcNote } from '@/lib/wc-admin';
import { mpClient, syncOrderNow } from '@/lib/finance/mp-sync';
import { auditLog } from '@/lib/admin-audit';
import {
  mpRefundClient, executeRefund, repairWooRefund, parseRefundsMeta, paymentRefundState, detectExternalRefunds,
  refundSummary, newIdempotencyKey, REFUNDS_META, SHARED_KEY_ACTOR,
  type OrderLite, type RefundDeps, type HsRefundEntry,
} from '@/lib/finance/mp-refund';
import { providerOf, groupOf } from '@/lib/finance/fees';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// REFUND de Mercado Pago desde el detalle del pedido. 100% server-side: el
// token de MP nunca sale de acá. Sección propia `reembolsos` (hoy sólo owner).
//
//   GET   estado fresco: pago en MP, devuelto, disponible, historial
//         `_hs_refunds`, refunds externos detectados y una idempotency key
//         nueva para el próximo intento.
//   POST  { action: 'refund', mode: 'full'|'partial', amount?, idempotencyKey, reason? }
//         { action: 'repair', mpRefundId }   → sólo registra en Woo, nunca toca MP.
//
// La lógica vive en lib/finance/mp-refund.ts; acá sólo auth, I/O y actor.

const MP_TOKEN = (process.env.MP_ACCESS_TOKEN || '').trim();
/** Ejecutar refunds desde el panel: apagado salvo HS_REFUNDS_ENABLED=1. */
const REFUNDS_ENABLED = (process.env.HS_REFUNDS_ENABLED || '').trim();
const ORDER_FIELDS = 'id,number,status,payment_method,transaction_id,total,billing,meta_data,refunds';

async function actorOf(req: NextRequest): Promise<string> {
  // Preferir la identidad de sesión aunque también venga la clave compartida.
  const session = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  // La sesión sólo lleva id de usuario WP y rol (sin PII en la cookie).
  if (session) return `perfil #${session.id} (${session.role})`;
  return SHARED_KEY_ACTOR;
}

function toOrderLite(o: any): OrderLite {
  return {
    id: Number(o.id),
    number: String(o.number ?? o.id),
    status: String(o.status || ''),
    paymentMethod: String(o.payment_method || ''),
    transactionId: o.transaction_id ? String(o.transaction_id).trim() : null,
    total: parseFloat(o.total) || 0,
    customerName: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' '),
    email: String(o.billing?.email || ''),
    meta: Array.isArray(o.meta_data) ? o.meta_data : [],
    wooRefunds: (Array.isArray(o.refunds) ? o.refunds : []).map((r: any) => ({ id: Number(r.id), total: Math.abs(Number(r.total) || 0), reason: String(r.reason || '') })),
  };
}

async function getOrder(orderId: number): Promise<OrderLite | null> {
  const o = await wcGet<any>(`orders/${orderId}?_fields=${ORDER_FIELDS}&_cb=${Date.now()}`);
  return o?.id ? toOrderLite(o) : null;
}

function deps(): RefundDeps {
  return {
    getOrder,
    mp: mpRefundClient(MP_TOKEN),
    wc: {
      async createRefund(orderId, amount, reason) {
        // api_refund=false: la plata ya se movió en MP. restock_items=false:
        // refund ≠ cancelación logística; el stock se repone aparte y a mano.
        const r = await wcRequest<any>('POST', `orders/${orderId}/refunds`, {
          amount: amount.toFixed(2), reason, api_refund: false, restock_items: false,
        });
        const id = r.ok && r.body?.id ? Number(r.body.id) : null;
        return { ok: r.ok && !!id, id, error: r.ok ? (id ? null : 'respuesta sin id') : r.error };
      },
      writeMeta: (orderId, meta) => wcPut(`orders/${orderId}`, { meta_data: meta }),
      note: (orderId, text) => wcNote(orderId, text),
    },
    async sync(orderId) { await syncOrderNow(orderId, mpClient(MP_TOKEN)); },
    audit: async (e) => { await auditLog(e); },
    now: () => new Date(),
  };
}

function guard(req: NextRequest) {
  if (!MP_TOKEN) return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 503 });
  return null;
}

/** Estado fresco para el bloque Mercado Pago y el modal. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authorizeAdmin(req, 'reembolsos'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const g = guard(req); if (g) return g;
  const orderId = parseInt(params.id, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const isMp = groupOf(providerOf(order.paymentMethod)) === 'mercadopago';
  let entries = parseRefundsMeta(order.meta);
  const wooRefunded = order.wooRefunds.reduce((s, r) => s + r.total, 0);

  if (!isMp || !order.transactionId) {
    return NextResponse.json({
      supported: false, reason: !isMp ? 'not_mercadopago' : 'missing_payment_id',
      orderId, paymentId: order.transactionId, refunds: entries, summary: refundSummary(null, entries, wooRefunded),
    });
  }

  const d = deps();
  const payRes = await d.mp.getPayment(order.transactionId);
  if (payRes.ok === false) {
    return NextResponse.json({ supported: true, orderId, paymentId: order.transactionId, mpError: payRes.error, refunds: entries, summary: refundSummary(null, entries, wooRefunded) }, { status: 502 });
  }
  const state = paymentRefundState(payRes.payment);
  if (!state) return NextResponse.json({ error: 'Mercado Pago devolvió un pago sin monto' }, { status: 502 });

  // Refunds hechos por fuera del panel: se registran en el historial (origen
  // externo, sin Woo) y se auditan una sola vez. No se inventa nada: el monto
  // y la fecha son los de MP.
  const nowIso = new Date().toISOString();
  const external = detectExternalRefunds(state, entries, nowIso);
  if (external.length) {
    entries = [...entries, ...external];
    await wcPut(`orders/${orderId}`, { meta_data: [{ key: REFUNDS_META, value: JSON.stringify(entries) }] });
    const actor = await actorOf(req);
    for (const e of external) {
      await wcNote(orderId, `Refund EXTERNO detectado en Mercado Pago: ${e.mpRefundId} por $${e.amount.toFixed(2)} (${e.at}). Sin registro en WooCommerce todavía.`);
      await auditLog({ action: 'refund_external_detected', actor, orderId, paymentId: state.paymentId, mpRefundId: e.mpRefundId, wcRefundId: null, amount: e.amount, result: 'ok' });
    }
  }

  return NextResponse.json({
    supported: true,
    orderId,
    number: order.number,
    customer: { name: order.customerName, email: order.email },
    paymentId: state.paymentId,
    mp: { status: state.status, statusDetail: state.statusDetail, gross: state.gross, refunded: state.refunded, refundable: state.refundable, refunds: state.mpRefunds },
    refunds: entries as HsRefundEntry[],
    wooRefunds: order.wooRefunds,
    summary: refundSummary(state, entries, wooRefunded),
    idempotencyKey: newIdempotencyKey(orderId, randomUUID()),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authorizeAdmin(req, 'reembolsos'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const g = guard(req); if (g) return g;
  const orderId = parseInt(params.id, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  const body: any = await req.json().catch(() => ({}));
  const actor = await actorOf(req);
  const action = body?.action || 'refund';

  if (action === 'repair') {
    const r = await repairWooRefund(deps(), { orderId, mpRefundId: String(body?.mpRefundId || ''), actor });
    if (r.ok === false) return NextResponse.json({ ok: false, code: r.code, error: r.message }, { status: r.httpStatus });
    return NextResponse.json({ ok: true, entry: r.entry, alreadyDone: r.alreadyDone });
  }

  if (action !== 'refund') return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  // Decisión 15/09/2026: los reembolsos se ejecutan en el panel de Mercado
  // Pago, no desde acá. Cualquiera con la clave del panel podría devolver un
  // pedido ya entregado. La ejecución queda detrás de un flag apagado; el
  // panel sólo REGISTRA en Woo lo que MP ya devolvió (action 'repair').
  if (REFUNDS_ENABLED !== '1') {
    return NextResponse.json({ ok: false, code: 'refunds_disabled', error: 'Los reembolsos se hacen desde Mercado Pago. Acá sólo se registran.' }, { status: 403 });
  }
  const r = await executeRefund(deps(), {
    orderId, mode: body?.mode, amount: body?.amount, idempotencyKey: body?.idempotencyKey, actor,
    reason: typeof body?.reason === 'string' ? body.reason.slice(0, 200) : undefined,
  });
  if (r.ok === false) {
    return NextResponse.json({ ok: false, code: r.code, error: r.message, entry: r.entry ?? null, repairable: !!r.repairable }, { status: r.httpStatus });
  }
  return NextResponse.json({ ok: true, replay: r.replay, entry: r.entry, refunded: r.refunded, refundable: r.refundable });
}
