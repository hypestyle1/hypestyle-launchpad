import { NextRequest, NextResponse } from 'next/server';
import { PRIVATE_ACCESS_COOKIE, isPrivateAccessActive } from '@/lib/private-access/config';
import { verifySessionToken } from '@/lib/private-access/session';
import { fetchPrivateStock, getPrivateAccessConfig } from '@/lib/private-access/server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * GET ?slug= → stock en vivo por talle de un producto privado. Solo con sesión
 * válida: sin cookie no se revela ni si el producto existe. Reemplaza al
 * checkStock por GraphQL público, que no ve los productos privados.
 */
export async function GET(req: NextRequest) {
  const config = await getPrivateAccessConfig();
  const session = isPrivateAccessActive(config)
    ? await verifySessionToken(req.cookies.get(PRIVATE_ACCESS_COOKIE)?.value)
    : null;
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });

  const slug = (req.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
  const stock = await fetchPrivateStock(slug);
  if (!stock) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ slug, stock }, { headers: NO_STORE });
}
