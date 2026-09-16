// Etapa de despacho de un pedido pagado, derivada de la meta de Andreani.
// Única fuente para /api/admin/orders/counts, la cola POD (lib/pod.ts) y el
// Founder Brief. Antes cada uno traía su propia copia de las claves.
//
// _order_andreani_pedido_id / _order_andreani_numero_interno se cargan al
// EMPAQUETAR (se generó el rótulo en Andreani). _tracking_number aparece
// cuando Andreani ya le asignó guía real: recién ahí entró de verdad al
// circuito de envío (para cuentas Pyme, después de pagar el envío en el portal).

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

export const PACKAGED_KEYS = ['_order_andreani_pedido_id', '_order_andreani_numero_interno', '_andreani_tracking_number'];
export const TRACKING_KEYS = ['_tracking_number'];

export type MetaLike = { key?: string; value?: unknown }[] | undefined;

/** sin_rotulo = pagado y sin empaquetar · con_rotulo = rótulo generado, sin guía · con_guia = Andreani lo tiene. */
export type FulfillmentStage = 'sin_rotulo' | 'con_rotulo' | 'con_guia';

export function hasMeta(meta: MetaLike, keys: string[]): boolean {
  return (meta || []).some((m) => keys.includes(String(m.key)) && String(m.value ?? '').trim() !== '');
}

export function fulfillmentStage(meta: MetaLike): FulfillmentStage {
  if (hasMeta(meta, TRACKING_KEYS)) return 'con_guia';
  if (hasMeta(meta, PACKAGED_KEYS)) return 'con_rotulo';
  return 'sin_rotulo';
}

export interface ProcessingOrder {
  id: number;
  number: string;
  /** Total del pedido en ARS (WC `total`). */
  total: number;
  /** Instante de creación en UTC (ISO). */
  dateGmt: string;
  stage: FulfillmentStage;
  /** Título del método de envío, o '' si el pedido no tiene envío (canje, retiro, carga manual). */
  shippingMethod: string;
}

/** Conteos por etapa; mismo contrato que devolvía el viejo processingSplit. */
export function splitProcessing(orders: { stage: FulfillmentStage }[]): { sinEmpaquetar: number; empaquetados: number; enviados: number } {
  let sinEmpaquetar = 0, empaquetados = 0, enviados = 0;
  for (const o of orders) {
    if (o.stage === 'con_guia') enviados++;
    else if (o.stage === 'con_rotulo') empaquetados++;
    else sinEmpaquetar++;
  }
  return { sinEmpaquetar, empaquetados, enviados };
}

/** Normaliza una orden cruda de WC (con `meta_data`) a lo que mira el panel. */
export function normalizeProcessingOrder(o: any): ProcessingOrder {
  const gmt = o.date_created_gmt ? `${o.date_created_gmt}Z`.replace(/Z+$/, 'Z') : null;
  const ms = gmt ? Date.parse(gmt) : NaN;
  return {
    id: Number(o.id),
    number: String(o.number ?? o.id),
    total: parseFloat(o.total) || 0,
    dateGmt: Number.isFinite(ms) ? new Date(ms).toISOString() : '',
    stage: fulfillmentStage(o.meta_data),
    shippingMethod: String((o.shipping_lines || [])[0]?.method_title || '').trim(),
  };
}

/**
 * Trae todas las órdenes `processing` desde `after` (hora local del sitio,
 * formato YYYY-MM-DDTHH:mm:ss) con su meta, ya clasificadas por etapa.
 * `_cb` saltea el caché de LiteSpeed del server de WP, que puede devolver
 * meta vieja (un tracking recién cargado). Lanza si WC responde mal: el que
 * llama decide si eso es un cero (conteos) o un dominio degradado (brief).
 */
export async function fetchProcessingOrders(after: string): Promise<ProcessingOrder[]> {
  const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
  const out: ProcessingOrder[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?status=processing&per_page=100&page=${page}&after=${after}`
      + `&_fields=id,number,total,date_created_gmt,meta_data,shipping_lines&_cb=${Date.now()}`,
      { headers: { Authorization: auth }, cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`WC ${res.status} al leer pedidos processing`);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const o of data) out.push(normalizeProcessingOrder(o));
    if (data.length < 100) break;
  }
  return out;
}
