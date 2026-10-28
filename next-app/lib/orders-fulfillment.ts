// Etapa de despacho de un pedido pagado, derivada de la meta de Andreani.
// Única fuente para /api/admin/orders, /api/admin/orders/counts, la cola POD
// (lib/pod.ts) y el Founder Brief. Antes cada uno traía su propia copia de las
// claves y coincidían de casualidad.
//
// _order_andreani_pedido_id / _order_andreani_numero_interno se cargan al
// EMPAQUETAR (se generó el rótulo en Andreani). _tracking_number aparece
// cuando Andreani ya le asignó guía real: recién ahí entró de verdad al
// circuito de envío (para cuentas Pyme, después de pagar el envío en el portal).
//
// OJO: tener guía NO significa despachado ni entregado. La meta de WC sólo
// guarda el número; el estado real del envío ("Pendiente de ingreso", "En
// camino", "En sucursal", "Entregado", "No entregado") vive en la API de
// tracking de Andreani y hay que ir a buscarlo. Verificado el 24/10/2026 sobre
// las 464 guías en processing: 438 entregados, 10 nunca ingresaron al correo.
//
// Un pedido que sólo lleva gift cards es digital: el código sale por mail al
// acreditarse el pago y no hay nada que empaquetar ni despachar.

import { GIFT_CARD_PRODUCT_ID } from '@/lib/gift-card';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

export const PACKAGED_KEYS = ['_order_andreani_pedido_id', '_order_andreani_numero_interno', '_andreani_tracking_number'];
export const TRACKING_KEYS = ['_tracking_number'];

export type MetaLike = { key?: string; value?: unknown }[] | undefined;
export type LineItemsLike = { product_id?: number | string }[] | undefined;

/** sin_rotulo = pagado y sin empaquetar · con_rotulo = rótulo generado, sin guía · con_guia = Andreani lo tiene · digital = sólo gift cards, no se despacha. */
export type FulfillmentStage = 'sin_rotulo' | 'con_rotulo' | 'con_guia' | 'digital';

export function hasMeta(meta: MetaLike, keys: string[]): boolean {
  return (meta || []).some((m) => keys.includes(String(m.key)) && String(m.value ?? '').trim() !== '');
}

/** Primer valor no vacío entre `keys`, ya trimmeado. '' si no hay ninguno. */
export function metaValue(meta: MetaLike, keys: string[]): string {
  for (const k of keys) {
    const hit = (meta || []).find((m) => String(m.key) === k && String(m.value ?? '').trim() !== '');
    if (hit) return String(hit.value).trim();
  }
  return '';
}

/** Todas las líneas son gift cards. Con una prenda en el pedido ya hay algo que despachar. */
export function esSoloDigital(lineItems: LineItemsLike): boolean {
  const items = lineItems || [];
  return items.length > 0 && items.every((li) => Number(li.product_id) === GIFT_CARD_PRODUCT_ID);
}

/** Sin `lineItems` clasifica sólo por la meta de Andreani, como antes. */
export function fulfillmentStage(meta: MetaLike, lineItems?: LineItemsLike): FulfillmentStage {
  if (hasMeta(meta, TRACKING_KEYS)) return 'con_guia';
  if (hasMeta(meta, PACKAGED_KEYS)) return 'con_rotulo';
  if (esSoloDigital(lineItems)) return 'digital';
  return 'sin_rotulo';
}

/**
 * Las referencias de Andreani tal como las muestra el panel. Comparte las claves
 * con `fulfillmentStage`, así el badge y la lista no pueden divergir.
 */
export function andreaniRefs(meta: MetaLike): { tracking: string; rotulo: string; pedidoId: string } {
  return {
    tracking: metaValue(meta, TRACKING_KEYS),
    rotulo:   metaValue(meta, ['_order_andreani_numero_interno', '_andreani_tracking_number']),
    pedidoId: metaValue(meta, ['_order_andreani_pedido_id']),
  };
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
  /** Cantidad de líneas del pedido; 0 es anómalo. */
  items: number;
}

/** Conteos por etapa; mismo contrato que devolvía el viejo processingSplit. Los digitales no entran en ninguna. */
export function splitProcessing(orders: { stage: FulfillmentStage }[]): { sinEmpaquetar: number; empaquetados: number; enviados: number } {
  let sinEmpaquetar = 0, empaquetados = 0, enviados = 0;
  for (const o of orders) {
    if (o.stage === 'con_guia') enviados++;
    else if (o.stage === 'con_rotulo') empaquetados++;
    else if (o.stage === 'sin_rotulo') sinEmpaquetar++;
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
    stage: fulfillmentStage(o.meta_data, o.line_items),
    shippingMethod: String((o.shipping_lines || [])[0]?.method_title || '').trim(),
    items: (o.line_items || []).length,
  };
}

/** Un pedido que no entra en ninguna cola pero necesita que lo mire una persona. */
export type Anomalia = {
  id: number;
  number: string;
  tipo: 'total_negativo' | 'sin_items';
  detalle: string;
};

