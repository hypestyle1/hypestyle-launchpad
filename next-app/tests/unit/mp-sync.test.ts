import { describe, it, expect, vi, beforeEach } from 'vitest';

const wcPut = vi.fn(async () => true);
vi.mock('@/lib/wc-admin', () => ({
  wcGet: vi.fn(async () => null),
  wcPut: (...a: any[]) => (wcPut as any)(...a),
  wcConfigured: () => true,
}));

import {
  decideSync, toCandidate, isUnstable, pickPaymentFromSearch, runMpSync, mpClient, DEFAULT_POLICY,
  type CandidateOrder, type MpClient,
} from '@/lib/finance/mp-sync';
import { normalizeMpPayment } from '@/lib/finance/gateway-snapshot';

const NOW = new Date('2026-09-10T15:00:00.000Z');
const policy = { ...DEFAULT_POLICY, force: false, now: NOW };

function payment(id: string, over: Record<string, any> = {}): any {
  return {
    id, status: 'approved', status_detail: 'accredited', currency_id: 'ARS', external_reference: over.external_reference ?? '1',
    payment_method_id: 'visa', payment_type_id: 'credit_card', installments: 1,
    date_approved: '2026-09-01T10:00:00.000-04:00', money_release_date: '2026-09-01T10:00:00.000-04:00', money_release_status: 'released',
    transaction_amount: 1000, transaction_details: { net_received_amount: 937.1 },
    charges_details: [{ id: `${id}-001`, name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 62.9, refunded: 0 } }],
    fee_details: [{ type: 'mercadopago_fee', amount: 62.9, fee_payer: 'collector' }],
    ...over,
  };
}

function snapV2(over: Record<string, any> = {}) {
  const s = normalizeMpPayment(payment('9'), { provider: 'mercadopago_card', syncedAt: '2026-09-09T12:00:00.000Z' })!;
  return { ...s, ...over };
}

function order(over: Partial<CandidateOrder> = {}): CandidateOrder {
  return {
    id: 1, number: '1', status: 'processing', paymentMethod: 'tarjeta', transactionId: '9',
    datePaidGmt: '2026-09-01T14:00:00', dateModifiedGmt: '2026-09-01T14:00:00', total: 1000,
    snapshot: null, syncStatus: null, ...over,
  };
}

describe('decideSync — política de resync', () => {
  it('no MP / no cobrado → skip', () => {
    expect(decideSync(order({ paymentMethod: 'talo-pay-cvu-woo' }), policy)).toEqual({ sync: false, reason: 'not_mp' });
    expect(decideSync(order({ status: 'pending' }), policy)).toEqual({ sync: false, reason: 'not_paid' });
  });
  it('efectivo (MP) y enviado / refunded cuentan como MP cobrado', () => {
    expect(decideSync(order({ paymentMethod: 'efectivo' }), policy).sync).toBe(true);
    expect(decideSync(order({ status: 'enviado' }), policy).sync).toBe(true);
    expect(decideSync(order({ status: 'refunded' }), policy).sync).toBe(true);
  });
  it('sin snapshot → sync', () => {
    expect(decideSync(order(), policy)).toEqual({ sync: true, reason: 'no_snapshot' });
  });
  it('snapshot v1 → upgrade una vez', () => {
    const v1: any = { provider: 'mercadopago_card', transactionId: '9', grossAmount: 1000, gatewayFee: 62.9, netReceived: 937.1, breakdown: [], otherCashDeduction: 0, currency: 'ARS', syncedAt: '2026-08-01T00:00:00.000Z', source: 'exact' };
    expect(decideSync(order({ snapshot: v1 }), policy)).toEqual({ sync: true, reason: 'v1_upgrade' });
  });
  it('force → siempre', () => {
    expect(decideSync(order({ snapshot: snapV2() }), { ...policy, force: true })).toEqual({ sync: true, reason: 'force' });
  });
  it('último intento falló: reintenta sólo si pasó minAgeHours', () => {
    const recent = { at: '2026-09-10T10:00:00.000Z', ok: false, provider: 'mercadopago_card' as const, paymentId: '9', error: 'mp_500', resolvedBy: 'transaction_id' as const };
    expect(decideSync(order({ syncStatus: recent }), policy)).toEqual({ sync: false, reason: 'fresh' });
    const old = { ...recent, at: '2026-09-08T10:00:00.000Z' };
    expect(decideSync(order({ syncStatus: old }), policy)).toEqual({ sync: true, reason: 'retry_failed' });
  });
  it('pedido modificado en Woo después del sync → resync', () => {
    const o = order({ snapshot: snapV2({ syncedAt: '2026-09-09T12:00:00.000Z' }), dateModifiedGmt: '2026-09-09T18:00:00' });
    expect(decideSync(o, policy)).toEqual({ sync: true, reason: 'order_modified' });
  });
  it('inestable (no liberado / no aprobado / discrepancy) → resync diario', () => {
    expect(isUnstable(snapV2({ moneyReleaseStatus: 'pending' }))).toBe(true);
    expect(isUnstable(snapV2({ status: 'in_process' }))).toBe(true);
    expect(isUnstable(snapV2({ discrepancy: { reportedNet: 1, calculatedNet: 2, delta: -1, notes: [] } }))).toBe(true);
    expect(isUnstable(snapV2())).toBe(false);
    const fresh = order({ snapshot: snapV2({ moneyReleaseStatus: 'pending', syncedAt: '2026-09-10T10:00:00.000Z' }) });
    expect(decideSync(fresh, policy)).toEqual({ sync: false, reason: 'fresh' });
    const old = order({ snapshot: snapV2({ moneyReleaseStatus: 'pending', syncedAt: '2026-09-09T10:00:00.000Z' }) });
    expect(decideSync(old, policy)).toEqual({ sync: true, reason: 'unstable' });
  });
  it('estable y reciente → re-verificación semanal; estable y viejo → nunca', () => {
    const recentFresh = order({ snapshot: snapV2({ syncedAt: '2026-09-08T12:00:00.000Z' }), datePaidGmt: '2026-09-01T14:00:00' });
    expect(decideSync(recentFresh, policy)).toEqual({ sync: false, reason: 'fresh' });
    const recentStale = order({ snapshot: snapV2({ syncedAt: '2026-09-01T15:00:00.000Z' }), datePaidGmt: '2026-09-01T14:00:00' });
    expect(decideSync(recentStale, policy)).toEqual({ sync: true, reason: 'recent_recheck' });
    const oldStable = order({ snapshot: snapV2({ syncedAt: '2026-06-01T12:00:00.000Z' }), datePaidGmt: '2026-05-20T14:00:00', dateModifiedGmt: '2026-05-20T14:00:00' });
    expect(decideSync(oldStable, policy)).toEqual({ sync: false, reason: 'stable' });
  });
});

