import { describe, it, expect, vi } from 'vitest';
import {
  parseCsv, parseReportNumber, validateHeader, classifyRelease, classifySettlement, orderIdFromExternalReference,
  normalizeReleaseReport, normalizeSettlementReport, reconcileMovement, reconcileAll, computeKpis, monthRangeAr, snapshotNetBeforeRefunds,
  type Movement, type OrderForRecon,
} from '@/lib/finance/mp-reports';
import { syncReports, reprocessFile, emptySummary, type SyncDeps } from '@/lib/finance/mp-reports-sync';
import { monthRangeForMp } from '@/lib/finance/mp-reports-client';
import type { GatewayFeeSnapshotV2 } from '@/lib/finance/types';

// ─── Fixtures con la forma REAL de los CSV de la cuenta (agosto 2026) ────────

const REL_HEADER = 'DATE;SOURCE_ID;EXTERNAL_REFERENCE;RECORD_TYPE;DESCRIPTION;NET_CREDIT_AMOUNT;NET_DEBIT_AMOUNT;GROSS_AMOUNT;MP_FEE_AMOUNT;FINANCING_FEE_AMOUNT;SHIPPING_FEE_AMOUNT;TAXES_AMOUNT;COUPON_AMOUNT;INSTALLMENTS;PAYMENT_METHOD;TAX_DETAIL;TRANSACTION_APPROVAL_DATE;CURRENCY;TAXES_DISAGGREGATED;ORDER_ID;METADATA;BALANCE_AMOUNT;PAYMENT_METHOD_TYPE';
const REL_ROWS = [
  '2026-08-01T00:00:00.000-03:00;;;initial_available_balance;;132201.79;0.00;132201.79;0.00;0.00;0.00;0.00;0.00;1;;;;;;;;132201.79;',
  // venta con SIRTAC, neta en la misma fila
  '2026-08-31T22:39:50.000-03:00;175662774659;2999;release;payment;100538.42;0.00;131085.03;-9975.57;-16638.49;0.00;-3932.55;0.00;3;visa;tierra_del_fuego;2026-08-31T22:39:50.000-03:00;ARS;"[{""amount"":-3932.55,""detail"":""tax_withholding_sirtac_noinsc"",""financial_entity"":""tierra_del_fuego""}]";;"{}";277763.78;credit_card',
  // pago que hicimos nosotros (proveedor): débito, ref larga, available_money
  '2026-08-01T12:45:56.000-03:00;170661685355;2000014303697873;release;payment;0.00;46281.87;-46281.87;0.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-01T12:45:56.000-03:00;ARS;"[]";;"{""device_id"": ""7f36""}";85919.92;account_money',
  // devolución que RECIBIMOS de esa compra
  '2026-08-26T02:21:36.000-03:00;170661685355;2000014303697873;release;refund;46281.87;0.00;47528.32;0.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-26T02:21:36.000-03:00;ARS;"[]";;"{}";132201.79;account_money',
  // refund de una venta nuestra (débito) sobre el pago 175662774659
  '2026-09-02T10:00:00.000-03:00;175662774659;2999;release;refund;0.00;10000.00;-10000.00;0.00;0.00;0.00;0.00;0.00;1;visa;;2026-08-31T22:39:50.000-03:00;ARS;"[]";;"{}";267763.78;credit_card',
  // reservas en par
  '2026-08-01T08:42:16.000-03:00;170627672695;;release;reserve_for_payout;0.00;12000.00;-12000.00;0.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-01T08:42:16.000-03:00;ARS;"[]";;"{}";120201.79;',
  '2026-08-01T08:42:18.000-03:00;170627672695;;release;reserve_for_payout;12000.00;0.00;12000.00;0.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-01T08:42:18.000-03:00;ARS;"[]";;"{}";132201.79;',
  // retiro a banco con fee, percepción mensual, rendimiento, contracargo, disputa
  '2026-08-07T13:34:09.000-03:00;172563866160;;release;payouts_cash;0.00;401599.00;-400000.00;-1599.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-07T13:34:09.000-03:00;ARS;"[]";;"{}";265940.50;',
  '2026-08-31T23:59:00.000-03:00;999001;;release;tax_payment_iibb;0.00;5000.00;-5000.00;0.00;0.00;0.00;-5000.00;0.00;1;;buenos_aires;2026-08-31T23:59:00.000-03:00;ARS;"[]";;"{}";260940.50;',
  '2026-08-03T02:02:14.000-03:00;1747687743529;;release;asset_management;132.35;0.00;132.35;0.00;0.00;0.00;0.00;0.00;1;available_money;;2026-08-03T02:02:14.000-03:00;ARS;"[]";;"{}";78149.97;',
  '2026-08-20T10:00:00.000-03:00;175000000001;2950;release;chargeback;0.00;50000.00;-50000.00;0.00;0.00;0.00;0.00;0.00;1;visa;;2026-08-10T10:00:00.000-03:00;ARS;"[]";;"{}";210940.50;credit_card',
  '2026-08-21T10:00:00.000-03:00;175000000002;2951;release;dispute;0.00;30000.00;-30000.00;0.00;0.00;0.00;0.00;0.00;1;visa;;2026-08-11T10:00:00.000-03:00;ARS;"[]";;"{}";180940.50;credit_card',
  // venta sin pedido (transferencia recibida por CVU, sin external_reference)
  '2026-08-04T13:31:46.000-03:00;171132160615;;release;payment;20000.00;0.00;20000.00;0.00;0.00;0.00;0.00;0.00;1;cvu;;2026-08-04T13:31:46.000-03:00;ARS;"[]";;"{}";33758.64;bank_transfer',
  ';;;total;;277763.78;0.00;1325680.26;-435484.52;-593531.42;0.00;-20697.14;0.00;1;;;;;;;;0.00;',
];
const REL_CSV = [REL_HEADER, ...REL_ROWS].join('\r\n') + '\r\n';

