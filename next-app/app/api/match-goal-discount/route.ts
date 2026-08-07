import { NextRequest, NextResponse } from 'next/server';
import { syncDiscount, clearDiscount } from '@/lib/goal-discount';

// Aplica al jersey LA NUESTRA un descuento de 7% por cada gol de Argentina,
// válido 24h desde el primer gol o hasta vender 20 unidades pagas.
// Cron de Vercel cada ~2 min (vercel.json) como respaldo; en vivo lo dispara
// también el tráfico (widget en home + /api/goal-discount en el producto).

export const revalidate = 0;

const SECRET = (process.env.CRON_SECRET || '').trim();

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = sp.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET cargado el endpoint no se abre solo (este cambia
  // el precio del jersey, así que abierto es un descuento gratis para cualquiera).
  if (!SECRET || provided !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (sp.get('clear') === '1') return NextResponse.json(await clearDiscount());

  const test = sp.get('testGoals');
  const status = await syncDiscount(true, test != null ? Number(test) : undefined);
  return NextResponse.json({ ok: true, ...status });
}
