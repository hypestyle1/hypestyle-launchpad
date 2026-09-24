// Precio mayorista: una sola regla, en un solo lugar.
//
//   wholesale = regular_price × 0,50
//
// `regular_price` es el PVP real/canónico del producto en WooCommerce. El
// `sale_price` (promo retail) no entra: un SALE nunca mueve el precio
// mayorista. Y el precio que manda el navegador tampoco entra: lo que guarda
// el carrito es una foto de cuando se agregó el ítem, no una fuente de verdad.
// La orden se arma SIEMPRE con el precio calculado acá a partir de Woo; si el
// carrito traía otro, se le muestra al cliente el total nuevo y se le pide
// confirmación (ver /api/mayorista/pedido).

import type { ResolvedProduct } from './mayorista-stock';
import { findVariation } from './mayorista-stock';

export const WHOLESALE_FACTOR = 0.5;

export function wholesalePrice(regularPrice: number): number {
  return Math.round(regularPrice * WHOLESALE_FACTOR);
}

/** Lo que llega del carrito. `price` y cualquier `variationId` se ignoran para
 *  cobrar: se conservan solo para detectar que el carrito estaba desactualizado. */
export interface PricingInput {
  slug: string;
  name: string;
  size: string;
  color?: string;
  quantity: number;
  price?: unknown;
}

export interface PricedLine {
  slug: string;
  name: string;
  size: string;
  color?: string;
  quantity: number;
  productId: number;
  variationId?: number;
  /** Precio unitario mayorista calculado en el servidor. */
  unitPrice: number;
  lineTotal: number;
  /** Lo que traía el carrito (null si no era un número). */
  clientPrice: number | null;
  changed: boolean;
}

export interface PriceChange {
  slug: string; name: string; size: string; color?: string; quantity: number;
  before: number | null;
  after: number;
}

export interface PricingResult {
  lines: PricedLine[];
  total: number;
  /** Líneas cuyo precio en el carrito difiere del vigente. */
  changes: PriceChange[];
  /** Líneas que no se pueden cobrar porque Woo no tiene regular_price (> 0). */
  unpriced: { slug: string; name: string; size: string; color?: string }[];
}

function asPrice(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** El regular_price que rige para la línea: el de la variación si Woo lo tiene,
 *  si no el del producto (simples, o variables con precio solo en el padre). */
export function regularPriceFor(resolved: ResolvedProduct, variation?: { regularPrice: number | null }): number | null {
  return asPrice(variation?.regularPrice) ?? asPrice(resolved.regularPrice);
}

export function priceLines(items: PricingInput[], resolvedBySlug: Map<string, ResolvedProduct | null>): PricingResult {
  const lines: PricedLine[] = [];
  const changes: PriceChange[] = [];
  const unpriced: PricingResult['unpriced'] = [];

  for (const item of items) {
    const resolved = resolvedBySlug.get(item.slug);
    const color = (item.color ?? '').trim() || undefined;
    if (!resolved) { unpriced.push({ slug: item.slug, name: item.name, size: item.size, ...(color ? { color } : {}) }); continue; }
    const hit = findVariation(resolved, { size: item.size, color });
    const regular = regularPriceFor(resolved, hit);
    if (regular == null) { unpriced.push({ slug: item.slug, name: item.name, size: item.size, ...(color ? { color } : {}) }); continue; }

    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitPrice = wholesalePrice(regular);
    const clientPrice = asPrice(item.price);
    const changed = clientPrice == null || Math.round(clientPrice) !== unitPrice;
    const line: PricedLine = {
      slug: item.slug, name: item.name, size: item.size, ...(color ? { color } : {}),
      quantity, productId: resolved.product_id, ...(hit ? { variationId: hit.id } : {}),
      unitPrice, lineTotal: unitPrice * quantity, clientPrice, changed,
    };
    lines.push(line);
    if (changed) changes.push({ slug: item.slug, name: item.name, size: item.size, ...(color ? { color } : {}), quantity, before: clientPrice, after: unitPrice });
  }

  return { lines, total: lines.reduce((s, l) => s + l.lineTotal, 0), changes, unpriced };
}