const SET_HEADER = 'EXTERNAL_REFERENCE;SOURCE_ID;PAYMENT_METHOD_TYPE;PAYMENT_METHOD;TRANSACTION_TYPE;TRANSACTION_AMOUNT;TRANSACTION_CURRENCY;TRANSACTION_DATE;FEE_AMOUNT;SETTLEMENT_NET_AMOUNT;SETTLEMENT_DATE;REAL_AMOUNT;COUPON_AMOUNT;METADATA;FINANCING_FEE_AMOUNT;SHIPPING_FEE_AMOUNT;TAXES_AMOUNT;INSTALLMENTS;TAX_DETAIL;ORDER_ID;TAXES_DISAGGREGATED;DESCRIPTION;MONEY_RELEASE_DATE;IS_RELEASED';
const SET_ROWS = [
  '"2999";175662774659;credit_card;visa;SETTLEMENT;131085.03;ARS;2026-08-31T22:39:48.000-03:00;-26614.06;100538.42;2026-08-31T22:39:50.000-03:00;100538.42;0.00;"[{}]";-16638.49;0.00;-3932.55;3;;44095222858;"[]";;2026-08-31T22:39:50.000-03:00;true',
  '"2998";175661367533;credit_card;visa;SETTLEMENT;65268.56;ARS;2026-08-31T22:30:27.000-03:00;-13251.41;50059.09;2026-08-31T22:30:27.000-03:00;50059.09;0.00;"[{}]";-8284.47;0.00;-1958.06;3;;44095222857;"[]";;2026-09-18T22:30:27.000-03:00;false',
  ';172148561521;;;PAYOUTS;-150000.00;ARS;2026-08-10T14:17:26.000-03:00;0.00;-150000.00;2026-08-10T14:17:26.000-03:00;-150000.00;0.00;"{}";0.00;0.00;0.00;1;;;"[]";;;false',
];
const SET_CSV = [SET_HEADER, ...SET_ROWS].join('\n') + '\n';

