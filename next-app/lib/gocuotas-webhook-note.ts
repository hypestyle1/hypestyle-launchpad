/**
 * Texto de la nota que el webhook de GOcuotas deja en el pedido.
 *
 * Hasta el 17/09/2026 lo que devolvía GOcuotas solo iba a los logs de Vercel, que
 * se pierden a los pocos días. El audit de ese día encontró 31 pedidos `failed`
 * de 52 por este medio y no pudo separar rechazo crediticio de abandono: todos
 * caían entre 31 y 41 minutos después de creados (vencimiento del checkout de
 * GOcuotas), pero el estado y el detalle que mandó GOcuotas en cada uno ya no
 * existían en ningún lado. La nota queda en Woo, donde se lee desde el panel.
 *
 * Solo se copian campos conocidos y acotados. De cualquier otro campo se anota
 * el nombre, nunca el valor: el body no está firmado y no se sabe qué puede traer.
 */

const KNOWN_FIELDS = [
  'status', 'order_id', 'id', 'number_of_installments', 'installments',
  'amount_in_cents', 'reason', 'status_detail', 'message', 'error',
] as const;

const IDENTIFIER_FIELDS = new Set(['order_reference_id', 'commerce_order_id', 'orderId']);

function clean(value: unknown): string {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function gocuotasWebhookNote(
  body: Record<string, unknown>,
  orderCreatedGmt?: string | null,
  now: Date = new Date(),
): string {
  const parts: string[] = [];
  for (const key of KNOWN_FIELDS) {
    const v = body[key];
    if (v === undefined || v === null || v === '' || typeof v === 'object') continue;
    parts.push(`${key}=${clean(v)}`);
  }
  if (!parts.some(p => p.startsWith('status='))) parts.unshift('status=(sin status)');

  const others = Object.keys(body).filter(
    k => !(KNOWN_FIELDS as readonly string[]).includes(k) && !IDENTIFIER_FIELDS.has(k),
  );
  if (others.length) parts.push(`otros campos: ${others.slice(0, 12).map(clean).join(', ')}`);

  // Minutos desde que se creó el pedido: un rechazo llega en el momento, un
  // checkout que nadie terminó llega cuando GOcuotas lo da por vencido (~30 min).
  if (orderCreatedGmt) {
    const created = new Date(/Z|[+-]\d\d:?\d\d$/.test(orderCreatedGmt) ? orderCreatedGmt : `${orderCreatedGmt}Z`);
    const mins = Math.round((now.getTime() - created.getTime()) / 60000);
    if (Number.isFinite(mins) && mins >= 0) parts.push(`a los ${mins} min de creado el pedido`);
  }

  return `GOcuotas webhook — ${parts.join(' · ')}`;
}
