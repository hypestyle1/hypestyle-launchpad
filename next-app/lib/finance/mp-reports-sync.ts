// Orquestación Fase 3: reportes de MP → ledger → conciliación.
//
//   syncReports     lista los reportes de MP, baja los que no están en el
//                   ledger, los parsea, persiste archivo + movimientos (UPSERT
//                   por unique_key) y concilia contra Woo. Idempotente: el
//                   mismo archivo dos veces no duplica nada.
//   reprocessFile   vuelve a parsear el CSV guardado (raw) y re-concilia.
//   reconcileStored re-concilia los movimientos de un rango ya persistidos.
//
// Nunca inventa un pedido: un `payment` sin EXTERNAL_REFERENCE de Woo queda
// SIN_PEDIDO y entra al universo "movimientos sin pedido". Nunca corrige una
// diferencia en silencio: DIFERENCIA queda escrita con el delta.

import { mapLimit } from '@/lib/map-limit';
import { wcGet, wcPut } from '@/lib/wc-admin';
import { parseGatewaySnapshot, isSnapshotV2 } from './gateway-snapshot';
import { parseRefundsMeta } from './mp-refund';
import {
  normalizeReport, reconcileAll, monthRangeAr, sha256,
  type Movement, type ParsedReport, type ReportKind, type OrderForRecon, type ReconResult, type ReconStatus,
} from './mp-reports';
import { ledgerStore, storedToMovement } from './mp-ledger-store';
import type { MpReportsClient } from './mp-reports-client';

export const SETTLEMENT_META = '_hs_gateway_settlement';
export const REPORT_KINDS: ReportKind[] = ['release_report', 'settlement_report'];

export interface RunSummary {
  at: string;
  kind: 'cron' | 'manual' | 'reprocess' | 'reconcile';
  filesFound: number;
  filesDownloaded: number;
  filesSkipped: number;
  filesPending: number;
  rowsParsed: number;
  movementsUpserted: number;
  matched: number;
  unmatched: number;
  discrepancies: number;
  refunds: number;
  refundsUnregistered: number;
  chargebacks: number;
  disputes: number;
  taxes: number;
  unlinked: number;
  pendingRelease: number;
  errors: string[];
  files: { fileName: string; kind: ReportKind; rows: number; status: string; error?: string | null }[];
  backendMissing?: boolean;
}

export function emptySummary(kind: RunSummary['kind'], now: Date): RunSummary {
  return {
    at: now.toISOString(), kind, filesFound: 0, filesDownloaded: 0, filesSkipped: 0, filesPending: 0, rowsParsed: 0, movementsUpserted: 0,
    matched: 0, unmatched: 0, discrepancies: 0, refunds: 0, refundsUnregistered: 0, chargebacks: 0, disputes: 0, taxes: 0, unlinked: 0, pendingRelease: 0,
    errors: [], files: [],
  };
}

// ─── Dependencias inyectables (tests) ────────────────────────────────────────

export interface SyncDeps {
  store: typeof ledgerStore;
  loadOrders(orderIds: number[]): Promise<Map<number, OrderForRecon>>;
  writeSettlementMeta(orderId: number, value: unknown): Promise<boolean>;
  now(): Date;
}

const ORDER_FIELDS = 'id,number,status,transaction_id,meta_data,refunds';

export async function loadOrdersForRecon(orderIds: number[]): Promise<Map<number, OrderForRecon>> {
  const ids = [...new Set(orderIds.filter((n) => Number.isFinite(n) && n > 0))];
  const out = new Map<number, OrderForRecon>();
  await mapLimit(ids, 3, async (id) => {
    const o = await wcGet<any>(`orders/${id}?_fields=${ORDER_FIELDS}&_cb=${Date.now()}`);
    if (!o?.id) return;
    const snap = parseGatewaySnapshot(o.meta_data);
    out.set(id, {
      id: Number(o.id), number: String(o.number ?? o.id), status: String(o.status || ''),
      transactionId: o.transaction_id ? String(o.transaction_id).trim() : null,
      snapshot: isSnapshotV2(snap) ? snap : null,
      hsRefunds: parseRefundsMeta(o.meta_data),
      wooRefunded: (Array.isArray(o.refunds) ? o.refunds : []).reduce((s: number, r: any) => s + Math.abs(Number(r.total) || 0), 0),
    });
  });
  return out;
}

export function defaultDeps(): SyncDeps {
  return {
    store: ledgerStore,
    loadOrders: loadOrdersForRecon,
    writeSettlementMeta: (orderId, value) => wcPut(`orders/${orderId}`, { meta_data: [{ key: SETTLEMENT_META, value: JSON.stringify(value) }] }),
    now: () => new Date(),
  };
}

