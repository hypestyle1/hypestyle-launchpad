import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchCustomerHistory } from '@/lib/dashboard/wc-orders';
import { classifyCustomers } from '@/lib/dashboard/finance';

export const dynamic = 'force-dynamic';
// Es el fetch más grande del panel: todo 2026, no el rango elegido.
export const maxDuration = 60;

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
    // Historial de pagados desde el piso hasta el fin del período, con la
    // proyección liviana: este cálculo sólo mira clave, fecha y total, así que
    // pedir line_items costaba 2,7x por página para tirarlos a la basura.
    const { history, truncated } = await fetchCustomerHistory(HISTORY_FLOOR, new Date(e).toISOString());
    const split = classifyCustomers(history, s, e);
    return NextResponse.json({ ...split, truncated });
  } catch (err: any) {
    console.error('[dashboard/customers]', err?.message || err);
    return NextResponse.json({ error: 'No se pudo calcular clientes' }, { status: 502 });
  }
}
