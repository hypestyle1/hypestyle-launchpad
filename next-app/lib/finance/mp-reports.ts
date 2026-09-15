// Fase 3 — Reportes de Mercado Pago → ledger de movimientos → conciliación.
//
// Dos fuentes, dos roles (no se reemplazan):
//   - release_report ("dinero liberado"): cada fila `release` es un movimiento
//     que impactó el saldo disponible. Es la CAJA.
//   - settlement_report ("todas las transacciones"): una fila por operación con
//     su neto y si ya se liberó. Es el CONTROL (pago sin pedido, liquidación
//     pendiente).
//
// Lo aprendido de los CSV reales de la cuenta (agosto 2026):
//   - La fila `payment` de una venta ya viene NETA: NET_CREDIT_AMOUNT = GROSS +
//     MP_FEE + FINANCING_FEE + TAXES (los tres negativos). La retención SIRTAC
//     va en TAXES_AMOUNT / TAXES_DISAGGREGATED de la misma fila, no en una fila
//     `tax_withdholding` aparte.
//   - La cuenta también PAGA (proveedores, servicios): esas son filas `payment`
//     con NET_DEBIT, EXTERNAL_REFERENCE largo/uuid y `available_money`. Van
//     como `payment_out`, jamás se confunden con una venta. Lo mismo `refund`
//     con crédito = devolución que recibimos por una compra nuestra (`refund_in`).
//   - `reserve_for_payment` / `reserve_for_payout` vienen de a pares (débito y
//     crédito iguales): se guardan como `reserve`, netean cero.
//   - `payout` / `payouts_cash` son retiros a banco / efectivo (con su fee).
//   - `asset_management` es el rendimiento de la cuenta remunerada.
//
// Regla de oro: PAYMENT API EXPLICA, REPORTES CONCILIAN. Un `payment` que
// matchea un snapshot no se suma como ingreso: sólo valida el neto.
//
// Dominio puro (sin I/O). La persistencia vive en mp-ledger-store.ts y el
// acceso a MP en mp-reports-client.ts.

import { createHash } from 'crypto';
import type { GatewayFeeSnapshotV2 } from './types';
import type { HsRefundEntry } from './mp-refund';

export type ReportKind = 'release_report' | 'settlement_report';

export type MovementKind =
  | 'payment' | 'payment_out' | 'refund' | 'refund_in' | 'chargeback' | 'dispute'
  | 'tax_operation' | 'tax_monthly' | 'reserve' | 'payout' | 'fee' | 'adjustment' | 'other'
  /** Fila que no se pudo interpretar (monto ilegible, RECORD_TYPE desconocido).
   *  Se persiste igual, con la fila cruda, para que quede auditable y visible
   *  como pendiente en vez de perderse en un log. */
  | 'unclassified';

/** Kinds que pertenecen a un pedido (entran al cruce con Woo). */
export const ORDER_KINDS: ReadonlySet<MovementKind> = new Set(['payment', 'refund', 'chargeback', 'dispute', 'tax_operation']);

export type ReconStatus =
  | 'CONCILIADO' | 'PENDIENTE' | 'DIFERENCIA' | 'SIN_PEDIDO' | 'SIN_PAGO' | 'LIQUIDACION_PENDIENTE'
  | 'REFUND' | 'REFUND_SIN_REGISTRO' | 'CHARGEBACK' | 'DISPUTA' | 'AJUSTE' | 'SIN_CLASIFICAR';

export const RECON_LABEL: Record<ReconStatus, string> = {
  CONCILIADO: 'Conciliado', PENDIENTE: 'Pendiente', DIFERENCIA: 'Diferencia', SIN_PEDIDO: 'Sin pedido', SIN_PAGO: 'Sin pago',
  LIQUIDACION_PENDIENTE: 'Liquidación pendiente', REFUND: 'Refund', REFUND_SIN_REGISTRO: 'Refund sin registro',
  CHARGEBACK: 'Chargeback', DISPUTA: 'Disputa', AJUSTE: 'Ajuste', SIN_CLASIFICAR: 'Sin clasificar',
};