// ─── Conciliación de un lote de movimientos ──────────────────────────────────

export interface ReconBatch {
  results: ReconResult[];
  orders: Map<number, OrderForRecon>;
}

export async function reconcileMovements(movements: Movement[], deps: SyncDeps, summary: RunSummary): Promise<ReconBatch> {
  const orderIds = movements.map((m) => m.orderId).filter((n): n is number => !!n);
  const orders = await deps.loadOrders(orderIds);
  const results = reconcileAll(movements, orders);

  for (const r of results) {
    switch (r.status) {
      case 'CONCILIADO': summary.matched += 1; break;
      case 'DIFERENCIA': summary.discrepancies += 1; break;
      case 'SIN_PEDIDO': case 'PENDIENTE': summary.unmatched += 1; break;
      case 'LIQUIDACION_PENDIENTE': summary.pendingRelease += 1; break;
      case 'REFUND': summary.refunds += 1; break;
      case 'REFUND_SIN_REGISTRO': summary.refunds += 1; summary.refundsUnregistered += 1; break;
      case 'CHARGEBACK': summary.chargebacks += 1; break;
      case 'DISPUTA': summary.disputes += 1; break;
      case 'AJUSTE': summary.unlinked += 1; break;
    }
  }
  summary.taxes += movements.filter((m) => m.kind === 'tax_monthly' || m.kind === 'tax_operation').length;

  const st = await deps.store.setStatuses(results.map((r) => ({ uniqueKey: r.uniqueKey, status: r.status, note: r.note, orderId: r.orderId })));
  if (!st.ok) summary.errors.push(...st.errors.map((e) => `status:${e}`));

  // Marca en el pedido lo que dice la liquidación (sources.settlement). Sólo
  // para la fila `payment` del reporte de dinero liberado, que es la caja.
  const byKey = new Map(movements.map((m) => [m.uniqueKey, m]));
  const settled = results.filter((r) => (r.status === 'CONCILIADO' || r.status === 'DIFERENCIA') && r.orderId && byKey.get(r.uniqueKey)?.reportKind === 'release_report' && byKey.get(r.uniqueKey)?.kind === 'payment');
  await mapLimit(settled, 3, async (r) => {
    const m = byKey.get(r.uniqueKey)!;
    const ok = await deps.writeSettlementMeta(r.orderId!, {
      fileName: m.fileName, reportKind: m.reportKind, paymentId: m.paymentId, releaseDate: m.releaseDate,
      net: m.netAmount, gross: m.grossAmount, fee: m.feeAmount, financing: m.financingAmount, tax: m.taxAmount,
      status: r.status, delta: r.delta, note: r.note, matchedAt: deps.now().toISOString(),
    });
    if (!ok) summary.errors.push(`settlement_meta:${r.orderId}`);
  });

  return { results, orders };
}

// ─── Procesar un CSV (nuevo o reprocesado) ───────────────────────────────────

export async function processReportText(
  kind: ReportKind, fileName: string, text: string, meta: { beginDate: string | null; endDate: string | null },
  deps: SyncDeps, summary: RunSummary,
): Promise<ParsedReport> {
  const parsed = normalizeReport(kind, text, fileName);
  const nowIso = deps.now().toISOString();
  summary.rowsParsed += parsed.rowCount;

  const headerError = parsed.errors.find((e) => e.reason.startsWith('header_missing'));
  if (headerError) {
    const f = await deps.store.upsertFile({ reportKind: kind, fileName, beginDate: meta.beginDate, endDate: meta.endDate, sha256: parsed.sha256, rows: parsed.rowCount, downloadedAt: nowIso, status: 'error', error: headerError.reason, raw: text });
    if (!f.ok) summary.errors.push(`file:${fileName}:${f.error}`);
    summary.errors.push(`${fileName}:${headerError.reason}`);
    summary.files.push({ fileName, kind, rows: parsed.rowCount, status: 'error', error: headerError.reason });
    return parsed;
  }

  const f = await deps.store.upsertFile({ reportKind: kind, fileName, beginDate: meta.beginDate, endDate: meta.endDate, sha256: parsed.sha256, rows: parsed.rowCount, downloadedAt: nowIso, status: 'downloaded', error: null, raw: text });
  if (!f.ok) { summary.errors.push(`file:${fileName}:${f.error}`); summary.files.push({ fileName, kind, rows: parsed.rowCount, status: 'error', error: f.error }); return parsed; }

  const up = await deps.store.upsertMovements(parsed.movements);
  summary.movementsUpserted += up.inserted + up.updated;
  if (!up.ok) summary.errors.push(...up.errors.map((e) => `movement:${fileName}:${e}`));
  for (const e of parsed.errors) summary.errors.push(`${fileName}:l${e.line}:${e.reason}`);

  await reconcileMovements(parsed.movements, deps, summary);

  const done = await deps.store.upsertFile({ reportKind: kind, fileName, processedAt: deps.now().toISOString(), status: up.ok ? 'processed' : 'partial', error: up.ok ? null : up.errors.slice(0, 5).join('; ') });
  if (!done.ok) summary.errors.push(`file_done:${fileName}:${done.error}`);
  summary.files.push({ fileName, kind, rows: parsed.rowCount, status: up.ok ? 'processed' : 'partial' });
  return parsed;
}

