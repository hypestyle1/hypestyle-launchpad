import { describe, it, expect, vi } from 'vitest';
import {
  executeRefund, repairWooRefund, detectExternalRefunds, validateRefundRequest, paymentRefundState, parseAmount,
  parseRefundsMeta, refundSummary, REFUNDS_META, REFUND_LOCK_META,
  type RefundDeps, type OrderLite, type HsRefundEntry,
} from '@/lib/finance/mp-refund';
import { normalizeMpPayment } from '@/lib/finance/gateway-snapshot';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const KEY = 'hs-refund-3147-0f1e2d3c-aaaa-bbbb-cccc-000000000001';

function mpPayment(over: Record<string, any> = {}): any {
  return {
    id: 177835956882, status: 'approved', status_detail: 'accredited', external_reference: '3147',
    transaction_amount: 95108.56, transaction_amount_refunded: 0, refunds: [],
    transaction_details: { net_received_amount: 72945.51 },
    charges_details: [
      { id: '177835956882-001', name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 7237.76, refunded: 0 } },
      { id: '177835956882-002', name: 'financing_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 12072.03, refunded: 0 } },
      { id: '177835956882-003', name: 'tax_withholding_sirtac_noinsc-buenos_aires', type: 'tax', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 2853.26, refunded: 0 } },
    ],
    ...over,
  };
}

interface Harness {
  deps: RefundDeps;
  meta: { key: string; value: unknown }[];
  mpCreate: ReturnType<typeof vi.fn>;
  wcCreate: ReturnType<typeof vi.fn>;
  notes: string[];
  audits: any[];
  sync: ReturnType<typeof vi.fn>;
  entries(): HsRefundEntry[];
}

function harness(opts: {
  payment?: any; order?: Partial<OrderLite>; meta?: { key: string; value: unknown }[];
  mpOk?: boolean; wooOk?: boolean; mpGetFails?: boolean;
} = {}): Harness {
  const meta = opts.meta ? [...opts.meta] : [];
  const payment = opts.payment ?? mpPayment();
  let wcIds = 900;
  const notes: string[] = [];
  const audits: any[] = [];
  const mpCreate = vi.fn(async (_pid: string, amount: number | null, key: string) => {
    if (opts.mpOk === false) return { ok: false as const, httpStatus: 400, error: 'Refund amount exceeds' };
    return { ok: true as const, httpStatus: 201, refund: { id: `r-${key.slice(-4)}`, amount: amount ?? payment.transaction_amount, status: 'approved', dateCreated: '2026-09-15T09:00:00.000-03:00' } };
  });
  const wcCreate = vi.fn(async () => (opts.wooOk === false ? { ok: false, id: null, error: 'woocommerce_rest_cannot_create' } : { ok: true, id: ++wcIds, error: null }));
  const sync = vi.fn(async () => undefined);
  const order = (): OrderLite => ({
    id: 3147, number: '3147', status: 'processing', paymentMethod: 'tarjeta', transactionId: '177835956882', total: 95108.56,
    customerName: 'Cliente Test', email: 'test@hypestyle.com.ar', meta, wooRefunds: [], ...(opts.order || {}),
  });
  const deps: RefundDeps = {
    getOrder: async () => order(),
    mp: {
      getPayment: async () => (opts.mpGetFails ? { ok: false as const, status: 500, error: 'boom' } : { ok: true as const, payment }),
      createRefund: mpCreate as any,
    },
    wc: {
      createRefund: wcCreate as any,
      writeMeta: async (_id, m) => { for (const x of m) { const i = meta.findIndex((y) => y.key === x.key); if (i === -1) meta.push({ ...x }); else meta[i] = { ...x }; } return true; },
      note: async (_id, text) => { notes.push(text); },
    },
    sync,
    audit: async (e) => { audits.push(e); },
    now: () => NOW,
  };
  return { deps, meta, mpCreate, wcCreate, notes, audits, sync, entries: () => parseRefundsMeta(meta) };
}

