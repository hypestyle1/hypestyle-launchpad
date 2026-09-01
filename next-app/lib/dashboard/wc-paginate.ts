// Paginado de pedidos de WooCommerce, en paralelo y con los campos justos.
//
// Los dos fetchers del panel (wc-orders para el Dashboard, finance/fetch-orders
// para el Profitability Engine) recorrían las páginas de a una, esperando cada
// respuesta antes de pedir la siguiente. Contra producción cada página tarda
// ~2,3 s, así que el histórico de clientes (8 páginas) costaba 19 s él solo y
// arrastraba toda la pantalla de Performance.
//
// Acá se centraliza el recorrido: la primera página trae el header
// `X-WP-TotalPages` y el resto sale en tandas paralelas. El fan-out se mantiene
// chico a propósito — WooCommerce devuelve 500 cuando se le abren muchas
// conexiones a la vez (pasó con el pedido mayorista de 35 ítems).
//
// El conjunto de pedidos que devuelve es exactamente el mismo que traía el
// recorrido secuencial: mismo orden de páginas, mismo `per_page`, mismos
// parámetros. Lo único que cambia es cuándo se piden.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

/** Backstop: ~4000 pedidos. Si se supera se reporta, no se trunca en silencio. */
export const MAX_PAGES = 40;

/** Páginas simultáneas. Woo tira 500 con fan-out grande; 4 es cómodo. */
const CONCURRENCY = 4;

export interface PaginateOptions {
  /** Lista `_fields` de la REST API. Pedir sólo lo que se usa: `line_items`
   *  cuesta 2,7x por página (254 KB contra 44 KB medidos en producción). */
  fields: string;
  /** Ventana `after`/`before` ya con el margen de tz aplicado. */
  after: string;
  before: string;
}

export interface PaginateResult {
  /** Pedidos crudos de Woo, en el mismo orden que devolvería el secuencial. */
  raw: any[];
  /** true si se alcanzó MAX_PAGES o si alguna página falló (ver nota abajo). */
  truncated: boolean;
}

function buildUrl(page: number, o: PaginateOptions): string {
  const params = new URLSearchParams({
    per_page: '100',
    page: String(page),
    orderby: 'date',
    order: 'desc',
    after: o.after,
    before: o.before,
    dates_are_gmt: 'true',
    _fields: o.fields,
    _cb: `${Date.now()}-${page}`,
  });
  return `${WP_URL}/wp-json/wc/v3/orders?${params}`;
}

async function getPage(page: number, o: PaginateOptions): Promise<{ batch: any[]; totalPages: number | null; ok: boolean }> {
  const res = await fetch(buildUrl(page, o), { headers: { Authorization: wcAuth() }, cache: 'no-store' });
  if (!res.ok) return { batch: [], totalPages: null, ok: false };
  const header = res.headers.get('x-wp-totalpages');
  const totalPages = header && /^\d+$/.test(header) ? Number(header) : null;
  const batch = await res.json();
  return { batch: Array.isArray(batch) ? batch : [], totalPages, ok: true };
}

/**
 * Recorre todas las páginas del rango y devuelve los pedidos crudos.
 *
 * Estrategia: la página 1 dice cuántas hay (`X-WP-TotalPages`) y el resto sale
 * en tandas de CONCURRENCY. Si el header no viniera —instalación vieja, plugin
 * que lo saca— cae al recorrido secuencial de siempre, que no depende de él.
 *
 * Una página que falla marca `truncated`. El recorrido viejo hacía `break` y
 * devolvía lo que tenía sin avisar, que es peor: un 500 pasajero de Woo se veía
 * como un mes con menos ventas en vez de como un error.
 */
export async function fetchOrderPages(o: PaginateOptions): Promise<PaginateResult> {
  const first = await getPage(1, o);
  if (!first.ok) return { raw: [], truncated: true };
  if (!first.batch.length) return { raw: [], truncated: false };

  // Sin header de paginación no se puede paralelizar: se sigue de a una.
  if (first.totalPages === null) return sequentialFrom(first.batch, o);

  const totalPages = Math.min(first.totalPages, MAX_PAGES);
  const truncatedByCap = first.totalPages > MAX_PAGES;
  if (totalPages <= 1) return { raw: first.batch, truncated: truncatedByCap };

  const pages: any[][] = [first.batch];
  let falló = false;

  for (let from = 2; from <= totalPages; from += CONCURRENCY) {
    const tanda = [];
    for (let p = from; p < from + CONCURRENCY && p <= totalPages; p++) tanda.push(p);
    const res = await Promise.all(tanda.map((p) => getPage(p, o).catch(() => ({ batch: [], totalPages: null, ok: false }))));
    for (const r of res) {
      if (!r.ok) falló = true;
      pages.push(r.batch);
    }
  }

  return { raw: pages.flat(), truncated: truncatedByCap || falló };
}

/** Camino de compatibilidad: el recorrido de a una, arrancando de la página 2. */
async function sequentialFrom(firstBatch: any[], o: PaginateOptions): Promise<PaginateResult> {
  const raw = [...firstBatch];
  if (firstBatch.length < 100) return { raw, truncated: false };

  for (let page = 2; ; page++) {
    if (page > MAX_PAGES) return { raw, truncated: true };
    const r = await getPage(page, o);
    if (!r.ok) return { raw, truncated: true };
    if (!r.batch.length) break;
    raw.push(...r.batch);
    if (r.batch.length < 100) break;
  }
  return { raw, truncated: false };
}

/** Margen de 6h a cada lado por si WC filtra por hora local; el filtro fino es en código. */
export function rangeParams(startUTC: string, endUTC: string) {
  const startMs = new Date(startUTC).getTime();
  const endMs = new Date(endUTC).getTime();
  return {
    startMs,
    endMs,
    after: new Date(startMs - 6 * 3600_000).toISOString(),
    before: new Date(endMs + 6 * 3600_000).toISOString(),
  };
}