// ─── Corrida completa ────────────────────────────────────────────────────────

export interface SyncOptions {
  kinds?: ReportKind[];
  runKind?: RunSummary['kind'];
  /** Reprocesar aunque el archivo ya esté en el ledger (baja de nuevo). */
  force?: boolean;
  /** Máximo de archivos nuevos a procesar por corrida. */
  limit?: number;
}

export async function syncReports(client: MpReportsClient, opts: SyncOptions = {}, deps: SyncDeps = defaultDeps()): Promise<RunSummary> {
  const summary = emptySummary(opts.runKind || 'cron', deps.now());
  const kinds = opts.kinds || REPORT_KINDS;
  const limit = opts.limit ?? 20;

  const known = await deps.store.listFiles();
  if (!known.ok) {
    summary.backendMissing = known.status === 404;
    summary.errors.push(`ledger:${known.error}`);
    return summary;
  }
  const knownByName = new Map((known.body?.files || []).map((f) => [f.file_name, f]));

  let processed = 0;
  for (const kind of kinds) {
    const list = await client.list(kind);
    summary.filesFound += list.length;
    // Más viejos primero: el histórico se reconstruye en orden.
    const ready = list.filter((e) => e.fileName).sort((a, b) => a.beginDate.localeCompare(b.beginDate));
    summary.filesPending += list.length - ready.length;
    for (const entry of ready) {
      const fileName = entry.fileName!;
      const prev = knownByName.get(fileName);
      if (prev && prev.status === 'processed' && !opts.force) { summary.filesSkipped += 1; continue; }
      if (processed >= limit) { summary.filesPending += 1; continue; }
      const dl = await client.download(kind, fileName);
      if (!dl.ok) { summary.errors.push(`download:${fileName}:http_${dl.status}`); continue; }
      if (prev && prev.status === 'processed' && prev.sha256 && prev.sha256 === sha256Of(dl.text) && !opts.force) { summary.filesSkipped += 1; continue; }
      summary.filesDownloaded += 1;
      processed += 1;
      await processReportText(kind, fileName, dl.text, { beginDate: entry.beginDate || null, endDate: entry.endDate || null }, deps, summary);
    }
  }

  const run = await deps.store.insertRun(summary.kind, summary, summary.at);
  if (!run.ok) summary.errors.push(`run_log:${run.error}`);
  return summary;
}

const sha256Of = (text: string): string => sha256(text);

export async function reprocessFile(fileName: string, deps: SyncDeps = defaultDeps()): Promise<RunSummary> {
  const summary = emptySummary('reprocess', deps.now());
  const f = await deps.store.getFile(fileName, true);
  if (!f.ok || !f.body?.file) { summary.errors.push(`file_not_found:${fileName}`); summary.backendMissing = f.status === 404 && !f.body; return summary; }
  const file = f.body.file;
  if (!file.raw) { summary.errors.push(`file_without_raw:${fileName}`); return summary; }
  summary.filesFound = 1; summary.filesDownloaded = 1;
  await processReportText(file.report_kind, fileName, file.raw, { beginDate: file.begin_date, endDate: file.end_date }, deps, summary);
  const run = await deps.store.insertRun('reprocess', summary, summary.at);
  if (!run.ok) summary.errors.push(`run_log:${run.error}`);
  return summary;
}

export async function reconcileStored(month: string, deps: SyncDeps = defaultDeps()): Promise<RunSummary> {
  const summary = emptySummary('reconcile', deps.now());
  const range = monthRangeAr(month);
  if (!range) { summary.errors.push('bad_month'); return summary; }
  const r = await deps.store.listMovements({ from: range.from, to: range.to, limit: 5000 });
  if (!r.ok) { summary.errors.push(`ledger:${r.error}`); summary.backendMissing = r.status === 404; return summary; }
  const movements = (r.body?.movements || []).map(storedToMovement);
  summary.rowsParsed = movements.length;
  await reconcileMovements(movements, deps, summary);
  const run = await deps.store.insertRun('reconcile', { ...summary, month }, summary.at);
  if (!run.ok) summary.errors.push(`run_log:${run.error}`);
  return summary;
}

export type { ReconStatus };
