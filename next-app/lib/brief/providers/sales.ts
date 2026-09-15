// Ventas de los últimos 30 días: la misma lectura que la portada (mismos
// pedidos pagados, mismas fórmulas de lib/dashboard/finance). Da el piso del
// brief (1 % del revenue), el top de productos y el breakeven ROAS.

import { fetchOrdersInRange } from '@/lib/dashboard/wc-orders';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { computeSummary, computeTopProducts } from '@/lib/dashboard/finance';
import type { BriefProvider } from '../types';

const DAYS = 30;

export const salesProvider: BriefProvider<'sales.30d'> = {
  key: 'sales.30d',
  domain: 'stock',
  async load(ctx) {
    const endUTC = ctx.now.toISOString();
    const startUTC = new Date(ctx.now.getTime() - DAYS * 86_400_000).toISOString();
    const [costMap, { orders, truncated }] = await Promise.all([
      getCostMap(),
      fetchOrdersInRange(startUTC, endUTC, { onlyPaid: true }),
    ]);
    const s = computeSummary(orders, costMap.costOf);
    return {
      startUTC, endUTC, days: DAYS,
      revenue: s.revenue, netRevenue: s.netRevenue, contributionProfit: s.contributionProfit,
      orders: s.orders, aov: s.aov,
      topProducts: computeTopProducts(orders, costMap.costOf, ctx.config.stock.topN),
      truncated,
    };
  },
};
