import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { resolveProducts, findUnavailable, type StockLine } from '@/lib/mayorista-stock';
import { priceLines } from '@/lib/mayorista-pricing';

// POST { items: [{ slug, name, size, color?, quantity, price? }] }
//   -> { unavailable: [{ slug, size, color?, reason, available?, message }],
//        prices: [{ slug, size, color?, unitPrice }] }
//
// El carrito lo llama al hidratar y al cargar un borrador: lo que ya no está
// publicado o quedó sin stock se saca (o se recorta) antes de que el cliente
// llegue a confirmar. /api/mayorista/pedido repite el chequeo igual — esto es
// para que el cliente no se entere recién al final.
//
// `prices` trae el precio mayorista vigente de cada línea (50% del
// regular_price de Woo, calculado en el servidor) para que un carrito o
// borrador viejo se actualice solo. El precio que guarda el carrito nunca se
// cobra: /api/mayorista/pedido vuelve a calcularlo.
export async function POST(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  let items: StockLine[];
  try {
    ({ items } = await req.json());
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }
  if (!Array.isArray(items)) return NextResponse.json({ message: 'Faltan items' }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ unavailable: [], prices: [] });
  if (items.length > 200) return NextResponse.json({ message: 'Demasiados items' }, { status: 400 });

  const lines: StockLine[] = items.map((i) => ({
    slug: String(i.slug ?? ''),
    name: String(i.name ?? i.slug ?? ''),
    size: String(i.size ?? ''),
    ...(i.color ? { color: String(i.color) } : {}),
    quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
  })).filter(l => l.slug);

  try {
    const resolved = await resolveProducts(lines.map(l => l.slug));
    const priced = priceLines(lines, resolved);
    return NextResponse.json({
      unavailable: findUnavailable(lines, resolved),
      prices: priced.lines.map(l => ({ slug: l.slug, size: l.size, ...(l.color ? { color: l.color } : {}), unitPrice: l.unitPrice })),
    });
  } catch (err) {
    console.error('[mayorista/disponibilidad]', err);
    return NextResponse.json({ message: 'No se pudo verificar el stock' }, { status: 502 });
  }
}
