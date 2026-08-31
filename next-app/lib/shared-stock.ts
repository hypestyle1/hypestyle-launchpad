// Pilas de stock compartido. Hay dos clases y funcionan igual: las cuatro
// remeras Regular, donde doce entradas de Woo se sirven de cuatro pilas de
// color, y los blanks sin estampar del print on demand, donde varios diseños
// se imprimen sobre la misma prenda (los tres hoodies negros, por ejemplo).
// La fuente de verdad es el mu-plugin (ruta hypestyle/v1/shared-stock), que
// además recalcula lo derivado al guardar.
//
// Acá no se deriva nada: si el cálculo viviera también en TS habría dos
// versiones de la misma regla y en algún momento dirían cosas distintas.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').trim();

export type StockPorTalle = Record<string, number | null>;

export interface SharedStockPool {
  /** melange | black | white | navy | boxy_blanco | hoodie_negro | … */
  color: string;
  /** El producto cuyo stock ES la pila: la remera individual, o el blank. */
  productId: number;
  name: string;
  stock: StockPorTalle;
  /**
   * false mientras la pila de blank nunca se cargó: hasta la primera carga
   * completa no deriva nada, así los diseños no se van a cero solos.
   */
  loaded?: boolean;
}

export interface SharedStockProduct {
  productId: number;
  name: string;
  /** true para las remeras individuales, que no se derivan de nadie. */
  isPool: boolean;
  /** color => remeras que consume una unidad vendida, del mismo talle. */
  recipe: Record<string, number>;
  stock: StockPorTalle;
}

export interface SharedStockSnapshot {
  sizes: string[];
  pools: SharedStockPool[];
  products: SharedStockProduct[];
}

/** Etiqueta legible de cada pila, para la UI. */
export const COLOR_LABEL: Record<string, string> = {
  melange: 'Melange',
  black: 'Black',
  white: 'White',
  navy: 'Navy',
  boxy_blanco: 'Blank remera boxy blanco',
  boxy_negro: 'Blank remera boxy negro',
  boxy_gris_topo: 'Blank remera boxy gris topo',
  boxy_crop_blanco: 'Blank remera boxy crop blanco',
  hoodie_negro: 'Blank hoodie negro',
};

function wpHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Hypestyle-Secret': WP_SECRET, ...(extra || {}) };
}

/**
 * Los títulos de WordPress vienen con entidades HTML: el guion de "Regular Tee
 * – Melange" llega como `&#8211;`, y React lo pinta literal porque escapa todo
 * lo que renderiza. Se decodifica acá, en el borde, para que del lib para
 * adentro los nombres sean texto y ya.
 */
export function decodeWpTitle(s: string): string {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // &amp; va última: si no, un `&amp;lt;` terminaría convertido en `<`.
    .replace(/&amp;/g, '&');
}

function parseSnapshot(data: unknown): SharedStockSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<SharedStockSnapshot>;
  if (!Array.isArray(d.sizes) || !Array.isArray(d.pools) || !Array.isArray(d.products)) return null;
  return {
    sizes: d.sizes,
    pools: d.pools.map(p => ({ ...p, name: decodeWpTitle(p.name) })),
    products: d.products.map(p => ({ ...p, name: decodeWpTitle(p.name) })),
  };
}

/** Lee pilas + packs. Devuelve null si la ruta del mu-plugin no está desplegada. */
export async function loadSharedStock(): Promise<SharedStockSnapshot | null> {
  try {
    // _cb saltea el caché de LiteSpeed del server de WP: acá leer un stock
    // viejo es peor que tardar un poco más.
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/shared-stock?_cb=${Date.now()}`, {
      headers: wpHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parseSnapshot(await res.json());
  } catch {
    return null;
  }
}

export interface SaveSharedStockResult {
  ok: boolean;
  snapshot?: SharedStockSnapshot;
  error?: string;
}

/**
 * Carga las unidades físicas de cada color. Sólo se tocan los colores y talles
 * presentes en `pools`; el mu-plugin valida todo antes de escribir, así que un
 * talle mal tipeado deja las pilas como estaban.
 */
export async function saveSharedStock(pools: Record<string, Record<string, number>>): Promise<SaveSharedStockResult> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/shared-stock`, {
      method: 'POST',
      headers: wpHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pools }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = (data && typeof data === 'object' && 'message' in data)
        ? String((data as { message: unknown }).message)
        : `WordPress respondió ${res.status}`;
      return { ok: false, error };
    }
    const snapshot = parseSnapshot(data);
    return snapshot ? { ok: true, snapshot } : { ok: false, error: 'Respuesta inesperada de WordPress' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al conectar con WordPress' };
  }
}

/**
 * Normaliza lo que manda el formulario del panel: descarta vacíos y valores
 * que no sean enteros >= 0, para no mandarle basura al mu-plugin.
 * Devuelve el payload listo, o el primer error encontrado.
 */
export function buildPoolsPayload(
  crudo: Record<string, Record<string, string>>,
  coloresValidos: string[],
  tallesValidos: string[],
): { pools: Record<string, Record<string, number>> } | { error: string } {
  const pools: Record<string, Record<string, number>> = {};

  for (const [color, porTalle] of Object.entries(crudo)) {
    if (!coloresValidos.includes(color)) return { error: `Color desconocido: ${color}` };
    for (const [talle, valor] of Object.entries(porTalle)) {
      if (!tallesValidos.includes(talle)) return { error: `Talle desconocido: ${talle}` };
      const txt = String(valor).trim();
      if (txt === '') continue;                       // sin cambios para ese talle
      if (!/^\d+$/.test(txt)) return { error: `${COLOR_LABEL[color] ?? color} ${talle}: poné un número entero de 0 en adelante` };
      (pools[color] ??= {})[talle] = Number(txt);
    }
  }

  if (Object.keys(pools).length === 0) return { error: 'No hay ningún cambio para guardar' };
  return { pools };
}
