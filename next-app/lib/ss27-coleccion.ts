// Página pública de la colección SS27 Part 01 (/colecciones/ss27).
//
// La colección es la misma de Private Access (lib/private-access/config.ts):
// tag de Woo `ss27-part-01`, privada hasta `publicOpenAt`. La página no tiene
// fechas propias: el estado sale de esa config en cada render, igual que
// isPublicOpen. Reglas puras acá (se testean solas); el fetch vive en
// lib/ss27-coleccion-server.ts.

import { fromWPNode, type NormalizedProduct } from './products-normalize';
import { isPublicOpen, type PrivateAccessConfig } from './private-access/config';
import { decodeEntities, isComingSoonNode, withPlainPrices } from './private-access/normalize';

export const SS27_PATH = '/colecciones/ss27/';

export const SS27_HERO_IMAGES = [
  { src: '/ss27/coleccion/hero-duo-grey.webp', alt: 'Hype Distressed Hoodie gris y Athletic Dept Polo gris, Spring Summer 27' },
  { src: '/ss27/coleccion/hero-flatlay.webp', alt: 'Spring Summer 27 Part 01 completa, vista desde arriba' },
  { src: '/ss27/coleccion/hero-duo-athletic.webp', alt: 'Athletic Dept Boxy Tee blanca y navy, Spring Summer 27' },
] as const;

export const SS27_OG_IMAGE = '/ss27/coleccion/og.jpg';

/**
 * - `before`: todavía no abrió al público. No se lista nada privado.
 * - `opening`: ya es la hora pero el cron (cada 10 min) todavía no publicó
 *   los productos.
 * - `open`: hay productos publicados.
 */
export type Ss27State = 'before' | 'opening' | 'open';

export interface Ss27Product extends NormalizedProduct {
  /** Tag `proximamente`: vidriera, sin link ni talles (igual que en /private-access). */
  comingSoon: boolean;
}

/**
 * Preview solo local: SS27_COLECCION_PREVIEW=before|open en .env.local fuerza
 * el estado (y con `open` lista también los privados, para ver la grilla antes
 * del 11/10). Fuera de `next dev` no existe.
 */
export function previewOverride(): 'before' | 'open' | null {
  // Solo `next dev`: cualquier build (Vercel production o preview) corre con
  // NODE_ENV=production. VERCEL_ENV no sirve de guarda: el .env.local bajado
  // de Vercel lo trae en "production".
  if (process.env.NODE_ENV !== 'development') return null;
  const v = process.env.SS27_COLECCION_PREVIEW;
  return v === 'before' || v === 'open' ? v : null;
}

/** Nodos del mu-plugin (orden menu_order de Woo) → cards. Solo publicados, salvo `includePrivate`. */
export function toSs27Products(nodes: any[], includePrivate = false): Ss27Product[] {
  return (nodes ?? [])
    .filter((n) => n && (includePrivate || n.status === 'publish'))
    .map((n) => {
      const base = fromWPNode(withPlainPrices({ ...n, name: decodeEntities(n?.name) }));
      return { ...base, href: `/producto/${base.slug}`, comingSoon: isComingSoonNode(n) };
    });
}

export function ss27State(config: PrivateAccessConfig, publishedCount: number, now = Date.now()): Ss27State {
  // Abierta = pasó la hora, o se abrió a mano desde el panel (openedAt).
  // Un producto del tag publicado antes de tiempo no abre la página solo.
  if (!isPublicOpen(config, now) && !config.openedAt) return 'before';
  return publishedCount > 0 ? 'open' : 'opening';
}

/** Props del ProductCard (mismos campos que CategoriaPage). */
export function toCardProps(p: Ss27Product) {
  return {
    id: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    badge: p.badge,
    image: p.image,
    images: p.images,
    sizes: p.sizes,
    stock: p.stock,
    href: `/producto/${p.slug}`,
    customizable: p.customizable,
    ...(p.comingSoon
      ? { badge: 'Próximamente', disableLink: true, price: p.originalPrice ?? p.price, originalPrice: undefined }
      : {}),
  };
}
