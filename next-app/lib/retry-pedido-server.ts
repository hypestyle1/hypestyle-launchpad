import {
  puedeReusarPedido, type LineaComparable, type PedidoExistente,
} from '@/lib/retry-pedido';

/**
 * Busca el pedido del intento anterior y decide si se puede reutilizar
 * (auditoría 17/10). La regla vive en lib/retry-pedido.ts; acá solo está la
 * consulta a Woo y el fail-open: si la consulta falla, se crea un pedido
 * nuevo, que es el comportamiento de siempre. Nunca se pierde una venta por
 * esto.
 */
export async function pedidoReusable(args: {
  retry: { wcOrderId?: unknown; orderKey?: unknown } | undefined;
  email: string;
  lineasNuevas: LineaComparable[];
  totalNuevo: number;
  conCupon: boolean;
  wpUrl: string;
  authHeader: string;
  etiqueta: string;
}): Promise<PedidoExistente | null> {
  const { retry, wpUrl, authHeader, etiqueta } = args;
  const id = Number(retry?.wcOrderId);
  const orderKey = String(retry?.orderKey ?? '');
  if (!Number.isInteger(id) || id <= 0 || !orderKey) return null;

  try {
    const res = await fetch(`${wpUrl}/wp-json/wc/v3/orders/${id}`, {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const pedido = (await res.json()) as PedidoExistente;

    const { reusar, motivo } = puedeReusarPedido({
      pedido,
      orderKey,
      email: args.email,
      lineasNuevas: args.lineasNuevas,
      totalNuevo: args.totalNuevo,
      conCupon: args.conCupon,
    });
    if (!reusar) {
      console.info(`[${etiqueta}] reintento: pedido nuevo (${motivo})`);
      return null;
    }
    console.info(`[${etiqueta}] reintento: se reusa el pedido ${pedido.id}`);
    return pedido;
  } catch (e) {
    console.warn(`[${etiqueta}] reintento: no se pudo leer el pedido anterior`, e);
    return null;
  }
}
