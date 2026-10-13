// Catálogo mayorista: mismos productos del sitio público, pero precio = 50% del
// regular_price (precio de lista), ignorando cualquier promo/sale_price vigente.
//
// Stock (política del 13/10/2026): solo se puede pedir lo que tiene cantidad
// cargada en Woo. Una variación sin gestión de stock no es "ilimitada": queda
// visible como "stock sin confirmar" y no se agrega al pedido hasta que el
// depósito cargue la cantidad. Lo que lleva el tag `proximamente` se ve (los
// mayoristas conocen las novedades antes) pero tampoco se pide todavía.

import { fetchWithRetry } from './fetch-retry';
import { wholesalePrice } from './mayorista-pricing';
import type { ProductPromo } from './mayorista-campaign-view';
import type { MayoristaDrop } from './mayorista-drop-server';
import { decodeEntities, withPlainPrices, isComingSoonNode } from './private-access/normalize';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';

const GET_PRODUCTS = `
  query GetProductsMayorista($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: DATE, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id databaseId name slug shortDescription
        ... on SimpleProduct {
          regularPrice price onSale stockStatus stockQuantity manageStock
          image { sourceUrl }
          galleryImages { nodes { sourceUrl } }
          productCategories { nodes { name slug } }
          productTags { nodes { slug } }
          attributes { nodes { name options } }
        }
        ... on VariableProduct {
          regularPrice price onSale stockStatus stockQuantity manageStock
          image { sourceUrl }
          galleryImages { nodes { sourceUrl } }
          productCategories { nodes { name slug } }
          productTags { nodes { slug } }
          attributes { nodes { name options } }
          variations(first: 100) {
            nodes {
              stockStatus stockQuantity manageStock
              attributes { nodes { name value } }
            }
          }
        }
      }
    }
  }
`;

export interface MayoristaProduct {
  id: string;
  /** id de Woo (databaseId): es la clave de campañas, costos y órdenes. */
  productId: number;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  wholesalePrice: number;
  regularPrice: number;
  // Precio al que la tienda vende hoy si está en oferta (menor que la lista),
  // o null. No cambia el precio mayorista: se muestra para que el local sepa
  // contra qué precio público compite. (Variable: WPGraphQL devuelve un rango
  // "mín - máx"; se toma el mínimo, lo peor para el revendedor.)
  retailPrice?: number | null;
  image: string;
  images: string[];
  sizes: string[];
  // Colores ofrecidos, en el orden en que están cargados en Woo. Salen del
  // atributo "Color" del producto. Vacío si el producto no tiene color.
  colors: string[];
  // true cuando Color es eje de variación (Color + Talle, ej. SLEEVELESS
  // RANGLAN): ahí el stock se lleva por color y talle. false cuando Color es
  // un atributo informativo del producto (caso AERO: una sola entrada en Woo
  // "disponible en blanco, gris melange y negro"), donde el stock es por
  // talle y el color viaja como dato del pedido.
  colorAxis: boolean;
  // Clave = stockKey(product, size, color).
  stock: Record<string, StockLevel>;
  stockQty: Record<string, number | null>;
  // Tag `proximamente` en Woo: se muestra como novedad pero todavía no se
  // puede pedir (ni acá ni en /api/mayorista/pedido).
  comingSoon: boolean;
  // Promo de la campaña mayorista vigente (lib/mayorista-campaign-view.ts).
  // Solo para mostrar: el precio que se cobra lo recalcula el servidor.
  promo?: ProductPromo;
  // Producto del drop nuevo (colección de Private Access abierta antes para
  // mayoristas, ver lib/mayorista-drop.ts). Va primero y con badge.
  drop?: boolean;
}

/**
 * Disponibilidad de una combinación talle/color:
 *   ok          cantidad cargada, más de 5
 *   low         cantidad cargada, 1 a 5
 *   unconfirmed sin cantidad en Woo (la variación o el producto no gestiona
 *               stock): se ve, no se pide
 *   out         agotado
 */
export type StockLevel = 'ok' | 'low' | 'unconfirmed' | 'out';

/** Clave del stock de una combinación talle/color. */
export function stockKey(p: Pick<MayoristaProduct, 'colorAxis'>, size: string, color?: string | null): string {
  return p.colorAxis && color ? `${color} / ${size}` : size;
}

const LEVEL_RANK: Record<StockLevel, number> = { ok: 0, low: 1, unconfirmed: 2, out: 3 };

/** Disponibilidad de un talle mirando todos sus colores (la mejor de todas). */
export function sizeLevel(p: MayoristaProduct, size: string): StockLevel {
  if (!p.colorAxis) return p.stock[size] ?? 'out';
  let best: StockLevel = 'out';
  for (const c of p.colors) {
    const lvl = p.stock[stockKey(p, size, c)];
    if (lvl && LEVEL_RANK[lvl] < LEVEL_RANK[best]) best = lvl;
  }
  return best;
}

