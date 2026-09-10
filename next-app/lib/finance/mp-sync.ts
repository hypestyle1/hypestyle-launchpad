// Sync de snapshots de Mercado Pago → meta `_hs_gateway_fee` (v2) por pedido.
//
// READ-ONLY sobre Mercado Pago (`GET /v1/payments/{id}` y `/v1/payments/search`).
// Escribe únicamente dos metas del pedido en Woo: el snapshot y el estado del
// último intento (`_hs_gateway_fee_sync`). No toca estados, notas, checkout ni
// webhooks.
//
// ─── Selección de candidatos y política de resync ────────────────────────────
//
// Un pedido entra si es de MP (tarjeta / wallet / efectivo) y está cobrado
// (processing / completed / enviado / refunded). Después `decideSync` dice si
// hay que consultar a MP otra vez:
//
//   force                          → siempre
//   sin snapshot                   → sí (nunca se sincronizó)
//   snapshot v1                    → sí (upgrade a v2, una sola vez)
//   último intento falló           → sí, si pasaron ≥ MIN_AGE_HOURS
//   pedido modificado en Woo       → sí (date_modified > syncedAt: refund, edición)
//   snapshot v2 INESTABLE          → sí, si pasaron ≥ MIN_AGE_HOURS
//       (status ≠ approved, dinero no liberado, o discrepancy)
//   snapshot v2 estable y RECIENTE → sí, si pasaron ≥ RECENT_RECHECK_DAYS
//       (pagado hace ≤ RECENT_DAYS: ventana de refunds / contracargos)
//   snapshot v2 estable y viejo    → no
//
// Así el cron diario no hace polling del histórico: un pago viejo, aprobado,
// liberado y sin discrepancia no se vuelve a consultar salvo `force`.
//
// ─── Idempotencia ────────────────────────────────────────────────────────────
//
// Correr el sync N veces sobre el mismo pedido produce el mismo snapshot (salvo
// `syncedAt`). La meta se actualiza por clave (WC REST `update_meta_data`), no
// se duplica. Un fallo deja `_hs_gateway_fee_sync.ok=false` con el motivo y NO
// pisa un snapshot previo válido.

import { mapLimit } from '@/lib/map-limit';
import { wcGet, wcPut } from '@/lib/wc-admin';
import { fetchOrderPages } from '@/lib/dashboard/wc-paginate';
import { providerOf } from './fees';
import {
  GATEWAY_FEE_META, GATEWAY_SYNC_META, normalizeMpPayment, parseGatewaySnapshot, isSnapshotV2,
} from './gateway-snapshot';
import type { GatewayFeeSnapshot, GatewayFeeSnapshotV2, GatewaySyncStatus, Provider } from './types';

export const MP_METHODS = new Set(['tarjeta', 'mercadopago', 'woo-mercado-pago-basic', 'efectivo']);
export const SYNCABLE_STATUSES = new Set(['processing', 'completed', 'enviado', 'refunded']);

/** Política por defecto del cron. Ver cabecera. */
export const DEFAULT_POLICY = {
  /** Ventana de "reciente" (refunds / contracargos) en días desde date_paid. */
  recentDays: 35,
  /** Cada cuánto se re-verifica un snapshot estable dentro de la ventana reciente. */
  recentRecheckDays: 7,
  /** Edad mínima del último intento para reintentar inestables o fallidos. */
  minAgeHours: 20,
};
export type SyncPolicy = typeof DEFAULT_POLICY & { force: boolean; now: Date };

const ORDER_FIELDS = 'id,number,status,date_created_gmt,date_paid_gmt,date_modified_gmt,payment_method,transaction_id,total,meta_data';
const MP_CONCURRENCY = 3;
const WC_WRITE_CONCURRENCY = 3;

export interface CandidateOrder {
  id: number;
  number: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  datePaidGmt: string | null;
  dateModifiedGmt: string | null;
  total: number;
  snapshot: GatewayFeeSnapshot | null;
  syncStatus: GatewaySyncStatus | null;
}

export type SyncReason =
  | 'force' | 'no_snapshot' | 'v1_upgrade' | 'retry_failed' | 'order_modified' | 'unstable' | 'recent_recheck';
