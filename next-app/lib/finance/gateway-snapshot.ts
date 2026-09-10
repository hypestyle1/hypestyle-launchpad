// Snapshot v2 de pasarela: normalización de un pago de Mercado Pago a un
// registro por pedido que separa comisión, financiación, retenciones y neto de
// caja. Dominio puro: sin I/O, sin tokens, sin fechas "ahora" implícitas.
//
// ─── Estrategia de deduplicación (fee_details vs charges_details) ────────────
//
// MP devuelve los cargos en dos lugares que se solapan:
//   - `fee_details[]`: {type, amount, fee_payer}. Sólo fees (comisión,
//     financiación, cupón). NO trae retenciones ni ids.
//   - `charges_details[]`: {id, name, type: 'fee'|'tax'|…, amounts{original,
//     refunded}, accounts{from,to}, metadata}. Trae los mismos fees Y las
//     retenciones impositivas, cada uno con id propio.
//
// Regla: **`charges_details` es la fuente canónica cuando existe**. Los
// importes NUNCA se suman de los dos arrays. `fee_details` se usa sólo para
//   (a) fallback si `charges_details` viene vacío (pagos viejos / otras cuentas), y
//   (b) control cruzado: si la suma de fees de `fee_details` (a cargo del
//       vendedor) no coincide con la de `charges_details` se anota un warning y
//       gana `charges_details`.
// Sólo se descuentan cargos a cargo del vendedor (`accounts.from === 'collector'`
// o `fee_payer === 'collector'`). Un interés que paga el comprador no es
// deducción nuestra.
//
// ─── Neto ────────────────────────────────────────────────────────────────────
//
// `transaction_details.net_received_amount` es el valor canónico de caja
// (`quality: 'real'`). Se calcula además `calculatedNet` como control:
//   gross − feeGateway − feeFinancing − feeOther − taxWithholdingTotal − refunded + adjustments
// Si difieren en más de un centavo se registra `discrepancy` y no se oculta.
// Si MP no informa el neto, `netCashReceived = calculatedNet` con
// `quality: 'calculated'`.

import type {
  GatewayFeeSnapshot, GatewayFeeSnapshotV2, Provider, SnapshotCharge, TaxWithholding, SnapshotDiscrepancy,
} from './types';

export const GATEWAY_FEE_META = '_hs_gateway_fee';
export const GATEWAY_SYNC_META = '_hs_gateway_fee_sync';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (v === undefined || v === null || v === '' ? null : String(v));

/** Tolerancia de conciliación: un centavo. */
const EPS = 0.011;

// ─── Clasificación de cargos ─────────────────────────────────────────────────

const GATEWAY_NAMES = new Set(['mercadopago_fee', 'processing_fee', 'application_fee']);
const FINANCING_NAMES = new Set(['financing_fee']);

function feeKindByName(name: string): SnapshotCharge['kind'] {
  if (GATEWAY_NAMES.has(name)) return 'gateway';
  if (FINANCING_NAMES.has(name)) return 'financing';
  return 'other_fee';
}

/** `tax_withholding_sirtac_noinsc-buenos_aires` → régimen `sirtac_noinsc`, jurisdicción `buenos_aires`. */
export function parseTaxName(name: string, metadata?: Record<string, unknown> | null): { regime: string | null; jurisdiction: string | null } {
  const metaJur = str(metadata?.mov_financial_entity);
  const metaDetail = str(metadata?.mov_detail);
  let body = name.startsWith('tax_withholding_') ? name.slice('tax_withholding_'.length) : name;
  let regime: string | null = null;
  let jurisdiction: string | null = metaJur;
  const dash = body.lastIndexOf('-');
  if (dash > 0) {
    regime = body.slice(0, dash);
    jurisdiction = jurisdiction || body.slice(dash + 1);
  } else {
    regime = body || null;
  }
  if (metaDetail && metaDetail.startsWith('tax_withholding_')) regime = metaDetail.slice('tax_withholding_'.length);
  return { regime: regime || null, jurisdiction: jurisdiction || null };
}

interface Classified {
  charges: SnapshotCharge[];
  taxes: TaxWithholding[];
  warnings: string[];
  origin: 'charges_details' | 'fee_details' | 'none';
}