function snap(over: Partial<GatewayFeeSnapshotV2> = {}): GatewayFeeSnapshotV2 {
  return {
    provider: 'mercadopago_card', transactionId: '175662774659', grossAmount: 131085.03, gatewayFee: 26614.06, netReceived: 100538.42, breakdown: [], otherCashDeduction: 3932.55,
    currency: 'ARS', syncedAt: '2026-09-01T06:15:00.000Z', source: 'exact', installments: 3, moneyReleaseDate: '2026-08-31T22:39:50.000-04:00',
    version: 2, paymentId: '175662774659', externalReference: '2999', merchantOrderId: null, collectorId: null, paymentMethodId: 'visa', paymentTypeId: 'credit_card',
    status: 'approved', statusDetail: 'accredited', gross: 131085.03, totalPaid: 131085.03, feeGateway: 9975.57, feeFinancing: 16638.49, feeOther: 0,
    taxWithholdings: [{ name: 'tax_withholding_sirtac_noinsc-tierra_del_fuego', regime: 'sirtac_noinsc', jurisdiction: 'tierra_del_fuego', amount: 3932.55, sourceId: null }],
    taxWithholdingTotal: 3932.55, refunded: 0, adjustments: 0, netCashReceived: 100538.42, calculatedNet: 100538.42, discrepancy: null, charges: [],
    dateCreated: null, dateApproved: '2026-08-31T22:39:50.000-04:00', moneyReleaseStatus: 'released', quality: 'real', warnings: [],
    ...over,
  };
}

function order(id: number, over: Partial<OrderForRecon> = {}): OrderForRecon {
  return { id, number: String(id), status: 'processing', transactionId: '175662774659', snapshot: snap(), hsRefunds: [], wooRefunded: 0, ...over };
}

// ─── Parser ──────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('maneja separador ;, comillas con "" y JSON con ; adentro, CRLF y LF', () => {
    const rows = parseCsv('A;B;C\r\n1;"x;y";"[{""k"":""v""}]"\n2;;""\n', ';');
    expect(rows).toEqual([['A', 'B', 'C'], ['1', 'x;y', '[{"k":"v"}]'], ['2', '', '']]);
  });
  it('ignora BOM y la última línea vacía', () => {
    expect(parseCsv('﻿A;B\n1;2\n\n', ';')).toEqual([['A', 'B'], ['1', '2']]);
  });
});

describe('parseReportNumber', () => {
  it('acepta punto decimal y negativos; vacío es 0; cualquier otra cosa es error', () => {
    expect(parseReportNumber('-9975.57')).toBe(-9975.57);
    expect(parseReportNumber('')).toBe(0);
    expect(parseReportNumber('1,234.56')).toBeNull();
    expect(parseReportNumber('abc')).toBeNull();
  });
});

describe('validateHeader', () => {
  it('detecta columnas faltantes', () => {
    expect(validateHeader('release_report', REL_HEADER.split(';')).ok).toBe(true);
    const r = validateHeader('release_report', ['DATE', 'SOURCE_ID']);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('NET_CREDIT_AMOUNT');
  });
  it('un header inesperado no produce movimientos y queda como error', () => {
    const p = normalizeReleaseReport('FOO;BAR\n1;2\n', 'x.csv');
    expect(p.movements).toHaveLength(0);
    expect(p.errors[0].reason).toMatch(/^header_missing:/);
  });
});

