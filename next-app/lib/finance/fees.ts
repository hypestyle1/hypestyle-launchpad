import type {
  Provider, ProviderGroup, FeeRule, OrderFee, GatewayFeeSnapshot, DataSource,
} from './types';

// Motor de fees por pasarela. Jerarquía por pedido:
//   snapshot exacto (de MP) → regla configurada con vigencia → missing (nunca 0).
// El fee EXACTO en vivo lo obtiene el sync (fees-mp), que persiste el snapshot;
// el engine sólo lee ese snapshot, para no pegarle a MP al abrir Finanzas.

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ─── Mapeo payment_method (Woo) → proveedor. Única fuente, sin `if (method===)`
// desperdigados por los componentes. ─────────────────────────────────────────
const METHOD_TO_PROVIDER: Record<string, Provider> = {
  'talo-pay-cvu-woo': 'talo',
  'tarjeta': 'mercadopago_card',
  'mercadopago': 'mercadopago_wallet',
  'woo-mercado-pago-basic': 'mercadopago_wallet',
  'gocuotas': 'gocuotas',
  'ppcp-gateway': 'paypal',
  'paypal': 'paypal',
  'admin-manual': 'manual',
  'mayorista': 'mayorista',
};

export function providerOf(paymentMethod: string): Provider {
  return METHOD_TO_PROVIDER[paymentMethod] || 'other';
}

const PROVIDER_GROUP: Record<Provider, ProviderGroup> = {
  mercadopago_card: 'mercadopago', mercadopago_wallet: 'mercadopago',
  talo: 'talo', gocuotas: 'gocuotas', paypal: 'paypal',
  manual: 'manual', mayorista: 'mayorista', other: 'other',
};
export const groupOf = (p: Provider): ProviderGroup => PROVIDER_GROUP[p];

const GROUP_LABEL: Record<ProviderGroup, string> = {
  mercadopago: 'Mercado Pago', talo: 'Talo / transferencia', gocuotas: 'GOcuotas',
  paypal: 'PayPal', manual: 'Manual', mayorista: 'Mayorista', other: 'Otras',
};
export const groupLabel = (g: ProviderGroup): string => GROUP_LABEL[g];

/** Regla vigente para un proveedor en una fecha (la más específica que aplique). */
export function ruleFor(rules: FeeRule[], provider: Provider, atISO: string): FeeRule | null {
  const at = Date.parse(atISO);
  const applicable = rules.filter((r) => {
    if (r.provider !== provider) return false;
    const from = Date.parse(r.from);
    const to = r.to ? Date.parse(r.to) : Infinity;
    return at >= from && at < to;
  });
  if (!applicable.length) return null;
  // La de vigencia más reciente (from mayor) gana si se solapan.
  return applicable.sort((a, b) => Date.parse(b.from) - Date.parse(a.from))[0];
}

export interface FeeInput {
  paymentMethod: string;
  /** Bruto cobrado por la pasarela (normalmente el total del pedido). */
  gross: number;
  /** Fecha del pedido (ISO) para elegir la regla vigente. */
  dateISO: string;
  /** Snapshot exacto si ya fue sincronizado. */
  snapshot?: GatewayFeeSnapshot | null;
}

/** Calcula el fee de un pedido según la jerarquía exact → configured → missing. */
export function computeOrderFee(input: FeeInput, rules: FeeRule[]): OrderFee {
  const provider = providerOf(input.paymentMethod);
  const group = groupOf(provider);

  // 1) Snapshot exacto.
  if (input.snapshot && input.snapshot.provider) {
    const s = input.snapshot;
    return {
      provider, group,
      economicCost: round2(s.gatewayFee),
      netReceived: round2(s.netReceived),
      otherCashDeduction: round2(s.otherCashDeduction),
      source: 'exact',
    };
  }

  // 2) Regla configurada vigente.
  const rule = ruleFor(rules, provider, input.dateISO);
  if (rule) {
    const economic = round2(input.gross * rule.percent + rule.fixed);
    return {
      provider, group,
      economicCost: economic,
      netReceived: round2(input.gross - economic),
      otherCashDeduction: 0,
      source: 'configured',
    };
  }

  // 3) Missing — nunca 0. economicCost queda null-conceptual; se representa con source.
  return { provider, group, economicCost: 0, netReceived: input.gross, otherCashDeduction: 0, source: 'missing' };
}

