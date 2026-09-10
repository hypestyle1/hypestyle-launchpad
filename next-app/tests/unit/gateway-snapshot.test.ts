import { describe, it, expect } from 'vitest';
import {
  normalizeMpPayment, parseGatewaySnapshot, isSnapshotV2, parseTaxName, buenosAiresDateKey, buenosAiresMonthKey,
} from '@/lib/finance/gateway-snapshot';
import { computeOrderFee } from '@/lib/finance/fees';

const SYNC = { provider: 'mercadopago_card' as const, syncedAt: '2026-09-10T15:00:00.000Z' };

// Payload real del pago del pedido #3147 (10/09/2026), sin datos del pagador.
// Es el caso de control: fee + financiación + retención SIRTAC, neto informado.
function payment3147(): any {
  return {
    id: 177835956882, status: 'approved', status_detail: 'accredited', currency_id: 'ARS', live_mode: true,
    external_reference: '3147', order: { id: '44260367891', type: 'mercadopago' }, collector_id: 269150963,
    payment_method_id: 'master', payment_type_id: 'credit_card', installments: 3, operation_type: 'regular_payment',
    date_created: '2026-09-07T20:06:42.000-04:00', date_approved: '2026-09-07T20:06:44.000-04:00',
    money_release_date: '2026-09-07T20:06:44.000-04:00', money_release_status: 'released',
    transaction_amount: 95108.56, transaction_amount_refunded: 0, taxes_amount: 0, shipping_amount: 0,
    transaction_details: { net_received_amount: 72945.51, total_paid_amount: 95108.56, installment_amount: 31702.85, overpaid_amount: 0 },
    fee_details: [
      { type: 'mercadopago_fee', amount: 7237.76, fee_payer: 'collector' },
      { type: 'financing_fee', amount: 12072.03, fee_payer: 'collector' },
    ],
    charges_details: [
      { id: '177835956882-001', name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 7237.76, refunded: 0 }, metadata: { source_detail: 'processing_fee_charge' } },
      { id: '177835956882-002', name: 'financing_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 12072.03, refunded: 0 }, metadata: { source_detail: 'financing_fee_collector_charge' } },
      { id: '177835956882-003', name: 'tax_withholding_sirtac_noinsc-buenos_aires', type: 'tax', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 2853.26, refunded: 0 }, metadata: { mov_detail: 'tax_withholding_sirtac_noinsc', mov_financial_entity: 'buenos_aires', mov_type: 'expense', source_detail: 'sirtac_charge' } },
    ],
    taxes: [], refunds: [],
  };
}

describe('normalizeMpPayment — D. caso control #3147 (fee + financing + tax)', () => {
  const s = normalizeMpPayment(payment3147(), SYNC)!;
  it('separa comisión, financiación y retención al centavo', () => {
    expect(s.gross).toBe(95108.56);
    expect(s.feeGateway).toBe(7237.76);
    expect(s.feeFinancing).toBe(12072.03);
    expect(s.feeOther).toBe(0);
    expect(s.taxWithholdingTotal).toBe(2853.26);
    expect(s.taxWithholdings).toEqual([{
      name: 'tax_withholding_sirtac_noinsc-buenos_aires', regime: 'sirtac_noinsc', jurisdiction: 'buenos_aires',
      amount: 2853.26, sourceId: '177835956882-003',
    }]);
  });
  it('neto de caja = lo que informa MP, y el control cierra sin discrepancy', () => {
    expect(s.netCashReceived).toBe(72945.51);
    expect(s.calculatedNet).toBe(72945.51);
    expect(s.discrepancy).toBeNull();
    expect(s.quality).toBe('real');
    expect(s.warnings).toEqual([]);
  });
  it('identidad, clasificación y fechas originales con offset', () => {
    expect(s.paymentId).toBe('177835956882');
    expect(s.externalReference).toBe('3147');
    expect(s.merchantOrderId).toBe('44260367891');
    expect(s.collectorId).toBe('269150963');
    expect(s.paymentMethodId).toBe('master');
    expect(s.paymentTypeId).toBe('credit_card');
    expect(s.installments).toBe(3);
    expect(s.status).toBe('approved');
    expect(s.statusDetail).toBe('accredited');
    expect(s.dateApproved).toBe('2026-09-07T20:06:44.000-04:00');
    expect(s.moneyReleaseDate).toBe('2026-09-07T20:06:44.000-04:00');
    expect(s.moneyReleaseStatus).toBe('released');
    expect(s.syncedAt).toBe(SYNC.syncedAt);
  });
  it('mantiene los campos v1 con la misma semántica', () => {
    expect(s.version).toBe(2);
    expect(s.source).toBe('exact');
    expect(s.transactionId).toBe('177835956882');
    expect(s.grossAmount).toBe(95108.56);
    expect(s.gatewayFee).toBe(19309.79);           // Σ fees a cargo del vendedor, como v1
    expect(s.netReceived).toBe(72945.51);
    expect(s.otherCashDeduction).toBe(2853.26);    // gross − net − gatewayFee = la retención
    expect(s.breakdown).toEqual([
      { type: 'mercadopago_fee', amount: 7237.76 },
      { type: 'financing_fee', amount: 12072.03 },
      { type: 'tax_withholding_sirtac_noinsc-buenos_aires', amount: 2853.26 },
    ]);
  });
  it('el engine existente lo consume como exact sin cambios', () => {
    const fee = computeOrderFee({ paymentMethod: 'tarjeta', gross: 95108.56, dateISO: '2026-09-08', snapshot: s }, []);
    expect(fee.source).toBe('exact');
    expect(fee.economicCost).toBe(19309.79);
    expect(fee.netReceived).toBe(72945.51);
    expect(fee.otherCashDeduction).toBe(2853.26);
  });
});