describe('toCandidate / pickPaymentFromSearch', () => {
  it('lee snapshot y estado de sync de la meta', () => {
    const c = toCandidate({
      id: 5, number: '5', status: 'processing', payment_method: 'mercadopago', transaction_id: '77', total: '100.00',
      meta_data: [
        { key: '_hs_gateway_fee', value: JSON.stringify(snapV2()) },
        { key: '_hs_gateway_fee_sync', value: JSON.stringify({ at: 'x', ok: true }) },
      ],
    });
    expect(c.transactionId).toBe('77');
    expect(c.snapshot).not.toBeNull();
    expect(c.syncStatus?.ok).toBe(true);
    expect(c.total).toBe(100);
  });
  it('transaction_id vacío → null', () => {
    expect(toCandidate({ id: 1, transaction_id: '' }).transactionId).toBeNull();
  });
  it('elige el pago aprobado más reciente', () => {
    const r = [
      { id: 1, status: 'rejected', date_created: '2026-09-01T00:00:00Z' },
      { id: 2, status: 'approved', date_created: '2026-09-02T00:00:00Z' },
      { id: 3, status: 'approved', date_created: '2026-09-03T00:00:00Z' },
    ];
    expect(pickPaymentFromSearch(r).id).toBe(3);
    expect(pickPaymentFromSearch([r[0]]).id).toBe(1);
    expect(pickPaymentFromSearch([])).toBeNull();
  });
});

function fakeClient(map: Record<string, any>, search: Record<string, any[]> = {}): MpClient {
  return {
    async getPayment(id) {
      if (map[id] instanceof Error) return { ok: false, status: 500, error: map[id].message };
      return map[id] ? { ok: true, payment: map[id] } : { ok: false, status: 404, error: 'not_found' };
    },
    async searchByExternalReference(ref) { return search[ref] || []; },
  };
}

