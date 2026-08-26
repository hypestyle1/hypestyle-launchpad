// Profitability Engine: transforma un pedido en su cascada Revenue → Contribution
// Profit, y agrega el período. Única definición — Dashboard y Finanzas la usan.
//
//   Revenue − Refunds = Net Revenue
//   Net Revenue − COGS = Gross Profit
//   Gross Profit − Payment Fees − Shipping Absorbed − Variable Costs = Contribution Profit
//
// Net Collected (caja) es aparte: Gross Collected − deducciones de la pasarela.
// Contribution Profit ≠ Net Collected (retenciones afectan caja, no resultado).

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
  shipping: ShippingResult;
  variableCosts: VariableCostResult;
  contributionProfit: number;
  contributionMargin: number;   // sobre netRevenue
  grossMargin: number;          // sobre netRevenue
  // Caja
  grossCollected: number;
  netCollected: number;
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

  const contributionProfit = round2(grossProfit - fee.economicCost - shipping.absorbed - variableCosts.total);
  const contributionMargin = netRevenue > 0 ? contributionProfit / netRevenue : 0;
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0;

  return {
    id: o.id, number: o.number, dateISO: o.dateISO, customerName: o.customerName,
    revenue, refunds, netRevenue, cogs, cogsSource, grossProfit,
    cogsRevenueCovered: round2(cogsRevenueCovered), cogsRevenueTotal: round2(cogsRevenueTotal),
    fee, shipping, variableCosts, contributionProfit, contributionMargin, grossMargin,
    grossCollected: revenue,
    netCollected: round2(fee.netReceived),
    complete: !cogsMissing && fee.source !== 'missing',
  };
}

// ─── Agregado del período ─────────────────────────────────────────────────────

export interface FinanceSummary {
  revenue: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  paymentFees: number;
  shippingAbsorbed: number;
  variableCosts: number;
  contributionProfit: number;
  contributionMargin: number;
  // Caja
  grossCollected: number;
  netCollected: number;
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
    paymentFees = 0, shippingAbsorbed = 0, variableCosts = 0, contributionProfit = 0,
    grossCollected = 0, netCollected = 0;
  // coverage: fees/shipping/variable por netRevenue del pedido; COGS por revenue
  // de LÍNEA (misma definición que el Dashboard, más honesta que a nivel pedido).
  let covBase = 0, feesKnown = 0, shipKnown = 0, varKnown = 0;
  let cogsLineTotal = 0, cogsLineKnown = 0;

  for (const p of profits) {
    revenue += p.revenue; refunds += p.refunds; netRevenue += p.netRevenue;
    cogs += p.cogs; grossProfit += p.grossProfit;
    paymentFees += p.fee.economicCost; shippingAbsorbed += p.shipping.absorbed;
    variableCosts += p.variableCosts.total; contributionProfit += p.contributionProfit;
    grossCollected += p.grossCollected; netCollected += p.netCollected;
    const base = p.netRevenue;
    covBase += base;
    cogsLineTotal += p.cogsRevenueTotal; cogsLineKnown += p.cogsRevenueCovered;
    if (p.fee.source !== 'missing') feesKnown += base;
    if (p.shipping.realSource !== 'missing') shipKnown += base;
    if (p.variableCosts.source !== 'missing') varKnown += base;
  }

  const cov = (known: number) => (covBase > 0 ? known / covBase : 0);
  const cogsCov = cogsLineTotal > 0 ? cogsLineKnown / cogsLineTotal : 0;
  return {
    revenue: round2(revenue), refunds: round2(refunds), netRevenue: round2(netRevenue),
    cogs: round2(cogs), grossProfit: round2(grossProfit),
    grossMargin: netRevenue > 0 ? round2(grossProfit) / round2(netRevenue) : 0,
    paymentFees: round2(paymentFees), shippingAbsorbed: round2(shippingAbsorbed),
    variableCosts: round2(variableCosts), contributionProfit: round2(contributionProfit),
    contributionMargin: netRevenue > 0 ? round2(contributionProfit) / round2(netRevenue) : 0,
    grossCollected: round2(grossCollected), netCollected: round2(netCollected),
    effectiveFeeRate: grossCollected > 0 ? round2(paymentFees) / round2(grossCollected) : 0,
    orders: profits.length,
    coverage: { cogs: cogsCov, fees: cov(feesKnown), shipping: cov(shipKnown), variable: cov(varKnown) },
  };
}