describe('normalizeMpPayment — A. pago simple sin financiación', () => {
  it('sólo comisión, cuota única, neto real', () => {
    const p = payment3147();
    p.installments = 1; p.transaction_amount = 10000;
    p.fee_details = [{ type: 'mercadopago_fee', amount: 629, fee_payer: 'collector' }];
    p.charges_details = [{ id: 'x-001', name: 'mercadopago_fee', type: 'fee', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 629, refunded: 0 } }];
    p.transaction_details.net_received_amount = 9371;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeGateway).toBe(629);
    expect(s.feeFinancing).toBe(0);
    expect(s.taxWithholdings).toEqual([]);
    expect(s.netCashReceived).toBe(9371);
    expect(s.discrepancy).toBeNull();
    expect(s.otherCashDeduction).toBe(0);
  });
});

describe('normalizeMpPayment — B. pago con financiación', () => {
  it('financing_fee va a feeFinancing y no a feeGateway', () => {
    const p = payment3147();
    p.charges_details = p.charges_details.slice(0, 2);
    p.transaction_details.net_received_amount = 75798.77;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeGateway).toBe(7237.76);
    expect(s.feeFinancing).toBe(12072.03);
    expect(s.taxWithholdingTotal).toBe(0);
    expect(s.netCashReceived).toBe(75798.77);
    expect(s.discrepancy).toBeNull();
  });
});

describe('normalizeMpPayment — C. pago con tax withholding', () => {
  it('la retención nunca se clasifica como fee; sí reduce el neto de caja', () => {
    const p = payment3147();
    p.charges_details = [p.charges_details[0], p.charges_details[2]];
    p.fee_details = [p.fee_details[0]];
    p.transaction_details.net_received_amount = 95108.56 - 7237.76 - 2853.26;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeGateway).toBe(7237.76);
    expect(s.feeFinancing).toBe(0);
    expect(s.taxWithholdingTotal).toBe(2853.26);
    expect(s.gatewayFee).toBe(7237.76);
    expect(s.netCashReceived).toBe(85017.54);
    expect(s.otherCashDeduction).toBe(2853.26);
    expect(s.charges.find((c) => c.kind === 'tax')!.origin).toBe('charges_details');
  });
  it('parseTaxName infiere régimen y jurisdicción', () => {
    expect(parseTaxName('tax_withholding_sirtac_noinsc-buenos_aires')).toEqual({ regime: 'sirtac_noinsc', jurisdiction: 'buenos_aires' });
    expect(parseTaxName('tax_withholding_iibb-cordoba', { mov_financial_entity: 'cordoba' })).toEqual({ regime: 'iibb', jurisdiction: 'cordoba' });
    expect(parseTaxName('tax_withholding_ganancias')).toEqual({ regime: 'ganancias', jurisdiction: null });
  });
});

describe('normalizeMpPayment — E. charges_details vacío', () => {
  it('cae a fee_details con warning y detecta la retención como discrepancy (no la inventa)', () => {
    const p = payment3147();
    p.charges_details = [];
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.warnings).toContain('no_charges_details:fallback_fee_details');
    expect(s.feeGateway).toBe(7237.76);
    expect(s.feeFinancing).toBe(12072.03);
    expect(s.taxWithholdings).toEqual([]);
    // El neto informado ya descuenta la retención; el cálculo no la conoce → discrepancy visible.
    expect(s.netCashReceived).toBe(72945.51);
    expect(s.calculatedNet).toBe(75798.77);
    expect(s.discrepancy).toEqual({ reportedNet: 72945.51, calculatedNet: 75798.77, delta: -2853.26, notes: ['no_charges_details:fallback_fee_details'] });
    expect(s.charges.every((c) => c.origin === 'fee_details')).toBe(true);
    // v1: la retención sigue apareciendo como deducción de caja no económica.
    expect(s.otherCashDeduction).toBe(2853.26);
  });
  it('charges_details ausente (undefined) se trata igual que vacío', () => {
    const p = payment3147();
    delete p.charges_details;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.warnings).toContain('no_charges_details:fallback_fee_details');
  });
});

