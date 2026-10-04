/**
 * Total a cobrar de un pedido de WooCommerce, para las pasarelas que arman el
 * cobro desde Next (PayPal, GOcuotas). Mismo criterio que /api/mp-preference:
 * el monto sale del pedido, nunca de lo que mande el navegador.
 */
const NO_COBRABLE = new Set(['processing', 'completed', 'cancelled', 'refunded', 'trash']);

export type TotalCobrable =
  | { ok: true; total: number }
  | { ok: false; status: number; error: string };

export function totalCobrable(order: { status?: unknown; total?: unknown } | null | undefined): TotalCobrable {
  if (!order) return { ok: false, status: 400, error: 'Pedido inexistente' };
  if (NO_COBRABLE.has(String(order.status))) return { ok: false, status: 409, error: 'El pedido no admite pago' };
  const total = Number(order.total);
  if (!(total > 0)) return { ok: false, status: 409, error: 'Pedido sin total' };
  return { ok: true, total };
}