function fromChargesDetails(list: any[], warnings: string[]): Classified {
  const charges: SnapshotCharge[] = [];
  const taxes: TaxWithholding[] = [];
  for (const c of list) {
    const name = String(c?.name || c?.type || 'charge');
    const type = String(c?.type || '');
    const from = str(c?.accounts?.from);
    const amount = round2(num(c?.amounts?.original) ?? 0);
    const refunded = round2(num(c?.amounts?.refunded) ?? 0);
    const sourceId = str(c?.id);
    // Cargos a cargo del comprador no son deducción del vendedor.
    if (from && from !== 'collector') { warnings.push(`charge_not_collector:${name}:${from}`); continue; }
    if (type === 'tax') {
      const { regime, jurisdiction } = parseTaxName(name, c?.metadata);
      taxes.push({ name, regime, jurisdiction, amount, sourceId });
      charges.push({ sourceId, name, kind: 'tax', amount, refunded, origin: 'charges_details' });
      continue;
    }
    if (type === 'fee' || type === 'financing') {
      const kind = type === 'financing' ? 'financing' : feeKindByName(name);
      charges.push({ sourceId, name, kind, amount, refunded, origin: 'charges_details' });
      continue;
    }
    warnings.push(`unknown_charge_type:${type || '?'}:${name}`);
    charges.push({ sourceId, name, kind: 'other_fee', amount, refunded, origin: 'charges_details' });
  }
  return { charges, taxes, warnings, origin: 'charges_details' };
}

function fromFeeDetails(list: any[], warnings: string[]): Classified {
  const charges: SnapshotCharge[] = [];
  for (const f of list) {
    const name = String(f?.type || 'fee');
    const payer = str(f?.fee_payer);
    if (payer && payer !== 'collector') { warnings.push(`fee_not_collector:${name}:${payer}`); continue; }
    charges.push({ sourceId: null, name, kind: feeKindByName(name), amount: round2(num(f?.amount) ?? 0), refunded: 0, origin: 'fee_details' });
  }
  warnings.push('no_charges_details:fallback_fee_details');
  return { charges, taxes: [], warnings, origin: 'fee_details' };
}

/** Suma de fees a cargo del vendedor en `fee_details` (para el control cruzado). */
function collectorFeeDetailsTotal(list: any[]): number {
  return round2(list.reduce((s, f) => {
    const payer = str(f?.fee_payer);
    if (payer && payer !== 'collector') return s;
    return s + (num(f?.amount) ?? 0);
  }, 0));
}

// ─── Normalizador ────────────────────────────────────────────────────────────

export interface NormalizeOptions {
  provider: Provider;
  /** ISO de cuándo se sincronizó. Se inyecta para que el dominio sea determinista. */
  syncedAt: string;
}

/**
 * Convierte un payment de MP (`GET /v1/payments/{id}`) en un snapshot v2.
 * Devuelve null sólo si el payload no tiene ni id ni monto (no es un pago).
 */