describe('clasificación', () => {
  it('payment con crédito es venta, con débito es pago nuestro; refund según signo', () => {
    expect(classifyRelease('payment', 100, 0)).toBe('payment');
    expect(classifyRelease('payment', 0, 100)).toBe('payment_out');
    expect(classifyRelease('refund', 0, 100)).toBe('refund');
    expect(classifyRelease('refund', 100, 0)).toBe('refund_in');
    expect(classifyRelease('chargeback', 0, 1)).toBe('chargeback');
    expect(classifyRelease('mediation', 0, 1)).toBe('dispute');
    expect(classifyRelease('tax_withdholding', 0, 1)).toBe('tax_operation');
    expect(classifyRelease('tax_payment_iibb', 0, 1)).toBe('tax_monthly');
    expect(classifyRelease('reserve_for_payment', 0, 1)).toBe('reserve');
    expect(classifyRelease('payouts_cash', 0, 1)).toBe('payout');
    expect(classifyRelease('fee_release_in_advance', 0, 1)).toBe('fee');
    expect(classifyRelease('asset_management', 1, 0)).toBe('adjustment');
    expect(classifyRelease('algo_nuevo', 1, 0)).toBe('other');
    expect(classifySettlement('SETTLEMENT', 10)).toBe('payment');
    expect(classifySettlement('SETTLEMENT', -10)).toBe('payment_out');
    expect(classifySettlement('PAYOUTS', -10)).toBe('payout');
  });
  it('sólo un entero corto es un pedido de Woo', () => {
    expect(orderIdFromExternalReference('2999')).toBe(2999);
    expect(orderIdFromExternalReference('2000014303697873')).toBeNull();
    expect(orderIdFromExternalReference('698a6168-ff09')).toBeNull();
    expect(orderIdFromExternalReference('')).toBeNull();
  });
});

describe('normalizeReleaseReport', () => {
  const p = normalizeReleaseReport(REL_CSV, 'rel.csv');
  it('separa saldos de movimientos y clasifica cada fila real', () => {
    expect(p.balances).toEqual({ initial: 132201.79, total: 277763.78 });
    expect(p.errors).toHaveLength(0);
    expect(p.movements.map((m) => m.kind)).toEqual(['payment', 'payment_out', 'refund_in', 'refund', 'reserve', 'reserve', 'payout', 'tax_monthly', 'adjustment', 'chargeback', 'dispute', 'payment']);
  });
  it('la venta 2999 queda neta con fees, financiación y SIRTAC de la misma fila', () => {
    const sale = p.movements[0];
    expect(sale).toMatchObject({ paymentId: '175662774659', orderId: 2999, grossAmount: 131085.03, feeAmount: -9975.57, financingAmount: -16638.49, taxAmount: -3932.55, credit: 100538.42, debit: 0, netAmount: 100538.42, releaseDate: '2026-08-31T22:39:50.000-03:00' });
    expect((sale.rawMetadata as any).taxesDisaggregated[0].financial_entity).toBe('tierra_del_fuego');
  });
  it('el pago a proveedor y su devolución no se atan a ningún pedido', () => {
    expect(p.movements[1].orderId).toBeNull();
    expect(p.movements[2].orderId).toBeNull();
  });
  it('la venta sin external_reference queda como payment sin pedido', () => {
    const last = p.movements[p.movements.length - 1];
    expect(last.kind).toBe('payment');
    expect(last.orderId).toBeNull();
  });
  it('unique keys estables entre corridas y distintas entre el par de reservas', () => {
    const again = normalizeReleaseReport(REL_CSV, 'rel-regenerado.csv');
    expect(again.movements.map((m) => m.uniqueKey)).toEqual(p.movements.map((m) => m.uniqueKey));
    expect(p.movements[4].uniqueKey).not.toBe(p.movements[5].uniqueKey);
    expect(new Set(p.movements.map((m) => m.uniqueKey)).size).toBe(p.movements.length);
  });
  it('una fila duplicada exacta dentro del archivo recibe sufijo, no se pierde', () => {
    const dup = [REL_HEADER, REL_ROWS[1], REL_ROWS[1]].join('\n');
    const d = normalizeReleaseReport(dup, 'dup.csv');
    expect(d.movements).toHaveLength(2);
    expect(d.movements[1].uniqueKey).toBe(`${d.movements[0].uniqueKey}#2`);
  });
  it('un monto ilegible descarta la fila y lo informa', () => {
    const bad = [REL_HEADER, REL_ROWS[1].replace('100538.42', '100.538,42')].join('\n');
    const b = normalizeReleaseReport(bad, 'bad.csv');
    expect(b.movements).toHaveLength(0);
    expect(b.errors).toEqual([{ line: 2, reason: 'malformed_amount' }]);
  });
  it('un RECORD_TYPE desconocido no se inventa como movimiento', () => {
    const x = [REL_HEADER, REL_ROWS[1].replace(';release;', ';misterio;')].join('\n');
    const b = normalizeReleaseReport(x, 'x.csv');
    expect(b.movements).toHaveLength(0);
    expect(b.errors[0].reason).toBe('unknown_record_type:misterio');
  });
});

