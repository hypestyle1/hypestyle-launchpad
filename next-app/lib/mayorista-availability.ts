// Disponibilidad de un ítem del pedido mayorista al momento de confirmarlo.
//
// El catálogo (/mayoristas) ya esconde lo que no está publicado o quedó sin
// stock, pero el carrito y los borradores guardados sobreviven a eso: el
// 07/09/2026 un mayorista confirmó un SHOOT FOR THE STARS - HOODIE talle M
// que en Woo estaba privado y con stock 0 — la orden se creó igual y la
// variación quedó en -1. La validación tiene que vivir del lado del server,
// en el mismo lugar donde se arma la orden.

//
// 13/10/2026: además, sin cantidad cargada no hay venta. Ocho modelos del drop
// SS27 estaban publicados sin gestión de stock y el portal los ofrecía como
// ilimitados. Lo mismo para el tag `proximamente`: se ve, no se pide.

export interface StockInfo {
  status?: string | null;          // WC: publish | private | draft | pending | trash
  stockStatus?: string | null;     // WC: instock | outofstock | onbackorder
  manageStock?: boolean | string | null; // WC: true | false | 'parent' (variaciones)
  stockQuantity?: number | null;
  /** Solo en el producto: tag `proximamente` (todavía no se vende). */
  comingSoon?: boolean;
}

export type Unavailable =
  | { reason: 'not-published' }
  | { reason: 'coming-soon' }
  | { reason: 'unconfirmed' }
  | { reason: 'out-of-stock' }
  | { reason: 'insufficient'; available: number };

export interface AvailabilityOptions {
  /**
   * Regla del portal mayorista: sin cantidad gestionada no hay stock
   * confirmado y no se vende (ni aunque Woo diga "instock"), y el tag
   * `proximamente` tampoco se vende. La tienda minorista (lib/repago.ts) no
   * la usa: ahí "instock" sin gestión sigue alcanzando.
   */
  requireConfirmedStock?: boolean;
}

/** Motivos que pueden salir sin `requireConfirmedStock` (lo que ve la tienda minorista). */
export type UnavailableBasic = Exclude<Unavailable, { reason: 'coming-soon' | 'unconfirmed' }>;

/**
 * Por qué NO se puede vender `quantity` unidades de esta combinación, o null
 * si está disponible. `product` es el padre; `variation` la variación
 * elegida (si el producto es variable y el talle/color matcheó una).
 */
export function unavailableReason(product: StockInfo, variation: StockInfo | null, quantity: number): UnavailableBasic | null;
export function unavailableReason(product: StockInfo, variation: StockInfo | null, quantity: number, opts: AvailabilityOptions): Unavailable | null;
export function unavailableReason(
  product: StockInfo,
  variation: StockInfo | null,
  quantity: number,
  opts: AvailabilityOptions = {},
): Unavailable | null {
  if (product.status && product.status !== 'publish') return { reason: 'not-published' };
  if (opts.requireConfirmedStock && product.comingSoon) return { reason: 'coming-soon' };

  // El stock manda desde la variación cuando existe; si la variación delega
  // en el padre ('parent' / false), vale el del producto.
  const src = variation && variation.manageStock === true ? variation : product;
  const stockStatus = (variation?.stockStatus ?? product.stockStatus ?? 'instock').toLowerCase();
  if (stockStatus === 'outofstock') return { reason: 'out-of-stock' };

  const managed = src.manageStock === true && typeof src.stockQuantity === 'number';
  if (!managed) return opts.requireConfirmedStock ? { reason: 'unconfirmed' } : null;
  if (src.stockQuantity! <= 0) return { reason: 'out-of-stock' };
  if (src.stockQuantity! < quantity) return { reason: 'insufficient', available: src.stockQuantity! };
  return null;
}

/** Texto para el cliente: "NOMBRE (talle M)" + el motivo. */
export function unavailableMessage(name: string, size: string, why: Unavailable): string {
  const label = size && size.toLowerCase() !== 'única' ? `${name} (talle ${size})` : name;
  switch (why.reason) {
    case 'not-published': return `${label} ya no está disponible en el catálogo.`;
    case 'coming-soon':   return `${label} todavía no está a la venta.`;
    case 'unconfirmed':   return `${label} no tiene stock confirmado todavía.`;
    case 'out-of-stock':  return `${label} se quedó sin stock.`;
    case 'insufficient':  return `${label}: quedan ${why.available} unidades.`;
  }
}