describe('runMpSync', () => {
  beforeEach(() => { wcPut.mockClear(); });

  it('dryRun consulta MP, arma reporte y NO escribe', async () => {
    const client = fakeClient({ '9': payment('9') });
    const r = await runMpSync([order()], client, { dryRun: true, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.wouldWrite).toBe(1);
    expect(r.synced).toBe(0);
    expect(wcPut).not.toHaveBeenCalled();
    expect(r.summary.exactSuccess).toBe(1);
    expect(r.summary.feesFound).toBe(1);
    expect(r.summary.financingFound).toBe(0);
    expect(r.summary.netValuesFound).toBe(1);
    expect(r.samples[0].netCashReceived).toBe(937.1);
    expect(r.samples[0].reason).toBe('no_snapshot');
  });

  it('escribe snapshot + estado en una sola PUT por pedido; idempotente', async () => {
    const client = fakeClient({ '9': payment('9') });
    const r = await runMpSync([order()], client, { dryRun: false, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.synced).toBe(1);
    expect(wcPut).toHaveBeenCalledTimes(1);
    const body = (wcPut.mock.calls[0] as any)[1];
    const keys = body.meta_data.map((m: any) => m.key);
    expect(keys).toEqual(['_hs_gateway_fee', '_hs_gateway_fee_sync']);
    const snap = JSON.parse(body.meta_data[0].value);
    expect(snap.version).toBe(2);
    expect(snap.netCashReceived).toBe(937.1);
    const st = JSON.parse(body.meta_data[1].value);
    expect(st).toMatchObject({ ok: true, paymentId: '9', resolvedBy: 'transaction_id', error: null });

    // Segunda corrida con el snapshot ya escrito y estable → no vuelve a MP.
    const again = await runMpSync([order({ snapshot: snap })], client, { dryRun: false, force: false, limit: 10, samples: 5, now: new Date('2026-09-10T16:00:00.000Z') });
    expect(again.summary.selected).toBe(0);
    expect(again.summary.skipped.fresh).toBe(1);
    expect(wcPut).toHaveBeenCalledTimes(1);
  });

  it('sin transaction_id resuelve por external_reference', async () => {
    const client = fakeClient({}, { '1': [payment('55', { external_reference: '1' })] });
    const r = await runMpSync([order({ transactionId: null })], client, { dryRun: true, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.summary.resolvedByExternalReference).toBe(1);
    expect(r.samples[0].paymentId).toBe('55');
    expect(r.samples[0].resolvedBy).toBe('external_reference');
  });

  it('sin transaction_id y sin match → missingPaymentId, deja rastro de fallo sin pisar snapshot', async () => {
    const client = fakeClient({});
    const r = await runMpSync([order({ transactionId: null })], client, { dryRun: false, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.summary.missingPaymentId).toBe(1);
    expect(r.failed[0].reason).toContain('missing_payment_id');
    expect(wcPut).toHaveBeenCalledTimes(1);
    const body = (wcPut.mock.calls[0] as any)[1];
    expect(body.meta_data.map((m: any) => m.key)).toEqual(['_hs_gateway_fee_sync']);
    expect(JSON.parse(body.meta_data[0].value)).toMatchObject({ ok: false, error: 'missing_payment_id' });
  });

  it('error de API cuenta como apiError y no escribe snapshot', async () => {
    const client = fakeClient({ '9': new Error('boom') });
    const r = await runMpSync([order()], client, { dryRun: false, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.summary.apiErrors).toBe(1);
    expect(r.synced).toBe(0);
    expect(r.failed[0]).toEqual({ order: 1, reason: 'mp_500:boom' });
  });

  it('external_reference distinto del pedido → warning en el snapshot', async () => {
    const client = fakeClient({ '9': payment('9', { external_reference: '999' }) });
    const r = await runMpSync([order()], client, { dryRun: true, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.samples[0].warnings).toContain('external_reference_mismatch:999');
  });

  it('discrepancy y retenciones se cuentan en el resumen', async () => {
    const p = payment('9', {
      charges_details: [
        { id: '9-001', name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector' }, amounts: { original: 62.9, refunded: 0 } },
        { id: '9-002', name: 'tax_withholding_sirtac_noinsc-buenos_aires', type: 'tax', accounts: { from: 'collector' }, amounts: { original: 30, refunded: 0 } },
      ],
      transaction_details: { net_received_amount: 900 }, // calculado = 907.1 → discrepancy
    });
    const r = await runMpSync([order()], fakeClient({ '9': p }), { dryRun: true, force: false, limit: 10, samples: 5, now: NOW });
    expect(r.summary.taxWithholdingsFound).toBe(1);
    expect(r.summary.discrepancies).toBe(1);
    expect(r.samples[0].discrepancyDelta).toBe(-7.1);
  });

  it('limit prioriza los pagados más recientes', async () => {
    const os = [order({ id: 1, datePaidGmt: '2026-09-01T00:00:00' }), order({ id: 2, transactionId: '10', datePaidGmt: '2026-09-05T00:00:00' })];
    const r = await runMpSync(os, fakeClient({ '9': payment('9'), '10': payment('10') }), { dryRun: true, force: false, limit: 1, samples: 5, now: NOW });
    expect(r.summary.selected).toBe(1);
    expect(r.samples[0].order).toBe(2);
    expect(r.summary.ordersAnalyzed).toBe(2);
  });
});

describe('mpClient — reintentos y rate limit', () => {
  it('reintenta en 429 respetando retry-after y devuelve el pago', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) return new Response('{"message":"rate"}', { status: 429, headers: { 'retry-after': '0' } });
      return new Response(JSON.stringify(payment('9')), { status: 200 });
    }) as unknown as typeof fetch;
    const c = mpClient('token', fetchImpl);
    const r = await c.getPayment('9');
    expect(r.ok).toBe(true);
    expect(calls).toBe(2);
  });
  it('404 no reintenta y devuelve error sin el token', async () => {
    let calls = 0;
    const fetchImpl = (async () => { calls += 1; return new Response('{"message":"Payment not found"}', { status: 404 }); }) as unknown as typeof fetch;
    const r = await mpClient('token', fetchImpl).getPayment('x');
    expect(r).toEqual({ ok: false, status: 404, error: 'Payment not found' });
    expect(calls).toBe(1);
  });
});