describe('normalizeMpPayment — F. campos opcionales faltantes', () => {
  it('sin transaction_details: neto calculado, quality calculated, sin discrepancy', () => {
    const p = payment3147();
    delete p.transaction_details;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.quality).toBe('calculated');
    expect(s.netCashReceived).toBe(72945.51);
    expect(s.totalPaid).toBeNull();
    expect(s.discrepancy).toBeNull();
    expect(s.warnings).toContain('net_received_amount_missing:calculated');
  });
  it('sin fechas de liberación, sin order, sin cuotas', () => {
    const p = payment3147();
    delete p.money_release_date; delete p.money_release_status; delete p.order; delete p.installments; delete p.external_reference;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.moneyReleaseDate).toBeNull();
    expect(s.moneyReleaseStatus).toBeNull();
    expect(s.merchantOrderId).toBeNull();
    expect(s.installments).toBeNull();
    expect(s.externalReference).toBeNull();
  });
  it('sin id o sin monto no es un pago → null', () => {
    expect(normalizeMpPayment({ transaction_amount: 10 }, SYNC)).toBeNull();
    expect(normalizeMpPayment({ id: 1 }, SYNC)).toBeNull();
    expect(normalizeMpPayment(null, SYNC)).toBeNull();
  });
  it('montos como string se parsean', () => {
    const p = payment3147();
    p.transaction_amount = '95108.56';
    p.transaction_details.net_received_amount = '72945.51';
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.gross).toBe(95108.56);
    expect(s.netCashReceived).toBe(72945.51);
  });
});

describe('normalizeMpPayment — G. duplicación fee_details vs charges_details', () => {
  it('no suma los dos arrays: charges_details es canónico', () => {
    const s = normalizeMpPayment(payment3147(), SYNC)!;
    expect(s.gatewayFee).toBe(19309.79); // y no 38619.58
    expect(s.charges).toHaveLength(3);
    expect(s.charges.every((c) => c.origin === 'charges_details')).toBe(true);
  });
  it('si fee_details no coincide con charges_details, gana charges y queda warning', () => {
    const p = payment3147();
    p.fee_details[0].amount = 7000; // fee_details desactualizado
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeGateway).toBe(7237.76);
    expect(s.warnings).toContain('fee_details_mismatch:fee_details=19072.03:charges=19309.79');
    expect(s.discrepancy).toBeNull(); // el neto sigue cerrando contra charges
  });
  it('un cargo a cargo del comprador (from: payer) no se descuenta al vendedor', () => {
    const p = payment3147();
    p.charges_details.push({ id: 'x-004', name: 'financing_fee', type: 'fee', accounts: { from: 'payer', to: 'mp' }, amounts: { original: 5000, refunded: 0 } });
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeFinancing).toBe(12072.03);
    expect(s.warnings).toContain('charge_not_collector:financing_fee:payer');
  });
  it('un tipo de cargo desconocido va a feeOther con warning, nunca se pierde', () => {
    const p = payment3147();
    p.charges_details.push({ id: 'x-005', name: 'shipping_fee', type: 'shipping', accounts: { from: 'collector', to: 'mp' }, amounts: { original: 100, refunded: 0 } });
    p.transaction_details.net_received_amount = 72845.51;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.feeOther).toBe(100);
    expect(s.warnings).toContain('unknown_charge_type:shipping:shipping_fee');
    expect(s.discrepancy).toBeNull();
  });
});

