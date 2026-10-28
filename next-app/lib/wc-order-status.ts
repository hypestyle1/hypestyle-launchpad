// Estados de pedido que WooCommerce realmente acepta en este sitio.
//
// Verificado el 24/10/2026 contra el esquema del propio sitio (sin tocar ningún
// pedido): `GET /wp-json/wc/v3/orders/statuses` y el `status.enum` de escritura
// de `PUT /wp-json/wc/v3/orders/{id}`.
//
// El panel ofrecía además 'enviado', que NO está registrado: ni se puede filtrar
// (`GET ?status=enviado` → 400 rest_invalid_param) ni se puede escribir
// (`PUT {status:'enviado'}` → 400). La decisión de producto de no registrar
// `wc-enviado` está documentada en PHP/hypestyle-reviews/includes/
// class-hs-reviews-dispatcher.php; lo que faltaba era sacarlo del panel.
//
// Mientras no exista `wc-enviado`, "ya salió" se lee de la guía de Andreani
// (lib/orders-fulfillment → stage 'con_guia'), no del estado administrativo.

/** Los que acepta WC para leer y escribir. 'checkout-draft'/'auto-draft'/'trash' no son operativos. */
export const WC_ORDER_STATUSES = [
  'pending',
  'processing',
  'on-hold',
  'completed',
  'cancelled',
  'refunded',
  'failed',
] as const;

export type WcOrderStatus = (typeof WC_ORDER_STATUSES)[number];

const SET = new Set<string>(WC_ORDER_STATUSES);

/** Un estado que WC va a aceptar. Todo lo demás es un 400 esperándonos. */
export function esEstadoWcValido(status: unknown): status is WcOrderStatus {
  return typeof status === 'string' && SET.has(status);
}

/** Label en castellano. Mismo texto en la lista, el detalle y los selects. */
export const WC_STATUS_LABELS: Record<WcOrderStatus, string> = {
  pending:      'Sin pagar',
  processing:   'Pagado',
  'on-hold':    'En espera',
  completed:    'Completado',
  cancelled:    'Cancelado',
  refunded:     'Reembolsado',
  failed:       'Falló',
};

/**
 * Estados en los que el pedido todavía puede necesitar una acción nuestra.
 * Nunca se les aplica el corte de fecha: un pedido viejo que revive (cambio,
 * reclamo, repago) tiene que seguir apareciendo.
 */
export const ESTADOS_ACCIONABLES: readonly WcOrderStatus[] = ['processing', 'pending', 'on-hold', 'failed'];

/** Terminales: el corte de fecha acá sí es legítimo (son histórico, no cola de trabajo). */
export const ESTADOS_TERMINALES: readonly WcOrderStatus[] = ['completed', 'cancelled', 'refunded'];

export function esEstadoAccionable(status: unknown): boolean {
  return esEstadoWcValido(status) && (ESTADOS_ACCIONABLES as readonly string[]).includes(status);
}