export type SkipReason = 'not_mp' | 'not_paid' | 'stable' | 'fresh';
export type SyncDecision = { sync: true; reason: SyncReason } | { sync: false; reason: SkipReason };

const gmtMs = (s: string | null | undefined) => (s ? Date.parse(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : `${s}Z`) : NaN);
const hoursSince = (iso: string | null | undefined, now: Date) => {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? (now.getTime() - ms) / 3600_000 : Infinity;
};

export function toCandidate(o: any): CandidateOrder {
  const meta = Array.isArray(o?.meta_data) ? o.meta_data : [];
  let syncStatus: GatewaySyncStatus | null = null;
  const sm = meta.find((m: any) => m.key === GATEWAY_SYNC_META);
  if (sm) { try { syncStatus = typeof sm.value === 'string' ? JSON.parse(sm.value) : sm.value; } catch { syncStatus = null; } }
  return {
    id: Number(o.id),
    number: String(o.number ?? o.id),
    status: String(o.status || ''),
    paymentMethod: String(o.payment_method || ''),
    transactionId: o.transaction_id ? String(o.transaction_id) : null,
    datePaidGmt: o.date_paid_gmt || null,
    dateModifiedGmt: o.date_modified_gmt || null,
    total: parseFloat(o.total) || 0,
    snapshot: parseGatewaySnapshot(meta),
    syncStatus,
  };
}

export function isUnstable(s: GatewayFeeSnapshotV2): boolean {
  return s.status !== 'approved' || s.moneyReleaseStatus !== 'released' || s.discrepancy !== null;
}

export function decideSync(o: CandidateOrder, p: SyncPolicy): SyncDecision {
  if (!MP_METHODS.has(o.paymentMethod)) return { sync: false, reason: 'not_mp' };
  if (!SYNCABLE_STATUSES.has(o.status)) return { sync: false, reason: 'not_paid' };
  if (p.force) return { sync: true, reason: 'force' };
  const s = o.snapshot;
  if (!s) {
    // Sin snapshot: si el último intento falló hace poco, esperar; si no, ir.
    if (o.syncStatus && !o.syncStatus.ok && hoursSince(o.syncStatus.at, p.now) < p.minAgeHours) return { sync: false, reason: 'fresh' };
    return { sync: true, reason: o.syncStatus && !o.syncStatus.ok ? 'retry_failed' : 'no_snapshot' };
  }
  if (!isSnapshotV2(s)) return { sync: true, reason: 'v1_upgrade' };
  const age = hoursSince(s.syncedAt, p.now);
  const modified = gmtMs(o.dateModifiedGmt);
  const synced = Date.parse(s.syncedAt);
  if (Number.isFinite(modified) && Number.isFinite(synced) && modified > synced + 60_000) return { sync: true, reason: 'order_modified' };
  if (isUnstable(s)) return age >= p.minAgeHours ? { sync: true, reason: 'unstable' } : { sync: false, reason: 'fresh' };
  const paidAgeDays = (p.now.getTime() - gmtMs(o.datePaidGmt)) / 86400_000;
  if (Number.isFinite(paidAgeDays) && paidAgeDays <= p.recentDays) {
    return age >= p.recentRecheckDays * 24 ? { sync: true, reason: 'recent_recheck' } : { sync: false, reason: 'fresh' };
  }
  return { sync: false, reason: 'stable' };
}

// ─── Cliente MP (sólo GET) ───────────────────────────────────────────────────

export type MpPaymentResult = { ok: true; payment: any } | { ok: false; status: number; error: string };