export interface Movement {
  uniqueKey: string;
  reportKind: ReportKind;
  fileName: string;
  recordType: string;
  description: string;
  kind: MovementKind;
  paymentId: string | null;
  orderId: number | null;
  grossAmount: number;
  feeAmount: number;
  financingAmount: number;
  taxAmount: number;
  credit: number;
  debit: number;
  /** credit − debit. */
  netAmount: number;
  /** ISO con offset, tal cual el reporte (display_timezone GMT-03). */
  releaseDate: string | null;
  approvalDate: string | null;
  balance: number | null;
  currency: string;
  sourceHash: string;
  rawMetadata: Record<string, unknown> | null;
  reconciliationStatus?: ReconStatus;
  reconciliationNote?: string | null;
}

export interface ParsedReport {
  kind: ReportKind;
  fileName: string;
  sha256: string;
  header: string[];
  rowCount: number;
  movements: Movement[];
  /** Saldos del reporte de liberaciones (filas que no son movimientos). */
  balances: { initial: number | null; total: number | null };
  /** Filas descartadas con motivo (monto ilegible, tipo desconocido…). Nunca se ocultan. */
  errors: { line: number; reason: string }[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.011;

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

/** Parser RFC-4180-ish: separador configurable, comillas dobles con `""` como
 *  escape, saltos de línea dentro de campos entrecomillados, CRLF o LF. */
export function parseCsv(text: string, separator = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === separator) { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Última línea vacía (archivo terminado en \n) no es una fila.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Número del reporte: punto decimal, sin separador de miles. Vacío → 0.
 *  Cualquier otra cosa es un error (no se adivina). */
export function parseReportNumber(v: string | undefined): number | null {
  const s = (v ?? '').trim();
  if (s === '') return 0;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return round2(Number(s));
}

const REQUIRED: Record<ReportKind, string[]> = {
  release_report: ['DATE', 'SOURCE_ID', 'EXTERNAL_REFERENCE', 'RECORD_TYPE', 'DESCRIPTION', 'NET_CREDIT_AMOUNT', 'NET_DEBIT_AMOUNT', 'GROSS_AMOUNT', 'MP_FEE_AMOUNT', 'FINANCING_FEE_AMOUNT', 'TAXES_AMOUNT', 'BALANCE_AMOUNT'],
  settlement_report: ['EXTERNAL_REFERENCE', 'SOURCE_ID', 'TRANSACTION_TYPE', 'TRANSACTION_AMOUNT', 'SETTLEMENT_NET_AMOUNT', 'SETTLEMENT_DATE', 'FEE_AMOUNT', 'FINANCING_FEE_AMOUNT', 'TAXES_AMOUNT', 'MONEY_RELEASE_DATE', 'IS_RELEASED'],
};

export function validateHeader(kind: ReportKind, header: string[]): { ok: boolean; missing: string[] } {
  const set = new Set(header.map((h) => h.trim().toUpperCase()));
  const missing = REQUIRED[kind].filter((c) => !set.has(c));
  return { ok: missing.length === 0, missing };
}

// ─── Clasificación ───────────────────────────────────────────────────────────

/** Un EXTERNAL_REFERENCE es un pedido de Woo sólo si es un entero corto. Los
 *  pagos que hacemos nosotros traen uuids o números de 16+ dígitos. */
export function orderIdFromExternalReference(ref: string | null | undefined): number | null {
  const s = (ref ?? '').trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

export function classifyRelease(description: string, credit: number, debit: number): MovementKind {
  const d = description.trim().toLowerCase();
  if (d === 'payment') return credit > 0 ? 'payment' : 'payment_out';
  if (d === 'refund' || d === 'shipping_refund') return debit > 0 ? 'refund' : 'refund_in';
  if (d === 'chargeback') return 'chargeback';
  if (d === 'dispute' || d.startsWith('mediation')) return 'dispute';
  if (d.startsWith('tax_withdholding') || d.startsWith('tax_withholding')) return 'tax_operation';
  if (d.startsWith('tax_payment') || d.startsWith('tax_iva') || d === 'tax_credit_debit') return 'tax_monthly';
  if (d.startsWith('reserve_')) return 'reserve';
  if (d === 'payout' || d.startsWith('payouts') || d === 'withdrawal') return 'payout';
  if (d.startsWith('fee_') || d.endsWith('_fee')) return 'fee';
  if (d.startsWith('asset_management') || d === 'restriction' || d === 'credit_payment' || d === 'digitalchange_transaction') return 'adjustment';
  return 'other';
}

export function classifySettlement(transactionType: string, amount: number): MovementKind {
  const t = transactionType.trim().toUpperCase();
  if (t === 'SETTLEMENT') return amount >= 0 ? 'payment' : 'payment_out';
  if (t === 'REFUND') return amount < 0 ? 'refund' : 'refund_in';
  if (t === 'CHARGEBACK') return 'chargeback';
  if (t === 'DISPUTE') return 'dispute';
  if (t === 'PAYOUTS' || t === 'PAYOUT' || t === 'WITHDRAWAL' || t === 'WITHDRAWAL_CANCEL') return 'payout';
  return 'other';
}

// ─── Normalización ───────────────────────────────────────────────────────────

function col(header: string[]) {
  const idx = new Map(header.map((h, i) => [h.trim().toUpperCase(), i]));
  return (row: string[], name: string): string => {
    const i = idx.get(name);
    return i === undefined ? '' : (row[i] ?? '');
  };
}

function safeJson(s: string): Record<string, unknown> | null {
  const t = (s || '').trim();
  if (!t || t === '{}' || t === '[]') return null;
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

function makeKey(kind: ReportKind, parts: (string | number | null)[], seen: Map<string, number>): string {
  const base = `${kind}:${parts.map((p) => (p === null || p === undefined || p === '' ? '-' : String(p))).join(':')}`;
  const key = base.length > 180 ? `${kind}:${sha256(base)}` : base;
  const n = (seen.get(key) ?? 0) + 1;
  seen.set(key, n);
  return n === 1 ? key : `${key}#${n}`;
}

/** Fila que no se pudo interpretar: se persiste como `unclassified` con la
 *  fila cruda (header → valor) y el motivo. Monto cero para no contaminar
 *  sumas; el monto real, si existe, queda legible en `rawMetadata.rawRow`. */
function unclassifiedMovement(kind: ReportKind, fileName: string, header: string[], row: string[], line: number, reason: string, seen: Map<string, number>): Movement {
  const rawRow: Record<string, string> = {};
  header.forEach((h, i) => { rawRow[h.trim().toUpperCase() || `COL_${i}`] = row[i] ?? ''; });
  const date = (rawRow.DATE || rawRow.SETTLEMENT_DATE || rawRow.MONEY_RELEASE_DATE || '').trim() || null;
  const sourceId = (rawRow.SOURCE_ID || '').trim() || null;
  return {
    uniqueKey: makeKey(kind, ['unclassified', reason, sourceId, date, sha256(row.join(';')).slice(0, 16)], seen),
    reportKind: kind, fileName, recordType: (rawRow.RECORD_TYPE || rawRow.TRANSACTION_TYPE || '').trim(), description: (rawRow.DESCRIPTION || '').trim(),
    kind: 'unclassified', paymentId: sourceId, orderId: null,
    grossAmount: 0, feeAmount: 0, financingAmount: 0, taxAmount: 0, credit: 0, debit: 0, netAmount: 0,
    releaseDate: date, approvalDate: (rawRow.TRANSACTION_APPROVAL_DATE || '').trim() || null,
    balance: null, currency: (rawRow.CURRENCY || rawRow.TRANSACTION_CURRENCY || '').trim() || 'ARS',
    sourceHash: sha256(row.join(';')),
    rawMetadata: { unparsed: true, reason, line, rawRow },
  };
}

export function normalizeReleaseReport(text: string, fileName: string): ParsedReport {
  const rows = parseCsv(text, ';');
  const header = rows[0] || [];
  const check = validateHeader('release_report', header);
  const out: ParsedReport = { kind: 'release_report', fileName, sha256: sha256(text), header, rowCount: Math.max(0, rows.length - 1), movements: [], balances: { initial: null, total: null }, errors: [] };
  if (!check.ok) { out.errors.push({ line: 1, reason: `header_missing:${check.missing.join(',')}` }); return out; }
  const g = col(header);
  const seen = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const recordType = g(r, 'RECORD_TYPE').trim();
    const credit = parseReportNumber(g(r, 'NET_CREDIT_AMOUNT'));
    const debit = parseReportNumber(g(r, 'NET_DEBIT_AMOUNT'));
    const gross = parseReportNumber(g(r, 'GROSS_AMOUNT'));
    const fee = parseReportNumber(g(r, 'MP_FEE_AMOUNT'));
    const fin = parseReportNumber(g(r, 'FINANCING_FEE_AMOUNT'));
    const tax = parseReportNumber(g(r, 'TAXES_AMOUNT'));
    const bal = parseReportNumber(g(r, 'BALANCE_AMOUNT'));
    if ([credit, debit, gross, fee, fin, tax].some((n) => n === null)) {
      out.errors.push({ line: i + 1, reason: 'malformed_amount' });
      out.movements.push(unclassifiedMovement('release_report', fileName, header, r, i + 1, 'malformed_amount', seen));
      continue;
    }
    if (recordType === 'initial_available_balance') { out.balances.initial = credit; continue; }
    if (recordType === 'total') { out.balances.total = credit; continue; }
    if (recordType !== 'release') {
      const reason = `unknown_record_type:${recordType || '?'}`;
      out.errors.push({ line: i + 1, reason });
      out.movements.push(unclassifiedMovement('release_report', fileName, header, r, i + 1, reason, seen));
      continue;
    }
    const description = g(r, 'DESCRIPTION').trim();
    const kind = classifyRelease(description, credit!, debit!);
    const sourceId = g(r, 'SOURCE_ID').trim() || null;
    const extRef = g(r, 'EXTERNAL_REFERENCE').trim();
    const date = g(r, 'DATE').trim() || null;
    const orderId = ORDER_KINDS.has(kind) ? orderIdFromExternalReference(extRef) : null;
    const meta = safeJson(g(r, 'METADATA'));
    const taxes = safeJson(g(r, 'TAXES_DISAGGREGATED'));
    const rawMetadata: Record<string, unknown> = {
      externalReference: extRef || null,
      paymentMethod: g(r, 'PAYMENT_METHOD').trim() || null,
      paymentMethodType: g(r, 'PAYMENT_METHOD_TYPE').trim() || null,
      installments: parseReportNumber(g(r, 'INSTALLMENTS')),
      taxDetail: g(r, 'TAX_DETAIL').trim() || null,
      taxesDisaggregated: taxes,
      metadata: meta,
      orderMp: g(r, 'ORDER_ID').trim() || null,
    };
    out.movements.push({
      uniqueKey: makeKey('release_report', [recordType, description, sourceId, date, credit!.toFixed(2), debit!.toFixed(2)], seen),
      reportKind: 'release_report', fileName, recordType, description, kind,
      paymentId: ORDER_KINDS.has(kind) || kind === 'refund_in' || kind === 'payment_out' ? sourceId : sourceId,
      orderId,
      grossAmount: gross!, feeAmount: fee!, financingAmount: fin!, taxAmount: tax!,
      credit: credit!, debit: debit!, netAmount: round2(credit! - debit!),
      releaseDate: date, approvalDate: g(r, 'TRANSACTION_APPROVAL_DATE').trim() || null,
      balance: bal, currency: g(r, 'CURRENCY').trim() || 'ARS',
      sourceHash: sha256(r.join(';')),
      rawMetadata,
    });
  }
  return out;
}

export function normalizeSettlementReport(text: string, fileName: string): ParsedReport {
  const rows = parseCsv(text, ';');
  const header = rows[0] || [];
  const check = validateHeader('settlement_report', header);
  const out: ParsedReport = { kind: 'settlement_report', fileName, sha256: sha256(text), header, rowCount: Math.max(0, rows.length - 1), movements: [], balances: { initial: null, total: null }, errors: [] };
  if (!check.ok) { out.errors.push({ line: 1, reason: `header_missing:${check.missing.join(',')}` }); return out; }
  const g = col(header);
  const seen = new Map<string, number>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const amount = parseReportNumber(g(r, 'TRANSACTION_AMOUNT'));
    const net = parseReportNumber(g(r, 'SETTLEMENT_NET_AMOUNT'));
    const fee = parseReportNumber(g(r, 'FEE_AMOUNT'));
    const fin = parseReportNumber(g(r, 'FINANCING_FEE_AMOUNT'));
    const tax = parseReportNumber(g(r, 'TAXES_AMOUNT'));
    if ([amount, net, fee, fin, tax].some((n) => n === null)) {
      out.errors.push({ line: i + 1, reason: 'malformed_amount' });
      out.movements.push(unclassifiedMovement('settlement_report', fileName, header, r, i + 1, 'malformed_amount', seen));
      continue;
    }
    const type = g(r, 'TRANSACTION_TYPE').trim();
    const kind = classifySettlement(type, amount!);
    const sourceId = g(r, 'SOURCE_ID').trim() || null;
    const extRef = g(r, 'EXTERNAL_REFERENCE').trim();
    const settlementDate = g(r, 'SETTLEMENT_DATE').trim() || null;
    const releaseDate = g(r, 'MONEY_RELEASE_DATE').trim() || null;
    const isReleased = /^true$/i.test(g(r, 'IS_RELEASED').trim());
    const orderId = ORDER_KINDS.has(kind) ? orderIdFromExternalReference(extRef) : null;
    const credit = net! > 0 ? net! : 0;
    const debit = net! < 0 ? round2(-net!) : 0;
    out.movements.push({
      uniqueKey: makeKey('settlement_report', [type, sourceId, settlementDate, net!.toFixed(2)], seen),
      reportKind: 'settlement_report', fileName, recordType: 'transaction', description: type.toLowerCase(), kind,
      paymentId: sourceId, orderId,
      grossAmount: amount!, feeAmount: fee!, financingAmount: fin!, taxAmount: tax!,
      credit, debit, netAmount: net!,
      // Para el settlement el "release" es la fecha de liberación (si ya se liberó);
      // si no, se guarda la de aprobación y el estado dice LIQUIDACION_PENDIENTE.
      releaseDate: isReleased && releaseDate ? releaseDate : settlementDate,
      approvalDate: settlementDate,
      balance: null, currency: g(r, 'TRANSACTION_CURRENCY').trim() || 'ARS',
      sourceHash: sha256(r.join(';')),
      rawMetadata: {
        externalReference: extRef || null,
        paymentMethod: g(r, 'PAYMENT_METHOD').trim() || null,
        paymentMethodType: g(r, 'PAYMENT_METHOD_TYPE').trim() || null,
        installments: parseReportNumber(g(r, 'INSTALLMENTS')),
        taxDetail: g(r, 'TAX_DETAIL').trim() || null,
        taxesDisaggregated: safeJson(g(r, 'TAXES_DISAGGREGATED')),
        metadata: safeJson(g(r, 'METADATA')),
        realAmount: parseReportNumber(g(r, 'REAL_AMOUNT')),
        moneyReleaseDate: releaseDate,
        isReleased,
        orderMp: g(r, 'ORDER_ID').trim() || null,
      },
    });
  }
  return out;
}

export function normalizeReport(kind: ReportKind, text: string, fileName: string): ParsedReport {
  return kind === 'release_report' ? normalizeReleaseReport(text, fileName) : normalizeSettlementReport(text, fileName);
}

// ─── Conciliación ────────────────────────────────────────────────────────────

/** Lo que hace falta saber de un pedido para conciliar (lo carga la ruta). */
export interface OrderForRecon {
  id: number;
  number: string;
  status: string;
  transactionId: string | null;
  snapshot: GatewayFeeSnapshotV2 | null;
  hsRefunds: HsRefundEntry[];
  wooRefunded: number;
}

export interface ReconResult {
  uniqueKey: string;
  status: ReconStatus;
  note: string | null;
  orderId: number | null;
  /** Para pagos conciliados/diferentes: lo que dice el snapshot vs el reporte. */
  delta: number | null;
}

/** Neto "económico" del pago según Payment API, ANTES de refunds: es lo que
 *  la fila `payment` del reporte acredita. */
export function snapshotNetBeforeRefunds(s: GatewayFeeSnapshotV2): number {
  return round2(s.gross - s.feeGateway - s.feeFinancing - s.feeOther - s.taxWithholdingTotal);
}

export function reconcileMovement(m: Movement, orders: Map<number, OrderForRecon>): ReconResult {
  const base = { uniqueKey: m.uniqueKey, orderId: m.orderId, delta: null as number | null };
  if (m.kind === 'unclassified') return { ...base, status: 'SIN_CLASIFICAR', note: String(m.rawMetadata?.reason || 'fila ilegible') };
  if (!ORDER_KINDS.has(m.kind)) return { ...base, status: 'AJUSTE', note: `${m.kind}:${m.description}` };

  const order = m.orderId ? orders.get(m.orderId) : undefined;
  if (m.kind === 'chargeback') return { ...base, status: 'CHARGEBACK', note: order ? null : 'sin pedido' };
  if (m.kind === 'dispute') return { ...base, status: 'DISPUTA', note: order ? null : 'sin pedido' };

  if (!order) return { ...base, status: 'SIN_PEDIDO', note: m.orderId ? `pedido ${m.orderId} no existe en Woo` : 'sin external_reference de pedido' };
  if (order.transactionId && m.paymentId && order.transactionId !== m.paymentId) {
    return { ...base, status: 'DIFERENCIA', note: `SOURCE_ID ${m.paymentId} ≠ transaction_id ${order.transactionId} del pedido ${m.orderId}` };
  }

  if (m.kind === 'refund') {
    const amount = m.debit;
    const registered = order.hsRefunds.find((e) => e.status === 'completed' && Math.abs(e.amount - amount) <= EPS);
    if (registered) return { ...base, status: 'REFUND', note: `MP ${registered.mpRefundId} · Woo #${registered.wcRefundId}` };
    const wooOnly = order.wooRefunded >= amount - EPS;
    return { ...base, status: 'REFUND_SIN_REGISTRO', note: wooOnly ? 'hay refund en Woo pero no en _hs_refunds' : 'sin Woo refund ni _hs_refunds' };
  }

  if (m.kind === 'tax_operation') return { ...base, status: 'AJUSTE', note: `retención por operación fuera de la fila payment: ${m.description}` };

  // payment
  if (m.reportKind === 'settlement_report' && m.rawMetadata && m.rawMetadata.isReleased === false) {
    return { ...base, status: 'LIQUIDACION_PENDIENTE', note: `libera ${String(m.rawMetadata.moneyReleaseDate || '?')}` };
  }
  const s = order.snapshot;
  if (!s) return { ...base, status: 'PENDIENTE', note: 'pedido sin snapshot v2 todavía' };
  const expected = snapshotNetBeforeRefunds(s);
  const delta = round2(m.netAmount - expected);
  const parts: string[] = [];
  if (Math.abs(m.grossAmount - s.gross) > EPS) parts.push(`bruto ${m.grossAmount} vs ${s.gross}`);
  if (Math.abs(-m.feeAmount - s.feeGateway) > EPS) parts.push(`comisión ${-m.feeAmount} vs ${s.feeGateway}`);
  if (Math.abs(-m.financingAmount - s.feeFinancing) > EPS) parts.push(`financiación ${-m.financingAmount} vs ${s.feeFinancing}`);
  if (Math.abs(-m.taxAmount - s.taxWithholdingTotal) > EPS) parts.push(`retenciones ${-m.taxAmount} vs ${s.taxWithholdingTotal}`);
  if (Math.abs(delta) <= EPS) return { ...base, status: 'CONCILIADO', note: parts.length ? `neto igual; componentes distintos: ${parts.join('; ')}` : null, delta: 0 };
  return { ...base, status: 'DIFERENCIA', note: `neto reporte ${m.netAmount} vs Payment API ${expected} (Δ ${delta})${parts.length ? ` · ${parts.join('; ')}` : ''}`, delta };
}

export function reconcileAll(movements: Movement[], orders: Map<number, OrderForRecon>): ReconResult[] {
  return movements.map((m) => reconcileMovement(m, orders));
}

// ─── KPIs del período ────────────────────────────────────────────────────────

export interface ReconKpis {
  grossSales: number;
  netPaymentApi: number;
  netReconciled: number;
  unlinkedNet: number;
  unlinkedByKind: Record<string, { count: number; credit: number; debit: number; net: number }>;
  pendingDifference: number;
  coverageCount: number;
  coverageAmount: number;
  counts: Record<ReconStatus, number>;
  /** Ventas del reporte atadas a un pedido de Woo (base de la cobertura). */
  payments: number;
  /** Ventas del reporte SIN pedido (transferencias recibidas, cobros manuales). */
  salesNoOrder: number;
  /** Pedidos MP cobrados en el período sin fila `payment` en el reporte. */
  missingPayments: number;
}

export function computeKpis(
  movements: Movement[],
  results: Map<string, ReconResult>,
  orders: Map<number, OrderForRecon>,
  missingPayments: number,
): ReconKpis {
  const counts = Object.fromEntries(Object.keys(RECON_LABEL).map((k) => [k, 0])) as Record<ReconStatus, number>;
  let grossSales = 0, netPaymentApi = 0, netReconciled = 0, pendingDifference = 0, payments = 0, reconciled = 0, reconciledAmount = 0, paymentsAmount = 0, salesNoOrder = 0;
  const unlinkedByKind: ReconKpis['unlinkedByKind'] = {};
  let unlinkedNet = 0;
  const addUnlinked = (k: string, m: Movement) => {
    unlinkedByKind[k] ??= { count: 0, credit: 0, debit: 0, net: 0 };
    unlinkedByKind[k].count += 1; unlinkedByKind[k].credit += m.credit; unlinkedByKind[k].debit += m.debit; unlinkedByKind[k].net += m.netAmount;
    unlinkedNet += m.netAmount;
  };
  for (const m of movements) {
    const r = results.get(m.uniqueKey);
    const status = r?.status ?? (m.reconciliationStatus as ReconStatus | undefined) ?? 'PENDIENTE';
    counts[status] = (counts[status] ?? 0) + 1;
    if (m.kind === 'payment') {
      grossSales += m.grossAmount;
      // Una venta sin pedido de Woo (transferencia recibida por CVU, cobro
      // manual) no es una diferencia: es un ingreso que entra por su cuenta y
      // hay que atribuir. Va al universo "sin pedido", no a la cobertura.
      if (!m.orderId || status === 'SIN_PEDIDO') { salesNoOrder += 1; addUnlinked('payment', m); continue; }
      payments += 1;
      paymentsAmount += m.netAmount;
      const o = orders.get(m.orderId);
      if (o?.snapshot) netPaymentApi += snapshotNetBeforeRefunds(o.snapshot);
      if (status === 'CONCILIADO') { reconciled += 1; reconciledAmount += m.netAmount; netReconciled += m.netAmount; }
      else if (status === 'DIFERENCIA') pendingDifference += Math.abs(r?.delta ?? m.netAmount);
      else if (status === 'PENDIENTE' || status === 'LIQUIDACION_PENDIENTE') pendingDifference += Math.abs(m.netAmount);
      continue;
    }
    if (m.kind === 'refund' || m.kind === 'chargeback' || m.kind === 'dispute' || m.kind === 'tax_operation') {
      netReconciled -= m.debit; netReconciled += m.credit;
      if (status === 'REFUND_SIN_REGISTRO') pendingDifference += m.debit;
      continue;
    }
    // Movimientos sin pedido: entran a la caja por su cuenta.
    addUnlinked(m.kind, m);
  }
  for (const k of Object.keys(unlinkedByKind)) { const u = unlinkedByKind[k]; u.credit = round2(u.credit); u.debit = round2(u.debit); u.net = round2(u.net); }
  return {
    grossSales: round2(grossSales), netPaymentApi: round2(netPaymentApi), netReconciled: round2(netReconciled),
    unlinkedNet: round2(unlinkedNet), unlinkedByKind, pendingDifference: round2(pendingDifference),
    coverageCount: payments ? Math.round((reconciled / payments) * 1000) / 10 : 0,
    coverageAmount: paymentsAmount ? Math.round((reconciledAmount / paymentsAmount) * 1000) / 10 : 0,
    counts, payments, salesNoOrder, missingPayments,
  };
}

// ─── Períodos (hora Argentina) ───────────────────────────────────────────────

/** Rango UTC [from, to) de un mes calendario en Buenos Aires (UTC−3, sin DST). */
export function monthRangeAr(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const from = new Date(Date.UTC(y, mo - 1, 1, 3, 0, 0));
  const to = new Date(Date.UTC(y, mo, 1, 3, 0, 0));
  return { from: from.toISOString(), to: to.toISOString() };
}
