/**
 * Precio vigente de las líneas del carrito.
 *
 * El carrito guarda el precio en localStorage al momento de agregar. Si después
 * el precio cambia en Woo (fin de una liquidación, apertura de un drop), el
 * carrito y el checkout seguían mostrando el viejo, mientras que el servidor
 * cobra el actual (lib/precio-servidor.ts, desde el PR #512). Caso 10/10:
 * FIND JESUS en el carrito a $45.000, de vuelta a $67.000 en la tienda; el
 * checkout mostró $41.556 y el pedido salió $59.156.
 *
 * Acá se pisa el precio guardado con el del catálogo (la misma fuente que usa el
 * servidor para cobrar) y se devuelve qué cambió para avisarlo.
 */
import type { CartItem } from '@/context/CartContext';
import { GIFT_CARD_SLUG } from '@/lib/gift-card';
import { GOAL_PRODUCT_SLUG } from '@/lib/goal-discount';

export type CambioDePrecio = { id: string; name: string; size: string; antes: number; ahora: number };

/**
 * Quedan como están:
 * - la línea de regalo (precio 0 por definición) y la gift card (el monto lo
 *   elige el cliente);
 * - La Nuestra: el descuento por gol se aplica encima del catálogo y el
 *   servidor cobra el menor de los dos;
 * - lo que no está en el catálogo cargado (no hay contra qué comparar: lo
 *   resuelve el servidor).
 */
export function repriceCart(
  items: CartItem[],
  catalogo: Map<string, number>,
): { items: CartItem[]; cambios: CambioDePrecio[] } {
  const cambios: CambioDePrecio[] = [];
  const out = items.map((it) => {
    if (it.isGift || it.id === GIFT_CARD_SLUG || it.id === GOAL_PRODUCT_SLUG) return it;
    const vigente = catalogo.get(it.id);
    if (!vigente || !(vigente > 0) || vigente === it.price) return it;
    cambios.push({ id: it.id, name: it.name, size: it.size, antes: it.price, ahora: vigente });
    return { ...it, price: vigente };
  });
  return { items: cambios.length ? out : items, cambios };
}