export interface MpClient {
  getPayment(id: string): Promise<MpPaymentResult>;
  searchByExternalReference(ref: string): Promise<any[]>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cliente real. El token sólo vive acá; nunca se loguea ni se devuelve. */
export function mpClient(token: string, fetchImpl: typeof fetch = fetch): MpClient {
  const headers = { Authorization: `Bearer ${token}` };
  async function getJson(url: string, tries = 4): Promise<{ status: number; body: any }> {
    let last: { status: number; body: any } = { status: 0, body: null };
    for (let i = 0; i < tries; i++) {
      try {
        const res = await fetchImpl(url, { headers, cache: 'no-store' });
        const body = await res.json().catch(() => null);
        last = { status: res.status, body };
        if (res.status === 429 || res.status >= 500) {
          // Rate limit o caída de MP: backoff exponencial (1s, 2s, 4s) y reintento.
          const retryAfter = Number(res.headers.get('retry-after'));
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** i);
          continue;
        }
        return last;
      } catch (e) {
        last = { status: 0, body: { message: e instanceof Error ? e.message : 'network' } };
        await sleep(500 * (i + 1));
      }
    }
    return last;
  }
  return {
    async getPayment(id) {
      const r = await getJson(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`);
      if (r.status === 200 && r.body) return { ok: true, payment: r.body };
      return { ok: false, status: r.status, error: String(r.body?.message || r.body?.error || `http_${r.status}`) };
    },
    async searchByExternalReference(ref) {
      const r = await getJson(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`);
      return r.status === 200 && Array.isArray(r.body?.results) ? r.body.results : [];
    },
  };
}

/** Del resultado de search, el pago que representa el cobro: aprobado y más reciente. */
export function pickPaymentFromSearch(results: any[]): any | null {
  const approved = results.filter((p) => p?.status === 'approved');
  const pool = approved.length ? approved : results;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => Date.parse(b?.date_created || 0) - Date.parse(a?.date_created || 0))[0];
}

// ─── Corrida ─────────────────────────────────────────────────────────────────

export interface SyncOptions {
  dryRun: boolean;
  force: boolean;
  /** Máximo de pedidos a consultar en MP en esta corrida. */
  limit: number;
  /** Cuántos ejemplos devolver en el reporte. */
  samples: number;
  now?: Date;
  policy?: Partial<typeof DEFAULT_POLICY>;
}

export interface SyncSample {
  order: number; number: string; reason: SyncReason; resolvedBy: 'transaction_id' | 'external_reference';
  paymentId: string; paymentTypeId: string | null; paymentMethodId: string | null; installments: number | null;
  status: string | null; quality: string;
  gross: number; feeGateway: number; feeFinancing: number; feeOther: number; taxWithholdingTotal: number;
  taxWithholdings: { name: string; jurisdiction: string | null; amount: number }[];
  refunded: number; netCashReceived: number; calculatedNet: number; discrepancyDelta: number | null;
  dateApproved: string | null; moneyReleaseDate: string | null; moneyReleaseStatus: string | null;
  warnings: string[];
  // compat con la tabla existente de Rentabilidad
  transactionId: string; gatewayFee: number; netReceived: number; otherCashDeduction: number; effectiveFeeRate: number;
  breakdown: { type: string; amount: number }[];
}

export interface SyncReport {
  mode: string; dryRun: boolean; force: boolean; meta: string;
  candidates: number; alreadySynced: number; synced: number; wouldWrite: number;
  failed: { order: number; reason: string }[];
  samples: SyncSample[];
  summary: {
    ordersAnalyzed: number; selected: number; skipped: Record<SkipReason, number>; selectedBy: Record<SyncReason, number>;
    exactSuccess: number; calculatedNet: number; missingPaymentId: number; resolvedByExternalReference: number;
    apiErrors: number; writeErrors: number; discrepancies: number;
    taxWithholdingsFound: number; feesFound: number; financingFound: number; netValuesFound: number;
  };
  truncated: boolean;
}

function emptySummary(): SyncReport['summary'] {
  return {
    ordersAnalyzed: 0, selected: 0,
    skipped: { not_mp: 0, not_paid: 0, stable: 0, fresh: 0 },
    selectedBy: { force: 0, no_snapshot: 0, v1_upgrade: 0, retry_failed: 0, order_modified: 0, unstable: 0, recent_recheck: 0 },
    exactSuccess: 0, calculatedNet: 0, missingPaymentId: 0, resolvedByExternalReference: 0,
    apiErrors: 0, writeErrors: 0, discrepancies: 0,
    taxWithholdingsFound: 0, feesFound: 0, financingFound: 0, netValuesFound: 0,
  };
}