describe('normalizeMpPayment — H. refunds', () => {
  it('refund parcial: reduce el neto calculado y los cargos devueltos entran como ajuste', () => {
    const p = payment3147();
    p.transaction_amount_refunded = 20000;
    p.refunds = [{ id: 1, amount: 20000, status: 'approved', date_created: '2026-09-09T10:00:00.000-04:00' }];
    // MP devuelve proporcionalmente parte de la comisión.
    p.charges_details[0].amounts.refunded = 1522.06;
    p.transaction_details.net_received_amount = 95108.56 - 19309.79 - 2853.26 - 20000 + 1522.06;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.refunded).toBe(20000);
    expect(s.adjustments).toBe(1522.06);
    expect(s.calculatedNet).toBe(54467.57);
    expect(s.netCashReceived).toBe(54467.57);
    expect(s.discrepancy).toBeNull();
  });
  it('refund total: neto calculado cero o negativo queda visible, no se clampa', () => {
    const p = payment3147();
    p.status = 'refunded';
    p.transaction_amount_refunded = 95108.56;
    p.refunds = [{ id: 1, amount: 95108.56, status: 'approved' }];
    p.transaction_details.net_received_amount = 0;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.refunded).toBe(95108.56);
    expect(s.calculatedNet).toBe(-22163.05);
    expect(s.netCashReceived).toBe(0);
    expect(s.discrepancy).not.toBeNull();
    expect(s.discrepancy!.delta).toBe(22163.05);
    expect(s.status).toBe('refunded');
  });
  it('refunds[] y transaction_amount_refunded inconsistentes → warning, manda transaction_amount_refunded', () => {
    const p = payment3147();
    p.transaction_amount_refunded = 100;
    p.refunds = [{ id: 1, amount: 50 }];
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.refunded).toBe(100);
    expect(s.warnings.some((w) => w.startsWith('refunds_mismatch:'))).toBe(true);
  });
});

describe('normalizeMpPayment — I. neto informado ≠ calculado', () => {
  it('registra discrepancy con delta y notas, sin tocar el neto informado', () => {
    const p = payment3147();
    p.transaction_details.net_received_amount = 72000;
    const s = normalizeMpPayment(p, SYNC)!;
    expect(s.netCashReceived).toBe(72000);
    expect(s.calculatedNet).toBe(72945.51);
    expect(s.discrepancy).toEqual({ reportedNet: 72000, calculatedNet: 72945.51, delta: -945.51, notes: [] });
    expect(s.quality).toBe('real');
  });
  it('una diferencia de un centavo no es discrepancy', () => {
    const p = payment3147();
    p.transaction_details.net_received_amount = 72945.52;
    expect(normalizeMpPayment(p, SYNC)!.discrepancy).toBeNull();
  });
});

describe('parseGatewaySnapshot — lee v1 y v2', () => {
  const v1 = { provider: 'mercadopago_card', transactionId: '1', grossAmount: 100, gatewayFee: 5, netReceived: 95, breakdown: [], otherCashDeduction: 0, currency: 'ARS', syncedAt: 'x', source: 'exact' };
  it('v1 como string JSON', () => {
    const s = parseGatewaySnapshot([{ key: '_hs_gateway_fee', value: JSON.stringify(v1) }]);
    expect(s?.gatewayFee).toBe(5);
    expect(isSnapshotV2(s)).toBe(false);
  });
  it('v2 como objeto', () => {
    const v2 = normalizeMpPayment(payment3147(), SYNC)!;
    const s = parseGatewaySnapshot([{ key: '_hs_gateway_fee', value: JSON.parse(JSON.stringify(v2)) }]);
    expect(isSnapshotV2(s)).toBe(true);
    expect((s as any).taxWithholdingTotal).toBe(2853.26);
  });
  it('corrupto o ausente → null', () => {
    expect(parseGatewaySnapshot([{ key: '_hs_gateway_fee', value: '{no json' }])).toBeNull();
    expect(parseGatewaySnapshot([{ key: '_hs_gateway_fee', value: JSON.stringify({ gatewayFee: 'x' }) }])).toBeNull();
    expect(parseGatewaySnapshot([])).toBeNull();
    expect(parseGatewaySnapshot(undefined)).toBeNull();
  });
});

describe('fechas — conversión a America/Argentina/Buenos_Aires', () => {
  it('el offset -04:00 de MP se convierte con la zona real, no asumiendo -03', () => {
    expect(buenosAiresDateKey('2026-09-07T20:06:44.000-04:00')).toBe('2026-09-07'); // 21:06 AR
    expect(buenosAiresDateKey('2026-09-07T22:30:00.000-04:00')).toBe('2026-09-07'); // 23:30 AR
    expect(buenosAiresDateKey('2026-09-07T23:30:00.000-04:00')).toBe('2026-09-08'); // 00:30 AR del día siguiente
  });
  it('una venta del 30/09 a la noche (UTC ya es 01/10) sigue siendo septiembre en AR', () => {
    expect(buenosAiresDateKey('2026-10-01T01:30:00.000Z')).toBe('2026-09-30');
    expect(buenosAiresMonthKey('2026-10-01T01:30:00.000Z')).toBe('2026-09');
    expect(buenosAiresMonthKey('2026-10-01T03:00:00.000Z')).toBe('2026-10');
  });
  it('inválido → null', () => {
    expect(buenosAiresDateKey(null)).toBeNull();
    expect(buenosAiresDateKey('nope')).toBeNull();
  });
});