describe('normalizeSettlementReport', () => {
  const p = normalizeSettlementReport(SET_CSV, 'set.csv');
  it('parsea operaciones, liberación pendiente y retiros', () => {
    expect(p.errors).toHaveLength(0);
    expect(p.movements.map((m) => m.kind)).toEqual(['payment', 'payment', 'payout']);
    expect(p.movements[0]).toMatchObject({ orderId: 2999, paymentId: '175662774659', netAmount: 100538.42, credit: 100538.42, releaseDate: '2026-08-31T22:39:50.000-03:00' });
    expect((p.movements[1].rawMetadata as any).isReleased).toBe(false);
    expect(p.movements[2]).toMatchObject({ debit: 150000, credit: 0, netAmount: -150000 });
  });
});

// ─── Conciliación ────────────────────────────────────────────────────────────

describe('reconcileMovement', () => {
  const rel = normalizeReleaseReport(REL_CSV, 'rel.csv');
  const sale = rel.movements[0];
  const saleRefund = rel.movements[3];

  it('payment match por SOURCE_ID + external_reference con snapshot igual → CONCILIADO', () => {
    const r = reconcileMovement(sale, new Map([[2999, order(2999)]]));
    expect(r.status).toBe('CONCILIADO');
    expect(r.delta).toBe(0);
    expect(snapshotNetBeforeRefunds(snap())).toBe(100538.42);
  });
  it('SOURCE_ID distinto al transaction_id del pedido → DIFERENCIA de identidad', () => {
    const r = reconcileMovement(sale, new Map([[2999, order(2999, { transactionId: '999' })]]));
    expect(r.status).toBe('DIFERENCIA');
    expect(r.note).toContain('SOURCE_ID');
  });
  it('pedido inexistente → SIN_PEDIDO; sin external_reference → SIN_PEDIDO', () => {
    expect(reconcileMovement(sale, new Map()).status).toBe('SIN_PEDIDO');
    const cvu = rel.movements[rel.movements.length - 1];
    const r = reconcileMovement(cvu, new Map());
    expect(r.status).toBe('SIN_PEDIDO');
    expect(r.note).toContain('sin external_reference');
  });
  it('pedido sin snapshot → PENDIENTE', () => {
    expect(reconcileMovement(sale, new Map([[2999, order(2999, { snapshot: null })]])).status).toBe('PENDIENTE');
  });
  it('neto distinto → DIFERENCIA con delta y componentes; nunca se corrige solo', () => {
    const r = reconcileMovement(sale, new Map([[2999, order(2999, { snapshot: snap({ feeFinancing: 16000 }) })]]));
    expect(r.status).toBe('DIFERENCIA');
    expect(r.delta).toBe(-638.49);
    expect(r.note).toContain('financiación');
  });
  it('refund de venta registrado en _hs_refunds → REFUND; sin registro → REFUND_SIN_REGISTRO', () => {
    const registered = order(2999, { hsRefunds: [{ mpRefundId: 'r1', paymentId: '175662774659', amount: 10000, type: 'partial', at: '', actor: 'x', idempotencyKey: 'k', wcRefundId: 5, status: 'completed', origin: 'admin' }] });
    expect(reconcileMovement(saleRefund, new Map([[2999, registered]])).status).toBe('REFUND');
    const r = reconcileMovement(saleRefund, new Map([[2999, order(2999)]]));
    expect(r.status).toBe('REFUND_SIN_REGISTRO');
  });
  it('chargeback y disputa se etiquetan y quedan atados al pedido', () => {
    const cb = rel.movements[9], dp = rel.movements[10];
    expect(reconcileMovement(cb, new Map([[2950, order(2950)]]))).toMatchObject({ status: 'CHARGEBACK', orderId: 2950 });
    expect(reconcileMovement(dp, new Map())).toMatchObject({ status: 'DISPUTA', note: 'sin pedido' });
  });
  it('percepción mensual, payout, reservas, rendimiento y pagos nuestros → AJUSTE (sin pedido)', () => {
    for (const i of [1, 2, 4, 5, 6, 7, 8]) expect(reconcileMovement(rel.movements[i], new Map()).status).toBe('AJUSTE');
  });
  it('settlement con IS_RELEASED=false → LIQUIDACION_PENDIENTE', () => {
    const s = normalizeSettlementReport(SET_CSV, 'set.csv');
    const r = reconcileMovement(s.movements[1], new Map([[2998, order(2998, { transactionId: '175661367533' })]]));
    expect(r.status).toBe('LIQUIDACION_PENDIENTE');
  });
});