/** ¿Se puede agregar al pedido esta combinación? Solo con cantidad cargada y si el producto no es "próximamente". */
export function canOrder(p: Pick<MayoristaProduct, 'comingSoon'>, level: StockLevel | undefined): boolean {
  return !p.comingSoon && (level === 'ok' || level === 'low');
}

/** ¿Hay algún talle (de algún color) que se pueda pedir? */
export function isPurchasable(p: MayoristaProduct): boolean {
  return !p.comingSoon && p.sizes.some(s => canOrder(p, sizeLevel(p, s)));
}

/** Todos los talles sin cantidad cargada (ninguno agotado del todo ni pedible). */
export function isUnconfirmed(p: MayoristaProduct): boolean {
  return p.sizes.length > 0 && !isPurchasable(p) && p.sizes.some(s => sizeLevel(p, s) === 'unconfirmed');
}

// La descripción corta de WP viene con HTML (<p>, &nbsp;, etc.) — acá solo
// se muestra como una línea de texto plano bajo el nombre del producto.
function stripHtml(html?: string | null): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&oacute;/g, 'ó').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(s?: string | null): number {
  if (!s) return 0;
  // WPGraphQL devuelve algo como "$&nbsp;45.000,00" (punto = miles, coma = decimales).
  return parseFloat(String(s).replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'Única'];
function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a), bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function isSizeAttr(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n === 'talle' || n === 'size' || n === 'pa_talle' || n === 'pa_size';
}
function isColorAttr(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n === 'color' || n === 'pa_color' || n === 'colour';
}

function stockLevel(status: string, qty: number | null): StockLevel {
  if (status === 'OUT_OF_STOCK') return 'out';
  // Sin cantidad no hay stock confirmado. Antes esto era 'ok' y el portal
  // ofrecía como ilimitado lo que el depósito nunca contó.
  if (qty === null) return 'unconfirmed';
  if (qty <= 0) return 'out';
  if (qty <= 5) return 'low';
  return 'ok';
}

/** Cantidad gestionada de un nodo de WPGraphQL (null si no gestiona stock). */
function managedQty(x: any): number | null {
  if (x?.manageStock === false) return null;
  return typeof x?.stockQuantity === 'number' ? x.stockQuantity : null;
}

// Combos/packs (ej. "Regular Tees 3 PACK", "CAMO FULL SET - COMBO") son
// promos armadas para el minorista — no tienen sentido en mayorista, donde
// el cliente ya compra por volumen los productos individuales. La Gift Card
// tampoco: es un saldo para comprar en el sitio, no mercadería para revender.
const EXCLUDED_CATEGORY_SLUGS = new Set(['pack', 'set', 'gift-card']);
function isCombo(node: any): boolean {
  const slugs: string[] = (node.productCategories?.nodes ?? []).map((c: any) => c.slug);
  return slugs.some((s) => EXCLUDED_CATEGORY_SLUGS.has(s));
}

/** Productos que no se ofrecen a mayoristas (por categoría o por slug). */
export function isExcludedFromMayorista(node: any): boolean {
  return isCombo(node) || EXCLUDED_SLUGS.has(node.slug);
}

/** Misma regla, para un producto leído por WC REST (`categories[].slug`). */
export function isExcludedFromMayoristaRest(product: { slug?: string; status?: string; categories?: { slug: string }[] }): boolean {
  if (product.status && product.status !== 'publish') return true;
  if (EXCLUDED_SLUGS.has(product.slug ?? '')) return true;
  return (product.categories ?? []).some((c) => EXCLUDED_CATEGORY_SLUGS.has(c.slug));
}

// Productos puntuales que el negocio decidió no ofrecer a mayoristas
// (a mano, no hay una regla automática detrás — pedido explícito).
const EXCLUDED_SLUGS = new Set(['hs-ring-silver-925', 'zip-hoodie-pink']);

// Con cuántas unidades "de esfuerzo de stock" carga un producto: 3 por talle
// agotado, 2 sin confirmar, 1 con poco stock, 0 si está todo ok. Se usa para
// orden (más bajo = más disponible = va primero) y para sacar del todo los
// que no tienen ningún talle disponible.
function stockScore(p: MayoristaProduct): number {
  return p.sizes.reduce((sum, s) => sum + LEVEL_RANK[sizeLevel(p, s)], 0);
}
// Agotado en todos los talles: fuera del catálogo. Lo "sin confirmar" y lo
// "próximamente" se quedan, visibles y sin botón de pedido.
function isFullyOut(p: MayoristaProduct): boolean {
  return p.sizes.length > 0 && p.sizes.every((s) => sizeLevel(p, s) === 'out');
}

