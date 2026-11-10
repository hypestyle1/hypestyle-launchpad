/**
 * Productos en PREVENTA con fecha de entrega estimada.
 *
 * Solo es una capa de COMUNICACIÓN en la ficha (nota junto al precio y en lugar
 * de la línea de despacho). No cambia el carrito, el checkout ni el stock: lo
 * comprable lo decide Woo (precio, stock y backorders de cada variación).
 *
 * `desde`: a partir de cuándo se muestra la nota. Así un merge anticipado no
 * marca como preventa una ficha que todavía se vende normal.
 * `hasta` (opcional, exclusivo): desde ese momento la nota deja de mostrarse
 * sola, sin deploy (9/11, pedido de Valentín: "cuando pase la fecha que se
 * borre automático").
 */
export interface PreventaProducto {
  nota: string;
  desde: string;
  hasta?: string;
}

/** Apertura de la preventa Camo: se adelantó de las 20:00 al momento de
 *  publicar (04/11 ~18 h, pedido de Valentín: nada programado). */
export const CAMO_PREVENTA_LANZAMIENTO = '2026-11-04T17:45:00-03:00';

/** Fin de la comunicación de preventa Camo: el viernes 13/11 es la fecha de
 *  entrega. Desde el sábado 14/11 00:00 ART la ficha y la colección se leen
 *  como producto normal, solas. */
export const CAMO_PREVENTA_FIN = '2026-11-14T00:00:00-03:00';

const CAMO: PreventaProducto = {
  nota: 'PREVENTA · Entrega estimada a partir del viernes 13 de noviembre de 2026.',
  desde: CAMO_PREVENTA_LANZAMIENTO,
  hasta: CAMO_PREVENTA_FIN,
};

/** ¿La preventa Camo se comunica en este momento? */
export function camoEnPreventa(ahora: Date = new Date()): boolean {
  const t = ahora.getTime();
  return t >= new Date(CAMO_PREVENTA_LANZAMIENTO).getTime() && t < new Date(CAMO_PREVENTA_FIN).getTime();
}

export const PREVENTA_PRODUCTOS: Record<string, PreventaProducto> = {
  'zip-hoodie-camo': CAMO, // #916 — Brown (restock, conserva ficha y URL)
  'zip-hoodie-camo-olive': CAMO,
  'jort-camo-olive': CAMO,
  'jort-camo-brown': CAMO,
};

export function preventaDe(slug: string, ahora: Date = new Date()): PreventaProducto | null {
  const p = PREVENTA_PRODUCTOS[slug];
  if (!p) return null;
  const t = ahora.getTime();
  if (t < new Date(p.desde).getTime()) return null;
  if (p.hasta && t >= new Date(p.hasta).getTime()) return null;
  return p;
}