/**
 * Anomalías de datos entre los pedidos cargados. Son casos que ninguna cola
 * operativa reclama y que hoy sólo aparecían de casualidad — #2491 lleva desde
 * el 05/08/2026 en processing con total -$3.800.
 */
export function anomaliasDe(orders: ProcessingOrder[]): Anomalia[] {
  const out: Anomalia[] = [];
  for (const o of orders) {
    if (o.total < 0) {
      out.push({ id: o.id, number: o.number, tipo: 'total_negativo', detalle: `total ${o.total}` });
    }
    if (o.items === 0) {
      out.push({ id: o.id, number: o.number, tipo: 'sin_items', detalle: 'el pedido no tiene productos' });
    }
  }
  return out;
}

/** Tope de seguridad de páginas por consulta (per_page=100 → 4000 pedidos). */
export const MAX_PAGES = 40;
/** Páginas en vuelo a la vez. WP de Hostinger responde ~2 s por página; de a 4 no se cae. */
export const CONCURRENCIA = 4;

export type FetchProcessingResult = {
  orders: ProcessingOrder[];
  /** true = falta parte de la lista (tope de páginas o una página que no volvió). Nunca se presenta como lista completa. */
  parcial: boolean;
  /** Lo que WC dijo que había (X-WP-Total de la primera página). */
  totalEsperado: number;
};

/**
 * Corre `fn` sobre `items` con como máximo `limite` en vuelo. El WP de Hostinger
 * cierra la conexión si le entran 12 páginas de pedidos completos de golpe
 * (`Promise.all` sobre todas las páginas de 'any' devolvía 502 intermitente en
 * el tab Canje): de a 4 responde parejo y la consulta es 2-3× más rápida que
 * secuencial.
 */
export async function mapLimit<T, R>(items: T[], limite: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limite, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/**
 * Trae todas las órdenes `processing` con su meta, ya clasificadas por etapa.
 *
 * `after` vacío = sin corte de fecha. El corte sólo tiene sentido para estados
 * terminales: processing es cola de trabajo y un pedido viejo que revive
 * (cambio, reclamo, repago) tiene que seguir apareciendo.
 *
 * `_cb` saltea el caché de LiteSpeed del server de WP, que puede devolver meta
 * vieja (un tracking recién cargado). Lanza si WC responde mal: el que llama
 * decide si eso es un error visible (conteos) o un dominio degradado (brief).
 *
 * Devuelve `parcial: true` si la lista quedó incompleta, en vez de recortar en
 * silencio: una lista corta y una lista completa no se pueden ver igual.
 */
export async function fetchProcessingOrdersResult(after: string): Promise<FetchProcessingResult> {
  const auth = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
  const url = (page: number) => {
    const qs = new URLSearchParams({
      status: 'processing', per_page: '100', page: String(page), orderby: 'id', order: 'asc',
      _fields: 'id,number,total,date_created_gmt,meta_data,shipping_lines,line_items',
      _cb: String(Date.now()),
    });
    if (after) qs.set('after', after);
    return `${WP_URL}/wp-json/wc/v3/orders?${qs}`;
  };
  const traer = async (page: number) => {
    const res = await fetch(url(page), { headers: { Authorization: auth }, cache: 'no-store' });
    if (!res.ok) throw new Error(`WC ${res.status} al leer pedidos processing (página ${page})`);
    return res;
  };

  const primera = await traer(1);
  const totalEsperado = parseInt(primera.headers.get('X-WP-Total') || '0', 10);
  const totalPages = parseInt(primera.headers.get('X-WP-TotalPages') || '1', 10);
  const data = (await primera.json()) as any[];
  if (!Array.isArray(data)) throw new Error('WC devolvió algo que no es una lista de pedidos');

  const porId = new Map<number, ProcessingOrder>();
  for (const o of data) porId.set(Number(o.id), normalizeProcessingOrder(o));

  // `orderby=id&order=asc` mantiene el offset estable entre páginas: si un
  // pedido cambia de estado mientras paginamos, no corre a los demás de página.
  const restantes = Array.from({ length: Math.max(0, Math.min(totalPages, MAX_PAGES) - 1) }, (_, i) => i + 2);
  const paginas = await mapLimit(restantes, CONCURRENCIA, async (p) => (await traer(p)).json() as Promise<any[]>);
  for (const pagina of paginas) {
    for (const o of pagina || []) porId.set(Number(o.id), normalizeProcessingOrder(o));
  }

  const orders = [...porId.values()];
  return { orders, totalEsperado, parcial: totalPages > MAX_PAGES || orders.length < totalEsperado };
}

/** Compatibilidad: sólo la lista. Los que necesitan saber si quedó incompleta usan `fetchProcessingOrdersResult`. */
export async function fetchProcessingOrders(after: string): Promise<ProcessingOrder[]> {
  return (await fetchProcessingOrdersResult(after)).orders;
}