/** Precio público de hoy si hay oferta y es menor que la lista; si no, null. */
export function retailPriceOf(node: { onSale?: boolean | null; price?: string | null }, regularPrice: number): number | null {
  if (!node.onSale) return null;
  // Variable: "$ 40.500,00 - $ 45.000,00". Se parsea cada tramo por separado
  // (parsePrice sobre el rango entero pega los dos números).
  const prices = String(node.price ?? '').split(/\s+[-–]\s+/).map(parsePrice).filter(n => n > 0);
  if (!prices.length) return null;
  const p = Math.round(Math.min(...prices));
  return p < regularPrice ? p : null;
}

export function normalizeMayoristaNode(node: any): MayoristaProduct {
  const regularPrice = parsePrice(node.regularPrice);
  // Lo que ve el catálogo es orientativo: el precio que se cobra se recalcula
  // en el servidor al confirmar (lib/mayorista-pricing.ts), con la misma regla.
  const wholesale = wholesalePrice(regularPrice);
  const retailPrice = retailPriceOf(node, regularPrice);

  const images: string[] = [];
  if (node.image?.sourceUrl) images.push(node.image.sourceUrl);
  (node.galleryImages?.nodes ?? []).forEach((g: any) => {
    if (g.sourceUrl && !images.includes(g.sourceUrl)) images.push(g.sourceUrl);
  });

  // Colores del producto: el atributo "Color" de Woo, sea o no eje de
  // variación. Antes el catálogo ignoraba cualquier atributo que no fuera el
  // talle y el mayorista no tenía forma de pedir "la negra".
  const colors: string[] = [];
  const colorAttr = (node.attributes?.nodes ?? []).find((a: any) => isColorAttr(a.name));
  for (const o of colorAttr?.options ?? []) {
    const c = String(o ?? '').trim();
    if (c && !colors.includes(c)) colors.push(c);
  }

  const sizes: string[] = [];
  const stock: Record<string, StockLevel> = {};
  const stockQty: Record<string, number | null> = {};
  const variations: any[] = node.variations?.nodes ?? [];
  let colorAxis = false;
  // Stock del padre: vale para las variaciones que delegan en él (Woo:
  // manage_stock 'parent'), que vienen sin cantidad propia.
  const parentQty = managedQty(node);

  if (variations.length) {
    for (const v of variations) {
      const attrs: any[] = v.attributes?.nodes ?? [];
      const sizeAttr = attrs.find((a) => isSizeAttr(a.name)) ?? attrs.find((a) => !isColorAttr(a.name));
      const colorVal = attrs.find((a) => isColorAttr(a.name))?.value?.trim() || '';
      const sz = sizeAttr?.value?.trim() || 'Única';
      if (colorVal) {
        colorAxis = true;
        if (!colors.includes(colorVal)) colors.push(colorVal);
      }
      if (!sizes.includes(sz)) sizes.push(sz);
      const key = colorVal ? `${colorVal} / ${sz}` : sz;
      if (!(key in stock)) {
        const qty = managedQty(v) ?? parentQty;
        stock[key] = stockLevel(v.stockStatus, qty);
        stockQty[key] = qty;
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockLevel(node.stockStatus || 'IN_STOCK', parentQty);
    stockQty['Única'] = parentQty;
  }

  // Con Color como eje, cada talle/color tiene su clave aunque Woo no haya
  // creado esa variación (queda 'out'): así la UI no cae en undefined.
  if (colorAxis) {
    for (const c of colors) for (const sz of sizes) {
      const key = `${c} / ${sz}`;
      if (!(key in stock)) { stock[key] = 'out'; stockQty[key] = 0; }
    }
  }

  return {
    id: node.slug,
    productId: Number(node.databaseId) || 0,
    name: node.name,
    slug: node.slug,
    category: node.productCategories?.nodes?.[0]?.name ?? '',
    shortDescription: stripHtml(node.shortDescription),
    wholesalePrice: wholesale,
    regularPrice,
    retailPrice,
    image: images[0] ?? '',
    images,
    sizes: sortSizes(sizes),
    colors,
    colorAxis,
    stock,
    stockQty,
    comingSoon: isComingSoonNode(node),
  };
}

/** PVP real (regular_price) y pertenencia al catálogo mayorista de TODOS los
 *  productos publicados, por id de Woo. Para el panel (/admin/costos): la
 *  misma lectura que el catálogo, sin el filtro de stock. */
export async function fetchMayoristaPriceIndex(): Promise<Map<number, { regularPrice: number; wholesale: boolean; wholesalePrice: number }>> {
  const nodes = await fetchMayoristaNodes();
  const out = new Map<number, { regularPrice: number; wholesale: boolean; wholesalePrice: number }>();
  for (const n of nodes) {
    const id = Number(n.databaseId);
    if (!id) continue;
    const regularPrice = parsePrice(n.regularPrice);
    out.set(id, { regularPrice, wholesale: !isExcludedFromMayorista(n) && regularPrice > 0, wholesalePrice: wholesalePrice(regularPrice) });
  }
  return out;
}

/**
 * Suma los nodos del drop (privados hasta la apertura, ver
 * lib/mayorista-drop.ts) a los publicados, sin repetir: al abrir al público
 * el mismo producto viene por las dos vías. Marca `drop` en los que se
 * destacan: los privados siempre; los publicados solo una vez abierta la
 * colección (antes de eso, un publicado con el tag es algo que ya estaba a
 * la venta, como el pack de medias).
 */
export function buildMayoristaCatalog(publicNodes: any[], drop?: Pick<MayoristaDrop, 'nodes' | 'highlighted' | 'info'> | null): MayoristaProduct[] {
  const seen = new Set(publicNodes.map((n: any) => Number(n.databaseId)).filter(Boolean));
  const dropNodes = drop?.nodes ?? [];
  // El mu-plugin devuelve precios crudos de Woo ("98000.00") y el nombre con
  // entidades HTML; parsePrice espera el formato de WPGraphQL y leería 9.800.000.
  const extra = dropNodes
    .filter((n: any) => n?.slug && !seen.has(Number(n.databaseId)))
    .map((n: any) => withPlainPrices({ ...n, name: decodeEntities(n.name) }));
  const highlightIds = new Set(
    drop?.highlighted
      ? dropNodes.filter((n: any) => n.status === 'private' || !drop.info.beforePublic).map((n: any) => Number(n.databaseId))
      : [],
  );

  const products = [...publicNodes, ...extra]
    .filter((n: any) => !isExcludedFromMayorista(n))
    .map((n: any) => {
      const p = normalizeMayoristaNode(n);
      return highlightIds.has(p.productId) ? { ...p, drop: true } : p;
    })
    .filter((p: MayoristaProduct) => p.regularPrice > 0 && !isFullyOut(p));

  // Drop primero; después lo que se puede pedir; después, por disponibilidad.
  // Estable: entre productos con el mismo puntaje se mantiene el orden que ya
  // traían (fecha de alta, ver la query; el drop, en el orden del menú de Woo).
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) =>
      Number(!!b.p.drop) - Number(!!a.p.drop)
      || Number(isPurchasable(b.p)) - Number(isPurchasable(a.p))
      || stockScore(a.p) - stockScore(b.p)
      || a.i - b.i)
    .map(({ p }) => p);
}

