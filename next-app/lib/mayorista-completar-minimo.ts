// "Completá el mínimo": qué sugerirle al mayorista cuando el pedido está por
// debajo del mínimo (pura, sin red).
//
// Prioridad acordada (24/09): promo de ticket bajo → básicos → accesorios →
// buena disponibilidad. Nada caro ni best sellers si no hace falta. Lo
// caro/best seller solo entra si lo barato no alcanza a cubrir lo que falta.

import type { MayoristaProduct } from './mayorista-products';
import { sizeLevel, stockKey } from './mayorista-products';

/** Productos que se venden solos: no se sugieren para rellenar. */
export const BEST_SELLER_SLUGS = new Set([
  'lamb-of-god-pink-tee', 'stars-for-venezuela-hoodie', 'only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra',
  'hoodie-grey-hstars', 'hoodie-black-hstars', 'sweatpant-black-hstars', 'sweatpant-grey-hstars', 'sweatpant-pink',
  'running-horses-waffle-longsleeve', 'hoodie-pink', 'camo-cap',
]);
const BASIC_RE = /regular tee|napoli|medias|pack x3/i;
const ACCESSORY_RE = /accesorio|gorra|cap|beanie|chain|medias/i;

export interface Suggestion {
  slug: string;
  name: string;
  image: string;
  size: string;
  color?: string;
  unitPrice: number;
  promo: boolean;
  /** Unidades disponibles del talle sugerido (null = sin gestión). */
  available: number | null;
  reason: 'promo' | 'basico' | 'accesorio' | 'disponible';
}

function firstSizeInStock(p: MayoristaProduct): { size: string; color?: string; qty: number | null } | null {
  const color = p.colors.length === 1 ? p.colors[0] : undefined;
  if (p.colorAxis) return null; // elegir color es decisión del cliente, no se sugiere
  for (const s of p.sizes) {
    if (sizeLevel(p, s) === 'out') continue;
    return { size: s, color, qty: p.stockQty[stockKey(p, s, color)] ?? null };
  }
  return null;
}

export function completarMinimo(
  catalog: MayoristaProduct[],
  cartSlugs: Set<string>,
  missing: number,
  limit = 6,
): Suggestion[] {
  if (missing <= 0) return [];
  // Ticket bajo: hasta $30.000 la unidad (o lo que falte si es menos), nunca
  // menos de $22.500 para que entren remeras y accesorios.
  const cheapCap = Math.max(22500, Math.min(missing, 30000));
  const scored: { s: Suggestion; score: number; price: number }[] = [];
  for (const p of catalog) {
    if (cartSlugs.has(p.slug) || BEST_SELLER_SLUGS.has(p.slug) || p.colorAxis) continue;
    const pick = firstSizeInStock(p);
    if (!pick) continue;
    const price = p.promo?.price ?? p.wholesalePrice;
    if (price > cheapCap) continue;
    const totalStock = Object.values(p.stockQty).reduce<number>((a, q) => a + (q ?? 0), 0);
    const isBasic = BASIC_RE.test(p.name) || BASIC_RE.test(p.category);
    const isAccessory = ACCESSORY_RE.test(p.category) || ACCESSORY_RE.test(p.name);
    let score = 0;
    // Promo primero (es lo que hay que mover): pesa más que básico + accesorio juntos.
    if (p.promo) score += 60;
    if (isBasic) score += 25;
    if (isAccessory) score += 20;
    if (totalStock >= 20) score += 15; else if (totalStock >= 8) score += 8;
    score += Math.max(0, 20 - price / 2500); // más barato, mejor
    const reason: Suggestion['reason'] = p.promo ? 'promo' : isBasic ? 'basico' : isAccessory ? 'accesorio' : 'disponible';
    scored.push({ price, score, s: { slug: p.slug, name: p.name, image: p.image, size: pick.size, ...(pick.color ? { color: pick.color } : {}), unitPrice: price, promo: !!p.promo, available: pick.qty, reason } });
  }
  return scored.sort((a, b) => b.score - a.score || a.price - b.price).slice(0, limit).map(x => x.s);
}
