import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchOrdersInRange } from '@/lib/dashboard/wc-orders';
import { classifyCustomers, type CustomerOrder } from '@/lib/dashboard/finance';

export const dynamic = 'force-dynamic';

// Piso de historial: la tienda empezó a operar en 2026. Traer desde acá cubre
// el "primer pedido" de cualquier cliente para clasificar nuevo vs recurrente
// de forma fiable, sin fetch ilimitado. Woo es la fuente; no hay base paralela.
const HISTORY_FLOOR = '2026-01-01T00:00:00.000Z';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  const s = start ? Date.parse(start) : NaN;
  const e = end ? Date.parse(end) : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
    return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
  }

  try {
    // Historial de pagados desde el piso hasta el fin del período.
    const { orders, truncated } = await fetchOrdersInRange(HISTORY_FLOOR, new Date(e).toISOString(), { onlyPaid: true });
    const history: CustomerOrder[] = orders.map((o) => ({
      customerKey: o.customerKey,
      ms: Date.parse(o.dateGmt),
      total: o.total,
    }));
    const split = classifyCustomers(history, s, e);
    return NextResponse.json({ ...split, truncated });
  } catch (err: any) {
    console.error('[dashboard/customers]', err?.message || err);
    return NextResponse.json({ error: 'No se pudo calcular clientes' }, { status: 502 });
  }
}