/** Catálogo mayorista. `drop` (lib/mayorista-drop-server.ts) suma la colección nueva todavía privada. */
export async function fetchMayoristaProducts(drop?: MayoristaDrop | null): Promise<MayoristaProduct[]> {
  return buildMayoristaCatalog(await fetchMayoristaNodes(), drop);
}

/** Todos los nodos publicados de WPGraphQL, paginados y deduplicados. */
async function fetchMayoristaNodes(): Promise<any[]> {
  const allNodes: any[] = [];
  let after: string | null = null;

  // Paginado por cursor: el catálogo mayorista tiene que mostrar TODO lo
  // publicado, no un tope fijo — con "first: 100" a secas, el producto 101
  // (o el que sea que WPGraphQL ordene después) quedaba afuera sin aviso.
  for (let i = 0; i < 20; i++) {
    // Con reintentos: /mayoristas se prerenderiza en el build y fue una de las
    // páginas que se cayó por un timeout suelto contra WP.
    const res = await fetchWithRetry(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_PRODUCTS, variables: { first: 100, after } }),
      next: { revalidate: 60 },
    });
    if (!res.ok) break;
    const { data } = await res.json();
    const page = data?.products;
    if (!page) break;
    allNodes.push(...page.nodes);
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  // orderby DATE (no MENU_ORDER, ver mismo fix en app/api/products/route.ts):
  // con MENU_ORDER compartido entre casi todos los productos, el cursor de
  // WPGraphQL no solo duplicaba nodos entre páginas sino que podía omitir
  // productos enteros del resultado total. El dedupe de abajo queda como
  // resguardo, pero la causa real era el sort key no-único.
  const seenIds = new Set<string>();
  return allNodes.filter((n: any) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });
}

export async function fetchMayoristaProduct(slug: string, drop?: MayoristaDrop | null): Promise<MayoristaProduct | null> {
  const products = await fetchMayoristaProducts(drop);
  return products.find(p => p.slug === slug) ?? null;
}