export function toSample(o: CandidateOrder, s: GatewayFeeSnapshotV2, reason: SyncReason, resolvedBy: SyncSample['resolvedBy']): SyncSample {
  return {
    order: o.id, number: o.number, reason, resolvedBy,
    paymentId: s.paymentId, paymentTypeId: s.paymentTypeId, paymentMethodId: s.paymentMethodId, installments: s.installments,
    status: s.status, quality: s.quality,
    gross: s.gross, feeGateway: s.feeGateway, feeFinancing: s.feeFinancing, feeOther: s.feeOther, taxWithholdingTotal: s.taxWithholdingTotal,
    taxWithholdings: s.taxWithholdings.map((t) => ({ name: t.name, jurisdiction: t.jurisdiction, amount: t.amount })),
    refunded: s.refunded, netCashReceived: s.netCashReceived, calculatedNet: s.calculatedNet,
    discrepancyDelta: s.discrepancy ? s.discrepancy.delta : null,
    dateApproved: s.dateApproved, moneyReleaseDate: s.moneyReleaseDate, moneyReleaseStatus: s.moneyReleaseStatus,
    warnings: s.warnings,
    transactionId: s.transactionId, gatewayFee: s.gatewayFee, netReceived: s.netReceived, otherCashDeduction: s.otherCashDeduction,
    effectiveFeeRate: s.gross > 0 ? Math.round((s.gatewayFee / s.gross) * 10000) / 100 : 0,
    breakdown: s.breakdown,
  };
}

/** Candidatos por id puntual (uno o varios). */
export async function loadOrdersById(ids: number[]): Promise<{ orders: CandidateOrder[]; missing: number[] }> {
  const missing: number[] = [];
  const found = await mapLimit(ids, WC_WRITE_CONCURRENCY, async (id) => {
    const o = await wcGet<any>(`orders/${id}?_fields=${ORDER_FIELDS}&_cb=${Date.now()}`);
    if (!o) { missing.push(id); return null; }
    return toCandidate(o);
  });
  return { orders: found.filter((x): x is CandidateOrder => !!x), missing };
}

/** Candidatos por rango de creación (paginado completo, tandas chicas). */
export async function loadOrdersInRange(afterISO: string, beforeISO: string): Promise<{ orders: CandidateOrder[]; truncated: boolean }> {
  const { raw, truncated } = await fetchOrderPages({ fields: ORDER_FIELDS, after: afterISO, before: beforeISO });
  return { orders: raw.map(toCandidate), truncated };
}

/**
 * Corre el sync sobre una lista de candidatos ya cargada. Consulta MP sólo para
 * los que `decideSync` selecciona, hasta `limit`. Con `dryRun` no escribe nada.
 */
