import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { fetchFinanceOrders } from '@/lib/finance/fetch-orders';
import { loadFinanceConfig } from '@/lib/finance/load-config';
import { computeOrderProfit } from '@/lib/finance/calculations';

export const dynamic = 'force-dynamic';

// Rentabilidad por pedido. Devuelve la cascada ya calculada por pedido (server-side).
// El período está acotado por el fetch; el cliente filtra/pagina sobre lo devuelto.
export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const start = sp.get('start'), end = sp.get('end');
  const s = start ? Date.parse(start) : NaN, e = end ? Date.parse(end) : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
  }

  try {
    const [cfg, costMap, { orders, truncated }] = await Promise.all([
      loadFinanceConfig(), getCostMap(), fetchFinanceOrders(new Date(s).toISOString(), new Date(e).toISOString()),
    ]);
    const rows = orders.map((o) => {
      const p = computeOrderProfit(o, costMap.costOf, cfg);
      return {
        id: p.id, number: p.number, date: p.dateISO, customerName: p.customerName,
        paymentMethod: o.paymentMethod, paymentTitle: o.paymentTitle,
        revenue: p.revenue, refunds: p.refunds, netRevenue: p.netRevenue,
        cogs: p.cogs, cogsSource: p.cogsSource, grossProfit: p.grossProfit,
        fee: { provider: p.fee.provider, group: p.fee.group, economicCost: p.fee.economicCost, netReceived: p.fee.netReceived, otherCashDeduction: p.fee.otherCashDeduction, source: p.fee.source },
        shipping: { charged: p.shipping.charged, realCost: p.shipping.realCost, absorbed: p.shipping.absorbed, difference: p.shipping.difference, realSource: p.shipping.realSource },
        variableCosts: { total: p.variableCosts.total, source: p.variableCosts.source, items: p.variableCosts.items },
        contributionProfit: p.contributionProfit, contributionMargin: p.contributionMargin,
        grossCollected: p.grossCollected, netCollected: p.netCollected,
        complete: p.complete,
      };
    });
    return NextResponse.json({ orders: rows, truncated });
  } catch (e: any) {
    console.error('[finance/orders]', e?.message || e);
    return NextResponse.json({ error: 'No se pudieron traer los pedidos' }, { status: 502 });
  }
}