describe('parseAmount', () => {
  it('acepta formatos AR y EN', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('1234,5')).toBe(1234.5);
    expect(parseAmount('$ 95.108,56')).toBe(95108.56);
    expect(parseAmount(10.005)).toBe(10.01);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('validateRefundRequest', () => {
  const order: OrderLite = { id: 3147, number: '3147', status: 'processing', paymentMethod: 'tarjeta', transactionId: '177835956882', total: 95108.56, customerName: '', email: '', meta: [], wooRefunds: [] };
  it('rechaza pedidos que no son MP', () => {
    const r = validateRefundRequest({ orderId: 3147, order: { ...order, paymentMethod: 'talo-pay-cvu-woo' }, payment: paymentRefundState(mpPayment()), mode: 'full' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('not_mercadopago');
  });
  it('un parcial que agota lo disponible cuenta como total', () => {
    const r = validateRefundRequest({ orderId: 3147, order, payment: paymentRefundState(mpPayment()), mode: 'partial', amount: '95108,56' });
    expect(r).toEqual({ ok: true, amount: 95108.56, type: 'full' });
  });
});

describe('executeRefund', () => {
  it('1. full refund válido: MP sin amount, Woo con el monto, entrada completed, nota, audit y re-sync', async () => {
    const h = harness();
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'perfil #1 (owner)' });
    expect(r.ok).toBe(true);
    expect(h.mpCreate).toHaveBeenCalledTimes(1);
    expect(h.mpCreate.mock.calls[0][1]).toBeNull();
    expect(h.mpCreate.mock.calls[0][2]).toBe(KEY);
    expect(h.wcCreate).toHaveBeenCalledWith(3147, 95108.56, expect.stringContaining('Reembolso Mercado Pago r-0001'));
    const e = h.entries();
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ status: 'completed', type: 'full', amount: 95108.56, mpRefundId: 'r-0001', wcRefundId: 901, actor: 'perfil #1 (owner)', origin: 'admin', idempotencyKey: KEY });
    expect(h.notes[0]).toContain('Reembolso total');
    expect(h.audits.map((a) => a.action)).toEqual(['refund_created']);
    expect(h.sync).toHaveBeenCalledWith(3147);
    // el lock se libera
    expect(h.meta.find((m) => m.key === REFUND_LOCK_META)?.value).toBe('');
    if (r.ok) { expect(r.refunded).toBe(95108.56); expect(r.refundable).toBe(0); }
  });

  it('2. partial refund válido manda amount y queda type partial', async () => {
    const h = harness();
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: '10.000,00', idempotencyKey: KEY, actor: 'clave compartida' });
    expect(r.ok).toBe(true);
    expect(h.mpCreate.mock.calls[0][1]).toBe(10000);
    expect(h.wcCreate).toHaveBeenCalledWith(3147, 10000, expect.any(String));
    expect(h.entries()[0]).toMatchObject({ status: 'completed', type: 'partial', amount: 10000 });
    if (r.ok) { expect(r.refunded).toBe(10000); expect(r.refundable).toBe(85108.56); }
  });

  it('3. amount = 0 se rechaza sin tocar MP', async () => {
    const h = harness();
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 0, idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) { expect(r.code).toBe('amount_zero'); expect(r.httpStatus).toBe(400); }
    expect(h.mpCreate).not.toHaveBeenCalled();
    expect(h.entries()).toHaveLength(0);
  });

  it('4. amount > refundable se rechaza sin tocar MP', async () => {
    const h = harness();
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 95108.57, idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('amount_exceeds');
    expect(h.mpCreate).not.toHaveBeenCalled();
  });

  it('5. sin Payment ID no se hace nada', async () => {
    const h = harness({ order: { transactionId: null } });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('missing_payment_id');
    expect(h.mpCreate).not.toHaveBeenCalled();
  });

  it('6. external_reference de otro pedido se rechaza', async () => {
    const h = harness({ payment: mpPayment({ external_reference: '3146' }) });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) { expect(r.code).toBe('external_reference_mismatch'); expect(r.httpStatus).toBe(409); }
    expect(h.mpCreate).not.toHaveBeenCalled();
  });

  it('7. error de MP deja una entrada failed sin mpRefundId y no toca Woo', async () => {
    const h = harness({ mpOk: false });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) { expect(r.code).toBe('mp_refund_failed'); expect(r.message).toContain('Refund amount exceeds'); }
    expect(h.wcCreate).not.toHaveBeenCalled();
    expect(h.entries()[0]).toMatchObject({ status: 'failed', mpRefundId: null, wcRefundId: null, idempotencyKey: KEY });
    expect(h.audits[0].action).toBe('refund_failed');
    expect(h.meta.find((m) => m.key === REFUND_LOCK_META)?.value).toBe('');
  });

  it('8. doble request con la misma idempotency key: la segunda es replay y MP se llama una sola vez', async () => {
    const h = harness();
    const a = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    const b = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(a.ok && !a.replay).toBe(true);
    expect(b.ok && b.replay).toBe(true);
    expect(h.mpCreate).toHaveBeenCalledTimes(1);
    expect(h.wcCreate).toHaveBeenCalledTimes(1);
    expect(h.entries()).toHaveLength(1);
  });

  it('9. MP OK + Woo falla: queda mp_completed_woo_pending, error claro, reparable, MP una sola vez', async () => {
    const h = harness({ wooOk: false });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 5000, idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.code).toBe('woo_refund_failed');
      expect(r.message).toBe('El dinero fue reembolsado correctamente en Mercado Pago, pero falta registrar el refund en WooCommerce.');
      expect(r.repairable).toBe(true);
    }
    expect(h.mpCreate).toHaveBeenCalledTimes(1);
    expect(h.entries()[0]).toMatchObject({ status: 'mp_completed_woo_pending', mpRefundId: 'r-0001', wcRefundId: null, amount: 5000 });
    expect(h.entries()[0].error).toContain('woo:');
    expect(h.audits.map((a) => a.action)).toEqual(['refund_woo_pending']);
    expect(h.notes[0]).toContain('NO registrado en WooCommerce');
    // Reintentar con la misma key NO vuelve a llamar a MP: pide reparar.
    const again = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 5000, idempotencyKey: KEY, actor: 'x' });
    expect(again.ok).toBe(false); if (again.ok === false) { expect(again.code).toBe('woo_pending'); expect(again.repairable).toBe(true); }
    expect(h.mpCreate).toHaveBeenCalledTimes(1);
  });

  it('10. retry Woo después de MP OK: repairWooRefund sólo ejecuta Woo', async () => {
    const h = harness({ wooOk: false, payment: mpPayment({ transaction_amount_refunded: 5000, refunds: [{ id: 'r-0001', amount: 5000, status: 'approved', date_created: '2026-09-15T09:00:00.000-03:00' }] }) });
    await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 5000, idempotencyKey: KEY, actor: 'x' });
    expect(h.entries()[0].status).toBe('mp_completed_woo_pending');
    // Woo vuelve a funcionar
    h.wcCreate.mockImplementation(async () => ({ ok: true, id: 950, error: null }));
    const r = await repairWooRefund(h.deps, { orderId: 3147, mpRefundId: 'r-0001', actor: 'perfil #1 (owner)' });
    expect(r.ok).toBe(true);
    expect(h.mpCreate).toHaveBeenCalledTimes(1);
    expect(h.entries()).toHaveLength(1);
    expect(h.entries()[0]).toMatchObject({ status: 'completed', wcRefundId: 950, mpRefundId: 'r-0001', repairedAt: NOW.toISOString() });
    expect(h.audits.map((a) => a.action)).toEqual(['refund_woo_pending', 'refund_woo_repaired']);
    // Idempotente: reparar de nuevo no crea otro refund en Woo.
    const r2 = await repairWooRefund(h.deps, { orderId: 3147, mpRefundId: 'r-0001', actor: 'x' });
    expect(r2.ok && r2.alreadyDone).toBe(true);
    expect(h.wcCreate).toHaveBeenCalledTimes(2);
  });

  it('11. pedido parcialmente reembolsado: el total posterior es por lo que queda, con amount explícito', async () => {
    const h = harness({ payment: mpPayment({ transaction_amount_refunded: 300, refunds: [{ id: 'old', amount: 300, status: 'approved' }] }) });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(true);
    expect(h.mpCreate.mock.calls[0][1]).toBe(94808.56);
    expect(h.entries().find((e) => e.idempotencyKey === KEY)).toMatchObject({ amount: 94808.56, type: 'full' });
    // y un parcial mayor a lo que queda se rechaza
    const bad = await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 94900, idempotencyKey: KEY.replace(/1$/, '2'), actor: 'x' });
    expect(bad.ok).toBe(false); if (bad.ok === false) expect(bad.code).toBe('amount_exceeds');
  });

  it('12. pedido totalmente reembolsado: nada disponible', async () => {
    const h = harness({ payment: mpPayment({ status: 'refunded', transaction_amount_refunded: 95108.56 }) });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('nothing_refundable');
    expect(h.mpCreate).not.toHaveBeenCalled();
  });

  it('13. refund externo detectado: aparece como external / sin registro Woo con el monto de MP', () => {
    const state = paymentRefundState(mpPayment({ transaction_amount_refunded: 20000, refunds: [
      { id: 'ext-1', amount: 20000, status: 'approved', date_created: '2026-09-14T10:00:00.000-03:00' },
      { id: 'rej-1', amount: 5, status: 'rejected' },
    ] }))!;
    const known: HsRefundEntry[] = [];
    const ext = detectExternalRefunds(state, known, NOW.toISOString());
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({ mpRefundId: 'ext-1', amount: 20000, type: 'partial', origin: 'external', status: 'mp_completed_woo_pending', wcRefundId: null, at: '2026-09-14T10:00:00.000-03:00' });
    // Ya conocido → no se repite
    expect(detectExternalRefunds(state, ext, NOW.toISOString())).toHaveLength(0);
    const s = refundSummary(state, ext, 0);
    expect(s.unregistered).toBe(20000);
    expect(s.pendingWoo).toHaveLength(1);
  });

  it('14. dos operadores en simultáneo: el segundo choca con el lock y no toca MP', async () => {
    const lock = { key: 'hs-refund-3147-otro-operador-0001', at: new Date(NOW.getTime() - 30_000).toISOString(), amount: 1000, actor: 'perfil #2 (owner)' };
    const h = harness({ meta: [{ key: REFUND_LOCK_META, value: JSON.stringify(lock) }] });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'perfil #1 (owner)' });
    expect(r.ok).toBe(false); if (r.ok === false) { expect(r.code).toBe('refund_in_progress'); expect(r.httpStatus).toBe(409); }
    expect(h.mpCreate).not.toHaveBeenCalled();
    // Un lock viejo (proceso muerto) no bloquea.
    const stale = { ...lock, at: new Date(NOW.getTime() - 10 * 60_000).toISOString() };
    const h2 = harness({ meta: [{ key: REFUND_LOCK_META, value: JSON.stringify(stale) }] });
    const r2 = await executeRefund(h2.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r2.ok).toBe(true);
  });

  it('15. el snapshot se resincroniza y refleja el refund sin pisar la economía original', async () => {
    const h = harness();
    await executeRefund(h.deps, { orderId: 3147, mode: 'partial', amount: 10000, idempotencyKey: KEY, actor: 'x' });
    expect(h.sync).toHaveBeenCalledTimes(1);
    // Lo que el sync normaliza cuando MP ya refleja el refund (MP informa el neto
    // original sin descontar el refund, y devuelve parte de los cargos).
    const snap = normalizeMpPayment(mpPayment({
      transaction_amount_refunded: 10000,
      refunds: [{ id: 'r-0001', amount: 10000, status: 'approved' }],
      charges_details: [
        { id: '177835956882-001', name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 7237.76, refunded: 761 } },
        { id: '177835956882-002', name: 'financing_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 12072.03, refunded: 1269.3 } },
        { id: '177835956882-003', name: 'tax_withholding_sirtac_noinsc-buenos_aires', type: 'tax', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 2853.26, refunded: 0 } },
      ],
    }), { provider: 'mercadopago_card', syncedAt: NOW.toISOString() })!;
    expect(snap.gross).toBe(95108.56);
    expect(snap.feeGateway).toBe(7237.76);
    expect(snap.feeFinancing).toBe(12072.03);
    expect(snap.taxWithholdingTotal).toBe(2853.26);
    expect(snap.refunded).toBe(10000);
    expect(snap.adjustments).toBe(2030.3);
    expect(snap.netCashReceived).toBe(64975.81);
    expect(snap.calculatedNet).toBe(64975.81);
    expect(snap.discrepancy).toBeNull();
    expect(snap.warnings).toContain('net_reported_before_refunds:72945.51');
    expect(snap.charges.find((c) => c.name === 'mercadopago_fee')?.refunded).toBe(761);
  });

  it('rechaza una idempotency key que no es del pedido', async () => {
    const h = harness();
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: 'hs-refund-3146-abcdefgh', actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('bad_idempotency_key');
  });

  it('si MP no responde el pago no se hace nada', async () => {
    const h = harness({ mpGetFails: true });
    const r = await executeRefund(h.deps, { orderId: 3147, mode: 'full', idempotencyKey: KEY, actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('mp_get_failed');
    expect(h.mpCreate).not.toHaveBeenCalled();
  });
});

