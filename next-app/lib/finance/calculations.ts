// Profitability Engine: transforma un pedido en su cascada Revenue → Contribution
// Profit, y agrega el período. Única definición — Dashboard y Finanzas la usan.
//
//   Revenue − Refunds = Net Revenue
//   Net Revenue − COGS = Gross Profit
//   Gross Profit − Payment Fees − Tax Withholdings − Shipping Absorbed − Variable Costs = Contribution Profit
//
// Net Collected (caja) es aparte: Gross Collected − deducciones de la pasarela.
// Las retenciones impositivas (IIBB/SIRTAC) se tratan como COSTO, no como
// crédito fiscal: decisión de negocio del 14/09/2026 ("no veo más esa plata").
// Por eso restan del Contribution Profit además de la caja.

import type { FinanceConfig, DataSource, OrderFee } from './types';
import { computeOrderFee } from './fees';
import { computeShipping, type ShippingResult } from './shipping';
import { computeVariableCosts, type VariableCostResult } from './variable-costs';
import type { GatewayFeeSnapshot } from './types';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type CostLookup = (productId: number) => number | undefined;

export interface OrderLine { productId: number; quantity: number; lineTotal: number; name?: string }

export interface OrderInput {
  id: number;
  number: string;
  dateISO: string;
  customerName?: string;
  paymentMethod: string;
  total: number;
  refunded: number;
  shippingCharged: number;
  lineItems: OrderLine[];
  snapshot?: GatewayFeeSnapshot | null;
  /** Instante en que la plata quedó disponible (fecha de acreditación de la
   *  pasarela, o el pago si no hay snapshot). Base alternativa del período. */
  accreditedISO?: string;
}

export interface OrderProfit {
  id: number;
  number: string;
  dateISO: string;
  customerName?: string;
  revenue: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  cogsSource: DataSource;
  grossProfit: number;
  /** Revenue (line_total) de líneas CON costo conocido — para cobertura por línea. */
  cogsRevenueCovered: number;
  /** Revenue (line_total) de TODAS las líneas. */
  cogsRevenueTotal: number;
  fee: OrderFee;
  /** Retenciones impositivas de la pasarela: costo (ver cabecera). */
  taxWithholdings: number;
  shipping: ShippingResult;
  variableCosts: VariableCostResult;
  contributionProfit: number;
  contributionMargin: number;   // sobre netRevenue
  grossMargin: number;          // sobre netRevenue
  // Caja
  grossCollected: number;
  netCollected: number;
  accreditedISO?: string;
  /** Componentes con costo conocido / componentes esperados (0..1), para calidad. */
  complete: boolean;
}

export function computeOrderProfit(o: OrderInput, costOf: CostLookup, cfg: FinanceConfig): OrderProfit {
  const revenue = round2(o.total);
  const refunds = round2(o.refunded);
  const netRevenue = round2(revenue - refunds);

  // COGS (+ cobertura por revenue de línea, misma definición que el Dashboard)
  let cogs = 0, units = 0, cogsMissing = false, cogsRevenueCovered = 0, cogsRevenueTotal = 0;
  for (const li of o.lineItems) {
    const unit = costOf(li.productId);
    units += li.quantity || 0;
    cogsRevenueTotal += li.lineTotal || 0;
    if (unit === undefined || unit === null) cogsMissing = true;
    else { cogs += unit * (li.quantity || 0); cogsRevenueCovered += li.lineTotal || 0; }
  }
  cogs = round2(cogs);
  const cogsSource: DataSource = cogsMissing ? 'missing' : 'configured';
  const grossProfit = round2(netRevenue - cogs);

  const fee = computeOrderFee(
    { paymentMethod: o.paymentMethod, gross: revenue, dateISO: o.dateISO, snapshot: o.snapshot },
    cfg.feeRules
  );
  const shipping = computeShipping(o.shippingCharged, cfg.shipping.flatRealCost);
  const variableCosts = computeVariableCosts(cfg.variableCosts, { units, revenue: netRevenue });

  const taxWithholdings = round2(fee.breakdown.taxWithholdings);
  const contributionProfit = round2(grossProfit - fee.economicCost - taxWithholdings - shipping.absorbed - variableCosts.total);
  const contributionMargin = netRevenue > 0 ? contributionProfit / netRevenue : 0;
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0;

  return {
    id: o.id, number: o.number, dateISO: o.dateISO, customerName: o.customerName,
    revenue, refunds, netRevenue, cogs, cogsSource, grossProfit,
    cogsRevenueCovered: round2(cogsRevenueCovered), cogsRevenueTotal: round2(cogsRevenueTotal),
    fee, taxWithholdings, shipping, variableCosts, contributionProfit, contributionMargin, grossMargin,
    grossCollected: revenue,
    netCollected: round2(fee.netReceived),
    accreditedISO: o.accreditedISO,
    complete: !cogsMissing && fee.source !== 'missing',
  };
}

// ─── Agregado del período ─────────────────────────────────────────────────────

/** Deducciones del período por concepto: lo que separa la facturación bruta
 *  del ingreso neto real. `exact` / `estimated` reparten el total según el
 *  origen del dato de cada pedido (snapshot vs regla configurada). */
