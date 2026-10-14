import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { wcGet, resolveProducts, findUnavailable, findVariation, type StockLine, type ResolvedProduct } from '@/lib/mayorista-stock';
import { priceLines } from '@/lib/mayorista-pricing';
import { applyCampaign, appliedCampaignMinOrder } from '@/lib/wholesale-campaigns';
import { readCampaigns } from '@/lib/wholesale-campaigns-store';
import { mayoristaDropTag } from '@/lib/mayorista-drop-server';
import { resolveMinOrder, customerMinOrderOverride } from '@/lib/mayorista-settings';

// POST { items: [{ slug, name, size, color?, quantity, price? }] }
//   -> { unavailable: [{ slug, size, color?, reason, available?, message }],
//        prices: [{ slug, size, color?, unitPrice, wsRegular, campaign? }],
//        minOrder: number | null }
//
// `minOrder` es el mínimo que va a validar /api/mayorista/pedido para ESTAS
// líneas (override del cliente, si no el de la campaña aplicada, si no el
// general): el perfil no conoce el carrito, así que el de campaña solo puede
// salir de acá. null = no se pudo leer; el carrito no deja continuar.
//
// El carrito lo llama al hidratar y al cargar un borrador: lo que ya no está
// publicado o quedó sin stock se saca (o se recorta) antes de que el cliente
// llegue a confirmar. /api/mayorista/pedido repite el chequeo igual — esto es
// para que el cliente no se entere recién al final.
//
// `prices` trae el precio mayorista vigente de cada línea (50% del
// regular_price de Woo, con el descuento de campaña si hay una vigente),
// calculado en el servidor, para que un carrito o borrador viejo se actualice
// solo. El precio que guarda el carrito nunca se cobra: /api/mayorista/pedido
// vuelve a calcularlo.
function availableOf(resolved: ResolvedProduct | null | undefined, line: StockLine): number | null {
  if (!resolved) return null;
  const v = findVariation(resolved, line);
  const src = v && v.stock.manageStock === true ? v.stock : resolved.stock;
  return src.manageStock === true && typeof src.stockQuantity === 'number' ? src.stockQuantity : null;
}

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
    const dropTag = await mayoristaDropTag().catch(() => null);
    const resolved = await resolveProducts(lines.map(l => l.slug), dropTag);
    // Acá una falla leyendo campañas no frena nada: es un aviso previo. El
    // pedido sí exige leerlas.
    const campaigns = await readCampaigns().catch((e) => { console.error('[mayorista/disponibilidad] campañas:', e); return []; });
    const priced = applyCampaign(priceLines(lines, resolved), campaigns);
    // Si el cliente no se pudo leer, el override queda en null y rige el
    // general: el pedido vuelve a leer el override igual.
    const customer = await wcGet(`customers/${customerId}?_fields=meta_data`).catch((e) => { console.error('[mayorista/disponibilidad] cliente:', e); return null; });
    const minOrder = await resolveMinOrder({
      override: customerMinOrderOverride(customer?.meta_data),
      campaignMin: appliedCampaignMinOrder(priced, campaigns),
    });
    return NextResponse.json({
      minOrder,
      unavailable: findUnavailable(lines, resolved),
      prices: priced.lines.map(l => ({
        slug: l.slug, size: l.size, ...(l.color ? { color: l.color } : {}),
        unitPrice: l.unitPrice, wsRegular: l.wsRegular,
        // Unidades disponibles de esta combinación hoy (null = sin cantidad
        // gestionada): el carrito no deja pasar el "+" de ahí.
        available: availableOf(resolved.get(l.slug), l),
        ...(l.campaign ? { campaign: { id: l.campaign.campaignId, name: l.campaign.campaignName, group: l.campaign.group, discount: l.campaign.discount, badge: l.campaign.badge } } : {}),
      })),
    });
  } catch (err) {
    console.error('[mayorista/disponibilidad]', err);
    return NextResponse.json({ message: 'No se pudo verificar el stock' }, { status: 502 });
  }
}
