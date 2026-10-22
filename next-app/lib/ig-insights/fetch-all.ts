/**
 * Lectura paginada de `GET /api/admin/ig-posts` (corrección C3 de la
 * auditoría).
 *
 * El problema que resuelve: la Biblioteca, el Overview y el CLI del skill
 * pedían `limit=200` —el techo del mu-plugin— sin paginar. Con las ~338
 * publicaciones proyectadas para dos años de historial, un análisis "de todo
 * el histórico" descartaba en silencio alrededor del 40% de los datos.
 *
 * Reglas:
 *  - se pagina por `offset` hasta cubrir el `total` que informa el backend;
 *  - si un pedido falla, se TIRA el error: nunca se devuelve un conjunto
 *    parcial como si estuviera completo;
 *  - hay un tope de seguridad (`maxPages`) y, si se alcanza, el resultado
 *    viene con `complete: false` y `cappedAt`, para que quien lo muestre lo
 *    diga en pantalla;
 *  - se deduplica por `igMediaId` por si entra una publicación nueva durante
 *    el recorrido (el orden del backend es published_at DESC, id DESC).
 */

import type { IgPostRecord } from './types';

/** Techo del mu-plugin para `limit` (`hs_ig_posts_list`). */
export const PAGE_SIZE = 200;
/** 40 páginas = 8.000 publicaciones. Hype tiene ~340 proyectadas a 2 años. */
export const MAX_PAGES = 40;

export type IgPostsAll = {
  rows: IgPostRecord[];
  /** Total que informa el backend para los filtros pedidos. */
  total: number;
  /** true si los datos son los fixtures de prueba (gate B1 abierto). */
  fixture: boolean;
  /** true sólo si se trajeron TODAS las publicaciones que informa `total`. */
  complete: boolean;
  /** Páginas pedidas. */
  pages: number;
  /** Si se cortó por el tope de seguridad, cuántas filas se alcanzaron. */
  cappedAt: number | null;
};

type FetchLike = typeof fetch;

export async function fetchAllIgPosts(
  params: Record<string, string>,
  opts: {
    headers?: HeadersInit;
    fetchImpl?: FetchLike;
    pageSize?: number;
    maxPages?: number;
    basePath?: string;
  } = {},
): Promise<IgPostsAll> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const basePath = opts.basePath ?? '/api/admin/ig-posts';

  const vistos = new Set<string>();
  const rows: IgPostRecord[] = [];
  let total = 0;
  let fixture = false;
  let pages = 0;
  let cappedAt: number | null = null;

  for (let offset = 0; ; offset += pageSize) {
    const qs = new URLSearchParams({ ...params, limit: String(pageSize), offset: String(offset) });
    const res = await fetchImpl(`${basePath}?${qs}`, { headers: opts.headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al traer la página ${pages + 1} de publicaciones`);
    }
    const data = (await res.json()) as { rows?: IgPostRecord[]; total?: number; fixture?: boolean };
    pages++;
    fixture = Boolean(data.fixture);
    total = Number(data.total) || 0;

    const lote = Array.isArray(data.rows) ? data.rows : [];
    for (const p of lote) {
      if (!p?.igMediaId || vistos.has(p.igMediaId)) continue;
      vistos.add(p.igMediaId);
      rows.push(p);
    }

    // Cortes: página corta (última), ya se cubrió el total, o tope de seguridad.
    if (lote.length < pageSize) break;
    if (total > 0 && offset + pageSize >= total) break;
    if (pages >= maxPages) {
      cappedAt = rows.length;
      break;
    }
  }

  return {
    rows,
    total: Math.max(total, rows.length),
    fixture,
    complete: cappedAt == null && rows.length >= total,
    pages,
    cappedAt,
  };
}

/** Texto único para avisar en pantalla cuando el conjunto quedó incompleto. */
export function avisoDeCobertura(r: Pick<IgPostsAll, 'complete' | 'rows' | 'total'>): string | null {
  if (r.complete) return null;
  return `Se cargaron ${r.rows.length} de ${r.total} publicaciones: los números de abajo NO cubren todo el período seleccionado.`;
}
