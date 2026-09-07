// Disponibilidad de un ítem del pedido mayorista al momento de confirmarlo.
//
// El catálogo (/mayoristas) ya esconde lo que no está publicado o quedó sin
// stock, pero el carrito y los borradores guardados sobreviven a eso: el
// 07/09/2026 un mayorista confirmó un SHOOT FOR THE STARS - HOODIE talle M
// que en Woo estaba privado y con stock 0 — la orden se creó igual y la
// variación quedó en -1. La validación tiene que vivir del lado del server,
// en el mismo lugar donde se arma la orden.

export interface StockInfo {
  status?: string | null;          // WC: publish | private | draft | pending | trash
  stockStatus?: string | null;     // WC: instock | outofstock | onbackorder
  manageStock?: boolean | string | null; // WC: true | false | 'parent' (variaciones)
  stockQuantity?: number | null;
}

export type Unavailable =
  | { reason: 'not-published' }
  | { reason: 'out-of-stock' }
  | { reason: 'insufficient'; available: number };

/**
 * Por qué NO se puede vender `quantity` unidades de esta combinación, o null
 * si está disponible. `product` es el padre; `variation` la variación
 * elegida (si el producto es variable y el talle/color matcheó una).
 */
export function unavailableReason(
  product: StockInfo,
  variation: StockInfo | null,
  quantity: number,
): Unavailable | null {
  if (product.status && product.status !== 'publish') return { reason: 'not-published' };

  // El stock manda desde la variación cuando existe; si la variación delega
  // en el padre ('parent' / false), vale el del producto.
  const src = variation && variation.manageStock === true ? variation : product;
  const stockStatus = (variation?.stockStatus ?? product.stockStatus ?? 'instock').toLowerCase();
  if (stockStatus === 'outofstock') return { reason: 'out-of-stock' };

  if (src.manageStock === true && typeof src.stockQuantity === 'number') {
    if (src.stockQuantity <= 0) return { reason: 'out-of-stock' };
    if (src.stockQuantity < quantity) return { reason: 'insufficient', available: src.stockQuantity };
  }
  return null;
}

/** Texto para el cliente: "NOMBRE (talle M)" + el motivo. */
export function unavailableMessage(name: string, size: string, why: Unavailable): string {
  const label = size && size.toLowerCase() !== 'única' ? `${name} (talle ${size})` : name;
  switch (why.reason) {
    case 'not-published': return `${label} ya no está disponible en el catálogo.`;
    case 'out-of-stock':  return `${label} se quedó sin stock.`;
    case 'insufficient':  return `${label}: quedan ${why.available} unidades.`;
  }
}