describe('computeKpis', () => {
  it('suma ventas, neto conciliado, no asociados y cobertura sin doble contabilizar', () => {
    const rel = normalizeReleaseReport(REL_CSV, 'rel.csv');
    const orders = new Map([[2999, order(2999)], [2950, order(2950)], [2951, order(2951)]]);
    const results = new Map(reconcileAll(rel.movements, orders).map((r) => [r.uniqueKey, r]));
    const k = computeKpis(rel.movements, results, orders, 1);
    // 2 ventas en el reporte: una con pedido (2999) y una sin pedido (CVU).
    expect(k.payments).toBe(1);
    expect(k.salesNoOrder).toBe(1);
    expect(k.grossSales).toBe(151085.03);
    expect(k.netPaymentApi).toBe(100538.42);
    // conciliado: la venta 2999 (100538.42) menos su refund (10000) y menos contracargo (50000) y disputa (30000)
    expect(k.netReconciled).toBe(10538.42);
    expect(k.counts.CONCILIADO).toBe(1);
    expect(k.counts.SIN_PEDIDO).toBe(1);
    expect(k.counts.REFUND_SIN_REGISTRO).toBe(1);
    // la cobertura se mide sobre las ventas con pedido: 1/1
    expect(k.coverageCount).toBe(100);
    expect(k.unlinkedByKind.payout.debit).toBe(401599);
    expect(k.unlinkedByKind.reserve.net).toBe(0);
    expect(k.unlinkedByKind.tax_monthly.debit).toBe(5000);
    // la venta sin pedido entra como movimiento sin pedido, no como diferencia
    expect(k.unlinkedByKind.payment).toEqual({ count: 1, credit: 20000, debit: 0, net: 20000 });
    expect(k.unlinkedNet).toBe(-401599 - 5000 + 132.35 - 46281.87 + 46281.87 + 20000);
    expect(k.pendingDifference).toBe(10000);
    expect(k.missingPayments).toBe(1);
  });
});

describe('períodos en hora Argentina', () => {
  it('el mes va de las 03:00Z del día 1 a las 03:00Z del siguiente', () => {
    expect(monthRangeAr('2026-09')).toEqual({ from: '2026-09-01T03:00:00.000Z', to: '2026-10-01T03:00:00.000Z' });
    expect(monthRangeAr('2026-13')).toBeNull();
    expect(monthRangeForMp('2026-08')).toEqual({ begin: '2026-08-01T03:00:00Z', end: '2026-09-01T02:59:59Z' });
  });
  it('un pago aprobado en agosto y liberado en septiembre pertenece a septiembre por fecha de liberación', () => {
    const rel = normalizeReleaseReport(REL_CSV, 'rel.csv');
    const refundSep = rel.movements[3];
    const sep = monthRangeAr('2026-09')!;
    const t = Date.parse(refundSep.releaseDate!);
    expect(t >= Date.parse(sep.from) && t < Date.parse(sep.to)).toBe(true);
    expect(Date.parse(refundSep.approvalDate!) < Date.parse(sep.from)).toBe(true);
  });
});