export interface DeductionsSummary {
  gateway: number;
  financing: number;
  other: number;
  taxWithholdings: number;
  refunds: number;
  total: number;
  /** Parte del total que viene de snapshots reales de la pasarela. */
  exact: number;
  /** Parte del total estimada por regla configurada. */
  estimated: number;
  /** Bruto de pedidos sin dato ni regla (sus deducciones no están en `total`). */
  unknownGross: number;
}

export interface FinanceSummary {
  revenue: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  paymentFees: number;
  taxWithholdings: number;
  shippingAbsorbed: number;
  variableCosts: number;
  contributionProfit: number;
  contributionMargin: number;
  // Caja
  grossCollected: number;
  netCollected: number;
  /** Ingreso neto real: lo que quedó disponible después de todas las
   *  deducciones de las pasarelas y los reembolsos. */
  netIncome: number;
  /** netIncome / revenue. */
  netIncomeRate: number;
  deductions: DeductionsSummary;
  effectiveFeeRate: number;
  orders: number;
  coverage: {
    cogs: number;   // revenue-weighted
    fees: number;
    shipping: number;
    variable: number;
  };
}

export function aggregateFinance(profits: OrderProfit[]): FinanceSummary {
  let revenue = 0, refunds = 0, netRevenue = 0, cogs = 0, grossProfit = 0,
    paymentFees = 0, taxWithholdings = 0, shippingAbsorbed = 0, variableCosts = 0, contributionProfit = 0,
    grossCollected = 0, netCollected = 0;
  let dGateway = 0, dFinancing = 0, dOther = 0, dExact = 0, dEstimated = 0, dUnknownGross = 0, refundsOutsideSnapshot = 0;
  // coverage: fees/shipping/variable por netRevenue del pedido; COGS por revenue
  // de LÍNEA (misma definición que el Dashboard, más honesta que a nivel pedido).
  let covBase = 0, feesKnown = 0, shipKnown = 0, varKnown = 0;
  let cogsLineTotal = 0, cogsLineKnown = 0;

  for (const p of profits) {
    revenue += p.revenue; refunds += p.refunds; netRevenue += p.netRevenue;
    cogs += p.cogs; grossProfit += p.grossProfit;
    paymentFees += p.fee.economicCost; taxWithholdings += p.taxWithholdings;
    shippingAbsorbed += p.shipping.absorbed;
    variableCosts += p.variableCosts.total; contributionProfit += p.contributionProfit;
    grossCollected += p.grossCollected; netCollected += p.netCollected;

    const b = p.fee.breakdown;
    dGateway += b.gateway; dFinancing += b.financing; dOther += b.other;
    const orderDeductions = b.gateway + b.financing + b.other + b.taxWithholdings;
    if (p.fee.source === 'exact' || p.fee.source === 'snapshot') dExact += orderDeductions;
    else if (p.fee.source === 'configured') dEstimated += orderDeductions;
    else dUnknownGross += p.grossCollected;
    // El neto de un snapshot ya descuenta el reembolso hecho por la pasarela;
    // para el resto el reembolso de Woo hay que restarlo aparte.
    if (p.fee.source !== 'exact' && p.fee.source !== 'snapshot') refundsOutsideSnapshot += p.refunds;

    const base = p.netRevenue;
    covBase += base;
    cogsLineTotal += p.cogsRevenueTotal; cogsLineKnown += p.cogsRevenueCovered;
    if (p.fee.source !== 'missing') feesKnown += base;
    if (p.shipping.realSource !== 'missing') shipKnown += base;
    if (p.variableCosts.source !== 'missing') varKnown += base;
  }

  const cov = (known: number) => (covBase > 0 ? known / covBase : 0);
  const cogsCov = cogsLineTotal > 0 ? cogsLineKnown / cogsLineTotal : 0;
  const netIncome = round2(netCollected - refundsOutsideSnapshot);
  const deductionsTotal = round2(dGateway + dFinancing + dOther + taxWithholdings + refunds);
  return {
    revenue: round2(revenue), refunds: round2(refunds), netRevenue: round2(netRevenue),
    cogs: round2(cogs), grossProfit: round2(grossProfit),
    grossMargin: netRevenue > 0 ? round2(grossProfit) / round2(netRevenue) : 0,
    paymentFees: round2(paymentFees), taxWithholdings: round2(taxWithholdings),
    shippingAbsorbed: round2(shippingAbsorbed),
    variableCosts: round2(variableCosts), contributionProfit: round2(contributionProfit),
    contributionMargin: netRevenue > 0 ? round2(contributionProfit) / round2(netRevenue) : 0,
    grossCollected: round2(grossCollected), netCollected: round2(netCollected),
    netIncome,
    netIncomeRate: revenue > 0 ? netIncome / round2(revenue) : 0,
    deductions: {
      gateway: round2(dGateway), financing: round2(dFinancing), other: round2(dOther),
      taxWithholdings: round2(taxWithholdings), refunds: round2(refunds), total: deductionsTotal,
      exact: round2(dExact), estimated: round2(dEstimated), unknownGross: round2(dUnknownGross),
    },
    effectiveFeeRate: grossCollected > 0 ? round2(paymentFees) / round2(grossCollected) : 0,
    orders: profits.length,
    coverage: { cogs: cogsCov, fees: cov(feesKnown), shipping: cov(shipKnown), variable: cov(varKnown) },
  };
}
