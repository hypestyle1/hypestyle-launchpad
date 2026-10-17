/**
 * Reintentos de pago sin pedidos duplicados (auditoría 17/10).
 *
 * Hasta ahora, cada clic en "Pagar" después de un error de pasarela creaba un
 * pedido NUEVO en Woo: el wcOrderId guardado en sessionStorage no se
 * reutilizaba. De ahí salen los clusters de 5-20 pending del mismo cliente.
 *
 * La regla de reutilización es deliberadamente conservadora: solo se reusa un
 * pedido cuando NADA que afecte plata cambió. Ante cualquier duda se crea un
 * pedido nuevo, que es el comportamiento de siempre (el PR de pendientes se
 * encarga de la limpieza). Nunca se reusa un pedido pagado, cancelado, de
 * otra sesión (order_key) o de otro email.
 */

export type LineaComparable = {
  product_id?: number;
  variation_id?: number;
  quantity: number;
  /** total de la línea en pesos, como string Woo ("67000.00") o número */
  total: string | number;
};

export type PedidoExistente = {
  id: number;
  number?: string | number;
  status: string;
  created_via?: string;
  order_key: string;
  date_created_gmt?: string;
  billing?: { email?: string };
  line_items?: LineaComparable[];
  total?: string;
};

const MAX_EDAD_MS = 24 * 60 * 60_000;

/** Firma del carrito: qué se compra y por cuánto, sin orden ni líneas de regalo ($0). */
export function firmaCarrito(lineas: LineaComparable[]): string {
  return lineas
    .filter((l) => Math.round(Number(l.total)) > 0)
    .map((l) => `${l.product_id ?? 0}:${l.variation_id ?? 0}:${l.quantity}:${Math.round(Number(l.total))}`)
    .sort()
    .join('|');
}

export function puedeReusarPedido(args: {
  pedido: PedidoExistente;
  orderKey: string;
  email: string;
  lineasNuevas: LineaComparable[];
  totalNuevo: number;
  conCupon: boolean;
  ahora?: number;
}): { reusar: boolean; motivo: string } {
  const { pedido, orderKey, email, lineasNuevas, totalNuevo, conCupon } = args;
  const ahora = args.ahora ?? Date.now();

  // Con cupón no se reusa: el cupo/validez del código lo resuelve Woo al
  // crear, y re-aplicarlo sobre un pedido existente tiene demasiados bordes.
  if (conCupon) return { reusar: false, motivo: 'pedido con cupón' };
  if (pedido.status !== 'pending') return { reusar: false, motivo: `status ${pedido.status}` };
  if ((pedido.created_via ?? '') !== 'rest-api') return { reusar: false, motivo: 'no lo creó el checkout' };
  if (!orderKey || pedido.order_key !== orderKey) return { reusar: false, motivo: 'order_key no coincide' };

  const emailPedido = (pedido.billing?.email ?? '').trim().toLowerCase();
  if (!email || emailPedido !== email.trim().toLowerCase()) {
    return { reusar: false, motivo: 'email distinto' };
  }

  if (pedido.date_created_gmt) {
    const edad = ahora - new Date(pedido.date_created_gmt + 'Z').getTime();
    if (!(edad >= 0 && edad <= MAX_EDAD_MS)) return { reusar: false, motivo: 'pedido viejo' };
  }

  if (firmaCarrito(pedido.line_items ?? []) !== firmaCarrito(lineasNuevas)) {
    return { reusar: false, motivo: 'el carrito cambió' };
  }
  // El total cierra el resto (envío, descuento por método): si cambió el
  // método de pago con otro costo (ej. transferencia -10%), pedido nuevo.
  if (Math.round(Number(pedido.total ?? -1)) !== Math.round(totalNuevo)) {
    return { reusar: false, motivo: 'el total cambió' };
  }

  return { reusar: true, motivo: 'mismo carrito, mismo total, misma sesión' };
}