// ─── Sync con dependencias falsas ────────────────────────────────────────────

function fakeStore(initialFiles: any[] = []) {
  const files = new Map<string, any>(initialFiles.map((f) => [f.file_name, f]));
  const movements = new Map<string, any>();
  const runs: any[] = [];
  const store: SyncDeps['store'] = {
    listFiles: async () => ({ ok: true, status: 200, body: { files: [...files.values()] }, error: null }),
    getFile: async (name, raw) => files.has(name) ? { ok: true, status: 200, body: { file: raw ? files.get(name) : { ...files.get(name), raw: undefined } }, error: null } : { ok: false, status: 404, body: null, error: 'not_found' },
    upsertFile: async (f) => { const prev = files.get(f.fileName) || {}; files.set(f.fileName, { ...prev, file_name: f.fileName, report_kind: f.reportKind, status: f.status, sha256: f.sha256 ?? prev.sha256, raw: f.raw ?? prev.raw, begin_date: f.beginDate ?? prev.begin_date, end_date: f.endDate ?? prev.end_date }); return { ok: true, status: 200, body: { ok: true, id: 1, created: !prev.file_name }, error: null }; },
    listMovements: async () => ({ ok: true, status: 200, body: { movements: [] }, error: null }),
    upsertMovements: async (list) => { let inserted = 0, updated = 0; for (const m of list) { if (movements.has(m.uniqueKey)) updated++; else inserted++; movements.set(m.uniqueKey, m); } return { ok: true, inserted, updated, errors: [] }; },
    setStatuses: async (s) => { for (const x of s) { const m = movements.get(x.uniqueKey); if (m) m.reconciliationStatus = x.status; } return { ok: true, updated: s.length, errors: [] }; },
    listRuns: async () => ({ ok: true, status: 200, body: { runs }, error: null }),
    insertRun: async (kind, summary) => { runs.push({ kind, summary }); return { ok: true, status: 201, body: { ok: true, id: runs.length }, error: null }; },
  };
  return { store, files, movements, runs };
}

function fakeClient(entries: { kind: 'release_report' | 'settlement_report'; fileName: string | null; text?: string; begin: string }[]) {
  const download = vi.fn(async (_k: any, name: string) => {
    const e = entries.find((x) => x.fileName === name);
    return e?.text !== undefined ? { ok: true, status: 200, text: e.text } : { ok: false, status: 404, text: '' };
  });
  return {
    client: {
      getConfig: async () => ({ status: 200, body: {} }), putConfig: async () => ({ status: 200, body: {} }), schedule: async () => ({ status: 201, body: {} }),
      create: async () => ({ ok: true, status: 202, body: {} }),
      list: async (kind: any) => entries.filter((e) => e.kind === kind).map((e, i) => ({ id: i, beginDate: e.begin, endDate: e.begin, fileName: e.fileName, status: e.fileName ? 'enabled' : 'pending', createdFrom: 'manual', dateCreated: null })),
      download,
    },
    download,
  };
}

const NOW = new Date('2026-09-15T10:00:00.000Z');
function deps(store: SyncDeps['store'], orders: Map<number, OrderForRecon>): SyncDeps & { settlementWrites: any[] } {
  const settlementWrites: any[] = [];
  return { store, loadOrders: async () => orders, writeSettlementMeta: async (id, v) => { settlementWrites.push({ id, v }); return true; }, now: () => NOW, settlementWrites };
}