export async function runMpSync(candidates: CandidateOrder[], client: MpClient, opts: SyncOptions, truncated = false): Promise<SyncReport> {
  const now = opts.now || new Date();
  const policy: SyncPolicy = { ...DEFAULT_POLICY, ...(opts.policy || {}), force: opts.force, now };
  const summary = emptySummary();
  const report: SyncReport = {
    mode: opts.dryRun ? 'preview (no escribe)' : 'sync', dryRun: opts.dryRun, force: opts.force, meta: GATEWAY_FEE_META,
    candidates: 0, alreadySynced: 0, synced: 0, wouldWrite: 0, failed: [], samples: [], summary, truncated,
  };

  summary.ordersAnalyzed = candidates.length;
  report.alreadySynced = candidates.filter((o) => !!o.snapshot).length;

  const selected: { o: CandidateOrder; reason: SyncReason }[] = [];
  for (const o of candidates) {
    const d = decideSync(o, policy);
    if (d.sync) selected.push({ o, reason: d.reason });
    else summary.skipped[d.reason] += 1;
  }
  // Orden estable: más nuevos primero, así el `limit` prioriza lo reciente.
  selected.sort((a, b) => gmtMs(b.o.datePaidGmt) - gmtMs(a.o.datePaidGmt));
  const batch = selected.slice(0, Math.max(0, opts.limit));
  summary.selected = batch.length;
  report.candidates = batch.length;
  for (const s of batch) summary.selectedBy[s.reason] += 1;

  const syncedAt = now.toISOString();
  const writes: { o: CandidateOrder; snap: GatewayFeeSnapshotV2; status: GatewaySyncStatus }[] = [];
  const failures: { o: CandidateOrder; status: GatewaySyncStatus }[] = [];

  await mapLimit(batch, MP_CONCURRENCY, async ({ o, reason }) => {
    const provider: Provider = providerOf(o.paymentMethod);
    let paymentId = o.transactionId;
    let resolvedBy: SyncSample['resolvedBy'] = 'transaction_id';
    let payment: any = null;

    if (paymentId) {
      const r: MpPaymentResult = await client.getPayment(paymentId);
      if (r.ok === false) {
        summary.apiErrors += 1;
        const err = `mp_${r.status}:${r.error}`;
        console.log(`[mp-sync] order=${o.id} payment=${paymentId} error=${err}`);
        report.failed.push({ order: o.id, reason: err });
        failures.push({ o, status: { at: syncedAt, ok: false, provider, paymentId, error: err, resolvedBy: 'transaction_id' } });
        return;
      }
      payment = r.payment;
    } else {
      // Sin transaction_id: buscar por external_reference (= id del pedido).
      const results = await client.searchByExternalReference(String(o.id));
      payment = pickPaymentFromSearch(results);
      if (!payment) {
        summary.missingPaymentId += 1;
        report.failed.push({ order: o.id, reason: 'missing_payment_id:no_match_by_external_reference' });
        failures.push({ o, status: { at: syncedAt, ok: false, provider, paymentId: null, error: 'missing_payment_id', resolvedBy: null } });
        return;
      }
      paymentId = String(payment.id);
      resolvedBy = 'external_reference';
      summary.resolvedByExternalReference += 1;
    }

    const snap = normalizeMpPayment(payment, { provider, syncedAt });
    if (!snap) {
      summary.apiErrors += 1;
      report.failed.push({ order: o.id, reason: 'payment_without_amount' });
      failures.push({ o, status: { at: syncedAt, ok: false, provider, paymentId, error: 'payment_without_amount', resolvedBy } });
      return;
    }
    if (snap.externalReference && snap.externalReference !== String(o.id)) {
      snap.warnings.push(`external_reference_mismatch:${snap.externalReference}`);
    }

    if (snap.quality === 'real') summary.exactSuccess += 1; else summary.calculatedNet += 1;
    if (snap.discrepancy) summary.discrepancies += 1;
    if (snap.taxWithholdings.length) summary.taxWithholdingsFound += 1;
    if (snap.feeGateway > 0) summary.feesFound += 1;
    if (snap.feeFinancing > 0) summary.financingFound += 1;
    if (snap.quality === 'real') summary.netValuesFound += 1;

    console.log(`[mp-sync] order=${o.id} payment=${paymentId} reason=${reason} gross=${snap.gross} fee=${snap.feeGateway} fin=${snap.feeFinancing} tax=${snap.taxWithholdingTotal} net=${snap.netCashReceived} q=${snap.quality}${snap.discrepancy ? ` DISCREPANCY=${snap.discrepancy.delta}` : ''}`);

    if (report.samples.length < opts.samples) report.samples.push(toSample(o, snap, reason, resolvedBy));
    writes.push({ o, snap, status: { at: syncedAt, ok: true, provider, paymentId, error: null, resolvedBy } });
  });

  if (opts.dryRun) {
    report.wouldWrite = writes.length;
    return report;
  }

  await mapLimit(writes, WC_WRITE_CONCURRENCY, async ({ o, snap, status }) => {
    const ok = await wcPut(`orders/${o.id}`, {
      meta_data: [
        { key: GATEWAY_FEE_META, value: JSON.stringify(snap) },
        { key: GATEWAY_SYNC_META, value: JSON.stringify(status) },
      ],
    });
    if (ok) report.synced += 1;
    else { summary.writeErrors += 1; report.failed.push({ order: o.id, reason: 'wc_write_failed' }); }
  });
  // Los fallos también dejan rastro en el pedido (sin pisar un snapshot previo).
  await mapLimit(failures, WC_WRITE_CONCURRENCY, async ({ o, status }) => {
    await wcPut(`orders/${o.id}`, { meta_data: [{ key: GATEWAY_SYNC_META, value: JSON.stringify(status) }] });
  });

  return report;
}
