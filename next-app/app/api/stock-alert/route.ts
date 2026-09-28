import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProducts } from '@/lib/products-server';
import {
  cleanStockAlertInput, validateStockAlert, saveStockAlert, STOCK_ALERT_ERROR_TEXT,
} from '@/lib/stock-alerts';

export const dynamic = 'force-dynamic';

// "Avisame cuando vuelva": alta pública de un aviso de stock. El navegador
// llega hasta acá; el secreto y WordPress quedan del lado del servidor.
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  // Campo trampa: las personas no lo ven, los bots lo completan. Se responde
  // ok para no darles una señal de que fueron detectados.
  if (typeof (body as any)?.website === 'string' && (body as any).website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const input = cleanStockAlertInput(body);

  let products;
  try { products = await fetchAllProducts(); }
  catch { return NextResponse.json({ error: 'No pudimos guardar el aviso. Probá de nuevo.' }, { status: 502 }); }

  const check = validateStockAlert(input, products);
  if ('error' in check) {
    return NextResponse.json({ error: STOCK_ALERT_ERROR_TEXT[check.error], code: check.error }, { status: 400 });
  }

  const res = await saveStockAlert(input, check.product.name);
  if (!res.ok) {
    console.error('[stock-alert] WP respondió', res.status, res.data);
    return NextResponse.json({ error: 'No pudimos guardar el aviso. Probá de nuevo.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