describe('syncReports', () => {
  it('baja lo nuevo, persiste, concilia, marca sources.settlement y loguea la corrida; lo pending se cuenta', async () => {
    const s = fakeStore();
    const { client, download } = fakeClient([
      { kind: 'release_report', fileName: 'rel-aug.csv', text: REL_CSV, begin: '2026-08-01T03:00:00Z' },
      { kind: 'release_report', fileName: null, begin: '2026-09-01T03:00:00Z' },
      { kind: 'settlement_report', fileName: 'set-aug.csv', text: SET_CSV, begin: '2026-08-01T03:00:00Z' },
    ]);
    const d = deps(s.store, new Map([[2999, order(2999)], [2998, order(2998, { transactionId: '175661367533' })]]));
    const sum = await syncReports(client as any, { runKind: 'manual' }, d);
    expect(sum.filesFound).toBe(3);
    expect(sum.filesDownloaded).toBe(2);
    expect(sum.filesPending).toBe(1);
    expect(sum.rowsParsed).toBe(REL_ROWS.length + SET_ROWS.length);
    expect(s.movements.size).toBe(12 + 3);
    expect(sum.matched).toBe(2);
    expect(sum.refundsUnregistered).toBe(1);
    expect(sum.chargebacks).toBe(1);
    expect(sum.disputes).toBe(1);
    expect(sum.pendingRelease).toBe(1);
    expect(sum.errors).toEqual([]);
    expect(d.settlementWrites).toHaveLength(1);
    expect(d.settlementWrites[0]).toMatchObject({ id: 2999, v: { status: 'CONCILIADO', net: 100538.42, fileName: 'rel-aug.csv' } });
    expect(s.runs).toHaveLength(1);
    expect(s.files.get('rel-aug.csv').status).toBe('processed');
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('el mismo archivo otra vez no se baja ni duplica movimientos (duplicate file)', async () => {
    const s = fakeStore();
    const { client, download } = fakeClient([{ kind: 'release_report', fileName: 'rel-aug.csv', text: REL_CSV, begin: '2026-08-01T03:00:00Z' }]);
    const d = deps(s.store, new Map());
    await syncReports(client as any, { runKind: 'manual' }, d);
    const second = await syncReports(client as any, { runKind: 'cron' }, d);
    expect(second.filesSkipped).toBe(1);
    expect(second.filesDownloaded).toBe(0);
    expect(download).toHaveBeenCalledTimes(1);
    expect(s.movements.size).toBe(12);
  });

  it('reprocesar desde el CSV guardado actualiza en vez de insertar (duplicate row / reprocess)', async () => {
    const s = fakeStore();
    const { client } = fakeClient([{ kind: 'release_report', fileName: 'rel-aug.csv', text: REL_CSV, begin: '2026-08-01T03:00:00Z' }]);
    const d = deps(s.store, new Map([[2999, order(2999)]]));
    await syncReports(client as any, { runKind: 'manual' }, d);
    const sum = await reprocessFile('rel-aug.csv', d);
    expect(sum.errors).toEqual([]);
    expect(sum.movementsUpserted).toBe(12);
    expect(s.movements.size).toBe(12);
    expect(s.runs.map((r) => r.kind)).toEqual(['manual', 'reprocess']);
  });

  it('header inesperado deja el archivo en error y no persiste movimientos', async () => {
    const s = fakeStore();
    const { client } = fakeClient([{ kind: 'release_report', fileName: 'weird.csv', text: 'FOO;BAR\n1;2\n', begin: '2026-08-01T03:00:00Z' }]);
    const sum = await syncReports(client as any, { runKind: 'manual' }, deps(s.store, new Map()));
    expect(s.files.get('weird.csv').status).toBe('error');
    expect(s.movements.size).toBe(0);
    expect(sum.errors.some((e) => e.includes('header_missing'))).toBe(true);
  });

  it('sin backend (404 en el ledger) no simula nada', async () => {
    const s = fakeStore();
    s.store.listFiles = async () => ({ ok: false, status: 404, body: null, error: 'rest_no_route' });
    const { client, download } = fakeClient([{ kind: 'release_report', fileName: 'rel-aug.csv', text: REL_CSV, begin: '2026-08-01T03:00:00Z' }]);
    const sum = await syncReports(client as any, {}, deps(s.store, new Map()));
    expect(sum.backendMissing).toBe(true);
    expect(download).not.toHaveBeenCalled();
    expect(emptySummary('cron', NOW).filesFound).toBe(0);
  });
});
