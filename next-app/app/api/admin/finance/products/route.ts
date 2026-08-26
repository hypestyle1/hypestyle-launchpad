import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { fetchFinanceOrders } from '@/lib/finance/fetch-orders';
import { loadFinanceConfig } from '@/lib/finance/load-config';
import { computeOrderProfit } from '@/lib/finance/calculations';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Rentabilidad por producto. COGS/Gross son exactos por línea; fees/shipping/
// variable son del PEDIDO, así que la contribución por producto se ATRIBUYE
// (allocated) proporcional al revenue de la línea. Se marca 'allocated' para no
// confundirla con un costo exacto del producto.
export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const s = sp.get('start') ? Date.parse(sp.get('start')!) : NaN;
  const e = sp.get('end') ? Date.parse(sp.get('end')!) : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
  }

  try {
    const [cfg, costMap, { orders }] = await Promise.all([
      loadFinanceConfig(), getCostMap(), fetchFinanceOrders(new Date(s).toISOString(), new Date(e).toISOString()),
    ]);

    const acc = new Map<number, {
      name: string; units: number; revenue: number; cogs: number; hasCost: boolean; allocated: number;
    }>();

    for (const o of orders) {
      const p = computeOrderProfit(o, costMap.costOf, cfg);
      const orderDeductions = p.fee.economicCost + p.shipping.absorbed + p.variableCosts.total;
      const base = p.netRevenue || 1;
      for (const li of o.lineItems) {
        const cur = acc.get(li.productId) || { name: li.name || `#${li.productId}`, units: 0, revenue: 0, cogs: 0, hasCost: true, allocated: 0 };
        if (li.name) cur.name = li.name;
        cur.units += li.quantity || 0;
        cur.revenue += li.lineTotal || 0;
        const unit = costMap.costOf(li.productId);
        if (unit === undefined) cur.hasCost = false;
        else cur.cogs += unit * (li.quantity || 0);
        cur.allocated += orderDeductions * ((li.lineTotal || 0) / base); // proporción del revenue de la línea
        acc.set(li.productId, cur);
      }
    }

    const products = [...acc.entries()].map(([productId, v]) => {
      const revenue = round2(v.revenue);
      const cogs = v.hasCost ? round2(v.cogs) : null;
      const grossProfit = cogs === null ? null : round2(revenue - cogs);
      return {
        productId, name: v.name, units: v.units, revenue,
        cogs, grossProfit,
        grossMargin: grossProfit === null || revenue === 0 ? null : grossProfit / revenue,
        allocatedContribution: grossProfit === null ? null : round2(grossProfit - v.allocated),
        allocated: true,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ products });
  } catch (e: any) {
    console.error('[finance/products]', e?.message || e);
    return NextResponse.json({ error: 'No se pudieron calcular productos' }, { status: 502 });
  }
}
