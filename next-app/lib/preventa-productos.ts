/**
 * Productos en PREVENTA con fecha de entrega estimada.
 *
 * Solo es una capa de COMUNICACIÓN en la ficha (nota junto al precio y en lugar
 * de la línea de despacho). No cambia el carrito, el checkout ni el stock: lo
 * comprable lo decide Woo (precio, stock y backorders de cada variación).
 *
 * `desde`: a partir de cuándo se muestra la nota. Así un merge anticipado no
 * marca como preventa una ficha que todavía se vende normal.
 */
export interface PreventaProducto {
  nota: string;
  desde: string;
}

/** Apertura de la preventa Camo: se adelantó de las 20:00 al momento de
 *  publicar (04/11 ~18 h, pedido de Valentín: nada programado). */
export const CAMO_PREVENTA_LANZAMIENTO = '2026-11-04T17:45:00-03:00';

const CAMO: PreventaProducto = {
  nota: 'PREVENTA · Entrega estimada a partir del viernes 13 de noviembre de 2026.',
  desde: CAMO_PREVENTA_LANZAMIENTO,
};

export const PREVENTA_PRODUCTOS: Record<string, PreventaProducto> = {
  'zip-hoodie-camo': CAMO, // #916 — Brown (restock, conserva ficha y URL)
  'zip-hoodie-camo-olive': CAMO,
  'jort-camo-olive': CAMO,
  'jort-camo-brown': CAMO,
};

export function preventaDe(slug: string, ahora: Date = new Date()): PreventaProducto | null {
  const p = PREVENTA_PRODUCTOS[slug];
  if (!p) return null;
  return ahora.getTime() >= new Date(p.desde).getTime() ? p : null;
}