export function normalizeMpPayment(pay: any, opts: NormalizeOptions): GatewayFeeSnapshotV2 | null {
  const gross = num(pay?.transaction_amount);
  const paymentId = str(pay?.id);
  if (gross === null || !paymentId) return null;

  const warnings: string[] = [];
  const chargesList = Array.isArray(pay?.charges_details) ? pay.charges_details : [];
  const feeList = Array.isArray(pay?.fee_details) ? pay.fee_details : [];

  const classified = chargesList.length ? fromChargesDetails(chargesList, warnings) : fromFeeDetails(feeList, warnings);

  const sumKind = (k: SnapshotCharge['kind']) => round2(classified.charges.filter((c) => c.kind === k).reduce((s, c) => s + c.amount, 0));
  const feeGateway = sumKind('gateway');
  const feeFinancing = sumKind('financing');
  const feeOther = sumKind('other_fee');
  const taxWithholdingTotal = round2(classified.taxes.reduce((s, t) => s + t.amount, 0));
  const adjustments = round2(classified.charges.reduce((s, c) => s + c.refunded, 0));

  // Control cruzado fee_details vs charges_details (sin sumar ambos).
  if (classified.origin === 'charges_details' && feeList.length) {
    const fdTotal = collectorFeeDetailsTotal(feeList);
    const cdFees = round2(feeGateway + feeFinancing + feeOther);
    if (Math.abs(fdTotal - cdFees) > EPS) warnings.push(`fee_details_mismatch:fee_details=${fdTotal}:charges=${cdFees}`);
  }

  const refundedTx = num(pay?.transaction_amount_refunded);
  const refundedList = Array.isArray(pay?.refunds) ? pay.refunds.reduce((s: number, r: any) => s + (num(r?.amount) ?? 0), 0) : 0;
  const refunded = round2(refundedTx ?? refundedList);
  if (refundedTx !== null && Array.isArray(pay?.refunds) && pay.refunds.length && Math.abs(refundedTx - refundedList) > EPS) {
    warnings.push(`refunds_mismatch:transaction_amount_refunded=${refundedTx}:refunds=${round2(refundedList)}`);
  }

  const calculatedNet = round2(gross - feeGateway - feeFinancing - feeOther - taxWithholdingTotal - refunded + adjustments);
  const reportedNet = num(pay?.transaction_details?.net_received_amount);
  const quality: GatewayFeeSnapshotV2['quality'] = reportedNet === null ? 'calculated' : 'real';
  if (reportedNet === null) warnings.push('net_received_amount_missing:calculated');
  const netCashReceived = round2(reportedNet ?? calculatedNet);

  let discrepancy: SnapshotDiscrepancy | null = null;
  if (reportedNet !== null && Math.abs(reportedNet - calculatedNet) > EPS) {
    discrepancy = { reportedNet: round2(reportedNet), calculatedNet, delta: round2(reportedNet - calculatedNet), notes: [...warnings] };
  }

  // Campos v1 (compatibilidad): gatewayFee = Σ fees a cargo del vendedor (como
  // hacía v1 con fee_details), otherCashDeduction = lo que no es fee (retenciones).
  const gatewayFee = round2(feeGateway + feeFinancing + feeOther);
  const otherCashDeduction = Math.max(0, round2(gross - netCashReceived - gatewayFee));

  return {
    // v1
    provider: opts.provider,
    transactionId: paymentId,
    grossAmount: round2(gross),
    gatewayFee,
    netReceived: netCashReceived,
    breakdown: classified.charges.map((c) => ({ type: c.name, amount: c.amount })),
    otherCashDeduction,
    currency: String(pay?.currency_id || 'ARS'),
    syncedAt: opts.syncedAt,
    source: 'exact',
    // v2
    version: 2,
    paymentId,
    externalReference: str(pay?.external_reference),
    merchantOrderId: str(pay?.order?.id),
    collectorId: str(pay?.collector_id),
    paymentMethodId: str(pay?.payment_method_id),
    paymentTypeId: str(pay?.payment_type_id),
    installments: num(pay?.installments),
    status: str(pay?.status),
    statusDetail: str(pay?.status_detail),
    gross: round2(gross),
    totalPaid: num(pay?.transaction_details?.total_paid_amount),
    feeGateway, feeFinancing, feeOther,
    taxWithholdings: classified.taxes,
    taxWithholdingTotal,
    refunded,
    adjustments,
    netCashReceived,
    calculatedNet,
    discrepancy,
    charges: classified.charges,
    dateCreated: str(pay?.date_created),
    dateApproved: str(pay?.date_approved),
    moneyReleaseDate: str(pay?.money_release_date),
    moneyReleaseStatus: str(pay?.money_release_status),
    quality,
    warnings,
  };
}

// ─── Lectura desde la meta del pedido (v1 o v2) ──────────────────────────────

export function isSnapshotV2(s: GatewayFeeSnapshot | null | undefined): s is GatewayFeeSnapshotV2 {
  return !!s && (s as GatewayFeeSnapshotV2).version === 2;
}

/** Parsea `_hs_gateway_fee` de la meta de un pedido. Acepta v1 y v2; un
 *  snapshot corrupto devuelve null (el engine cae a la regla configurada). */
export function parseGatewaySnapshot(meta: { key: string; value: unknown }[] | undefined | null): GatewayFeeSnapshot | null {
  const m = (meta || []).find((x) => x.key === GATEWAY_FEE_META);
  if (!m) return null;
  try {
    const v: any = typeof m.value === 'string' ? JSON.parse(m.value) : m.value;
    if (v && typeof v.gatewayFee === 'number' && typeof v.netReceived === 'number') return v as GatewayFeeSnapshot;
  } catch { /* corrupto → null */ }
  return null;
}

// ─── Fechas: la pasarela devuelve timestamps con su propio offset (MP usa
// -04:00 en la respuesta). Nada se bucketea en UTC ni asumiendo -03: se convierte
// con la zona real, que absorbe cualquier cambio de horario. ─────────────────

export const AR_TZ = 'America/Argentina/Buenos_Aires';

const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** `YYYY-MM-DD` del instante en hora de Buenos Aires, o null si no parsea. */
export function buenosAiresDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return fmtDay.format(new Date(ms)); // en-CA → YYYY-MM-DD
}

/** `YYYY-MM` en hora de Buenos Aires. */
export function buenosAiresMonthKey(iso: string | null | undefined): string | null {
  const d = buenosAiresDateKey(iso);
  return d ? d.slice(0, 7) : null;
}
