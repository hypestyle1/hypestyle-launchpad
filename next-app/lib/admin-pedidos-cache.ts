/**
 * Lo que /admin/pedidos ya trajo de WooCommerce vive acá, en memoria, hasta que
 * se recarga la página (F5), se toca "Actualizar" o se escribe algo. Ni volver
 * a la pestaña desde el portal de Andreani, ni ir al detalle de un pedido y
 * volver disparan una consulta: cada lista de ~479 pedidos son varios segundos
 * de WP en Hostinger.
 *
 * Está a nivel módulo (no en un ref) para sobrevivir al remontaje de la página
 * en la navegación interna. Por eso mismo, TODA escritura sobre pedidos hecha
 * desde otra pantalla (detalle, cargar pedido, reembolso) tiene que pasar por
 * `fetchQueEscribe`: si no, al volver a la lista se vería el estado anterior.
 */
export const pedidosCache = {
  /** Respuestas de /api/admin/orders por clave de consulta. */
  orders: new Map<string, { at: number; data: unknown }>(),
  /** Respuesta de /api/admin/orders/counts (sólo si vino completa). */
  counts: null as unknown,
  /** Respuesta de /api/admin/pod-pendientes. */
  pod: null as unknown,
};

/** Todo lo guardado deja de valer: lo que hay en Woo cambió (o cambió la clave). */
export function invalidarCachePedidos() {
  pedidosCache.orders.clear();
  pedidosCache.counts = null;
  pedidosCache.pod = null;
}

/** fetch para escrituras sobre pedidos: invalida el caché de la lista antes de escribir. */
export function fetchQueEscribe(input: RequestInfo | URL, init?: RequestInit) {
  invalidarCachePedidos();
  return fetch(input, init);
}