describe('repairWooRefund', () => {
  it('registra en Woo un refund externo que existe en MP, sin llamar a createRefund de MP', async () => {
    const h = harness({ payment: mpPayment({ transaction_amount_refunded: 20000, refunds: [{ id: 'ext-1', amount: 20000, status: 'approved', date_created: '2026-09-14T10:00:00.000-03:00' }] }) });
    const r = await repairWooRefund(h.deps, { orderId: 3147, mpRefundId: 'ext-1', actor: 'perfil #1 (owner)' });
    expect(r.ok).toBe(true);
    expect(h.mpCreate).not.toHaveBeenCalled();
    expect(h.wcCreate).toHaveBeenCalledWith(3147, 20000, expect.stringContaining('ext-1'));
    expect(h.entries()[0]).toMatchObject({ origin: 'external', status: 'completed', wcRefundId: 901, amount: 20000, mpRefundId: 'ext-1' });
    expect(h.audits[0].action).toBe('refund_woo_repaired');
  });
  it('no inventa un refund que MP no tiene', async () => {
    const h = harness();
    const r = await repairWooRefund(h.deps, { orderId: 3147, mpRefundId: 'nope', actor: 'x' });
    expect(r.ok).toBe(false); if (r.ok === false) expect(r.code).toBe('mp_refund_not_found');
    expect(h.wcCreate).not.toHaveBeenCalled();
  });
});
