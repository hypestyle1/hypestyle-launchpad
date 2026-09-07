// Resolución de productos del pedido mayorista contra WooCommerce (server).
//
// Lo usan /api/mayorista/pedido (para armar la orden y frenarla si algo no
// va) y /api/mayorista/disponibilidad (para que el carrito se sanee solo al
// hidratar o al cargar un borrador, antes de que el cliente llegue a
// confirmar). Ver lib/mayorista-availability.ts para la regla en sí.

import { mapLimit } from './map-limit';
import { unavailableReason, unavailableMessage, type StockInfo, type Unavailable } from './mayorista-availability';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

export function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

// WordPress devuelve 500 esporádicos bajo carga (transitorios): los 5xx y los
// errores de red se reintentan con backoff. Los 4xx no — son determinísticos.
export async function wcGet(path: string) {
  const MAX_ATTEMPTS = 3;
  let lastError: Error = new Error(`WC: sin respuesta en GET ${path}`);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
        headers: { Authorization: wcAuth() },
        cache: 'no-store',
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (res) {
      if (res.ok) return res.json();
      if (res.status < 500) throw new Error(`WC ${res.status} on GET ${path}`);
      lastError = new Error(`WC ${res.status} on GET ${path}`);
    }
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 400 * attempt));
  }
  throw lastError;
}

export interface ResolvedVariation { id: number; options: string[]; stock: StockInfo }
export interface ResolvedProduct {
  product_id: number;
  stock: StockInfo;
  variations: ResolvedVariation[];
}

function stockInfo(x: any): StockInfo {
  return {
    status: x.status ?? null,
    stockStatus: x.stock_status ?? null,
    manageStock: x.manage_stock ?? null,
    stockQuantity: typeof x.stock_quantity === 'number' ? x.stock_quantity : null,
  };
}

// Se consulta una sola vez por producto y de a pocos: un pedido de 35 ítems
// resuelto por ítem y en paralelo eran ~70 requests simultáneos y WP tira 500
// esporádicos con ese fan-out.
async function resolveProduct(slug: string): Promise<ResolvedProduct | null> {
  // status=any: queremos encontrar también el producto privado/borrador para
  // poder decirle al cliente por qué no va.
  const products = await wcGet(`products?slug=${encodeURIComponent(slug)}&status=any&_fields=id,type,status,stock_status,manage_stock,stock_quantity&per_page=1`);
  if (!products.length) return null;
  const { id: productId, type } = products[0];
  const stock = stockInfo(products[0]);

  if (type !== 'variable') return { product_id: productId, stock, variations: [] };

  const variations = await wcGet(`products/${productId}/variations?per_page=100&_fields=id,attributes,stock_status,manage_stock,stock_quantity`);
  return {
    product_id: productId,
    stock,
    variations: variations.map((v: any) => ({
      id: v.id,
      options: (v.attributes ?? []).map((a: any) => String(a.option ?? '').toLowerCase().trim()),
      stock: stockInfo(v),
    })),
  };
}

export async function resolveProducts(slugs: string[]): Promise<Map<string, ResolvedProduct | null>> {
  const unique = [...new Set(slugs)];
  const list = await mapLimit(unique, 3, resolveProduct);
  return new Map(unique.map((s, i) => [s, list[i]]));
}

export interface StockLine { slug: string; name: string; size: string; color?: string; quantity: number }

/** La variación de Woo que corresponde a talle + color elegidos (si hay). */
export function findVariation(resolved: ResolvedProduct, line: Pick<StockLine, 'size' | 'color'>): ResolvedVariation | undefined {
  const color = (line.color ?? '').trim();
  // Con Color + Talle como ejes, buscar solo por talle devolvía la primera del
  // color que fuera. "Única" no es un atributo de Woo, no se exige.
  const wanted = [line.size, color].map(s => s.toLowerCase().trim()).filter(s => s && s !== 'única');
  return resolved.variations.find(v => wanted.every(w => v.options.includes(w)));
}

export interface UnavailableLine {
  slug: string; size: string; color?: string;
  reason: Unavailable['reason'];
  available?: number;
  message: string;
}

/** Qué líneas del pedido no se pueden vender hoy, con el motivo para el cliente. */
export function findUnavailable(lines: StockLine[], resolvedBySlug: Map<string, ResolvedProduct | null>): UnavailableLine[] {
  const out: UnavailableLine[] = [];
  for (const line of lines) {
    const resolved = resolvedBySlug.get(line.slug);
    // Producto borrado de Woo: para el cliente es lo mismo que despublicado.
    const why: Unavailable | null = resolved
      ? unavailableReason(resolved.stock, findVariation(resolved, line)?.stock ?? null, line.quantity)
      : { reason: 'not-published' };
    if (!why) continue;
    out.push({
      slug: line.slug, size: line.size, ...(line.color ? { color: line.color } : {}),
      reason: why.reason,
      ...(why.reason === 'insufficient' ? { available: why.available } : {}),
      message: unavailableMessage(line.name, line.size, why),
    });
  }
  return out;
}