// ─── Agregación por pasarela ──────────────────────────────────────────────────

export interface GatewayAgg {
  group: ProviderGroup;
  label: string;
  orders: number;
  grossCollected: number;
  economicCost: number;
  netCollected: number;
  otherCashDeduction: number;
  /** Effective Fee Rate = economicCost / grossCollected. */
  effectiveFeeRate: number;
  /** Cobertura ponderada por monto: gross con fee exacto+configured / gross total. */
  coverage: number;
  /** Desglose por calidad de dato (gross bajo cada fuente). */
  bySource: Record<DataSource, number>;
}

export interface OrderFeeRow {
  gross: number;
  fee: OrderFee;
}

export function aggregateByGateway(rows: OrderFeeRow[]): GatewayAgg[] {
  const map = new Map<ProviderGroup, GatewayAgg>();
  for (const { gross, fee } of rows) {
    const g = fee.group;
    const a = map.get(g) || {
      group: g, label: groupLabel(g), orders: 0, grossCollected: 0, economicCost: 0,
      netCollected: 0, otherCashDeduction: 0, effectiveFeeRate: 0, coverage: 0,
      bySource: { exact: 0, snapshot: 0, configured: 0, missing: 0 },
    };
    a.orders += 1;
    a.grossCollected += gross;
    a.economicCost += fee.economicCost;
    a.netCollected += fee.netReceived;
    a.otherCashDeduction += fee.otherCashDeduction;
    a.bySource[fee.source] += gross;
    map.set(g, a);
  }
  for (const a of map.values()) {
    a.grossCollected = round2(a.grossCollected);
    a.economicCost = round2(a.economicCost);
    a.netCollected = round2(a.netCollected);
    a.otherCashDeduction = round2(a.otherCashDeduction);
    a.effectiveFeeRate = a.grossCollected > 0 ? a.economicCost / a.grossCollected : 0;
    const known = a.bySource.exact + a.bySource.snapshot + a.bySource.configured;
    a.coverage = a.grossCollected > 0 ? known / a.grossCollected : 0;
    Object.keys(a.bySource).forEach((k) => { a.bySource[k as DataSource] = round2(a.bySource[k as DataSource]); });
  }
  return [...map.values()].sort((x, y) => y.grossCollected - x.grossCollected);
}

/** Cobertura de fees global ponderada por gross (exact/snapshot/configured / total). */
export function feeCoverage(rows: OrderFeeRow[]): number {
  let known = 0, total = 0;
  for (const { gross, fee } of rows) {
    total += gross;
    if (fee.source !== 'missing') known += gross;
  }
  return total > 0 ? known / total : 0;
}

/**
 * Cobertura de fees SEPARADA por calidad (ponderada por gross). Clave para no
 * dar falsa confianza: 'configured 100%' NO es lo mismo que 'exact 100%'.
 */
export function feeCoverageBreakdown(rows: OrderFeeRow[]): { exact: number; configured: number; missing: number } {
  let total = 0, exact = 0, configured = 0, missing = 0;
  for (const { gross, fee } of rows) {
    total += gross;
    if (fee.source === 'exact' || fee.source === 'snapshot') exact += gross;
    else if (fee.source === 'configured') configured += gross;
    else missing += gross;
  }
  if (total <= 0) return { exact: 0, configured: 0, missing: 0 };
  return { exact: exact / total, configured: configured / total, missing: missing / total };
}
