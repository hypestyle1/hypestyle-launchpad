// Lado servidor de Private Access: config, sesión desde la cookie del request
// y catálogo privado. Todo pasa por el mu-plugin con el secreto
// (server-to-server); el browser nunca habla con WordPress para esto.
// En modo mock (PRIVATE_ACCESS_MOCK=1) no se toca WordPress.

import { cookies } from 'next/headers';
import {
  DEFAULT_CONFIG, PRIVATE_ACCESS_COOKIE, fmtDayMonth, isMockMode, isPrivateAccessActive,
  type PrivateAccessConfig,
} from './config';
import { verifySessionToken, type PrivateAccessSession } from './session';
import { getMockProduct, getMockProducts } from './mock';
import { fromPrivateNode, stockFromNode, withPlainPrices, type PrivateProduct, type StockLevel } from './normalize';
import { wpGet } from './store';
import { normalizeProductDetail } from '@/lib/product-detail';
import type { Product } from '@/data/products';

/**
 * Config vigente. Cacheada 60 s en el Data Cache de Next: el home la pide en
 * cada render y no puede pegarle a WordPress por visita.
 *
 * Si WordPress falla o el plugin todavía no está subido, devuelve el default
 * APAGADO: ante la duda la preventa no se muestra (fail-closed). Mientras el
 * cache tenga una respuesta buena, Next sigue sirviéndola aunque WP se caiga.
 */
/** Tag del cache de la config: el panel lo invalida al guardar (pausar es instantáneo). */
export const CONFIG_TAG = 'private-access-config';

export async function getPrivateAccessConfig(): Promise<PrivateAccessConfig> {
  if (isMockMode()) return { ...DEFAULT_CONFIG, enabled: true };
  const r = await wpGet<PrivateAccessConfig>('/config', {}, { revalidate: 60, tags: [CONFIG_TAG] });
  if (r.ok === false) {
    if (!r.notDeployed) console.error('[private-access] config', r.status, r.error);
    return DEFAULT_CONFIG;
  }
  return { ...DEFAULT_CONFIG, ...r.data };
}

/** Lo mismo pero sin cache: para el admin y el cron, que necesitan el dato fresco. */
export async function getPrivateAccessConfigFresh(): Promise<{ config: PrivateAccessConfig; notDeployed?: boolean; error?: string }> {
  if (isMockMode()) return { config: { ...DEFAULT_CONFIG, enabled: true } };
  const r = await wpGet<PrivateAccessConfig>('/config');
  if (r.ok === false) return { config: DEFAULT_CONFIG, notDeployed: r.notDeployed, error: r.error };
  return { config: { ...DEFAULT_CONFIG, ...r.data } };
}

export interface PrivateAccessState {
  active: boolean;
  session: PrivateAccessSession | null;
  config: PrivateAccessConfig;
}

/** Lee la cookie del request actual. Vuelve dinámica a la página que lo llama (a propósito). */
export async function readPrivateAccessState(): Promise<PrivateAccessState> {
  const config = await getPrivateAccessConfig();
  const active = isPrivateAccessActive(config);
  const token = cookies().get(PRIVATE_ACCESS_COOKIE)?.value;
  const session = active ? await verifySessionToken(token) : null;
  return { active, session, config };
}

export function labelsFor(config: PrivateAccessConfig) {
  return {
    collectionName: config.collectionName,
    collectionSubtitle: config.collectionSubtitle,
    discountPct: config.discountPct,
    saleEndsLabel: fmtDayMonth(config.saleEndsAt),
    publicOpenLabel: fmtDayMonth(config.publicOpenAt),
  };
}

export async function fetchPrivateProducts(config: PrivateAccessConfig): Promise<PrivateProduct[]> {
  if (isMockMode()) return getMockProducts();
  const r = await wpGet<{ products: { nodes: any[] } }>('/products');
  if (r.ok === false) {
    console.error('[private-access] products', r.status, r.error);
    return [];
  }
  const l = labelsFor(config);
  return (r.data.products?.nodes ?? []).map((n) => fromPrivateNode(n, l));
}

/**
 * Producto privado con el MISMO shape que la ficha pública (lib/product-detail):
 * la ficha de Private Access es la ficha normal con una capa encima.
 */
export async function fetchPrivateProductDetail(slug: string): Promise<Product | undefined> {
  if (isMockMode()) {
    const m = getMockProduct(slug);
    if (!m) return undefined;
    return {
      slug: m.slug, id: m.slug, name: m.name, category: m.category, price: m.price, originalPrice: m.originalPrice,
      description: m.description, fit: 'Oversize', sizes: m.sizes, stock: m.stock,
      careItems: [
        { icon: 'wash', text: 'Lavar a mano o a máquina en agua fría (máx. 30°C)' },
        { icon: 'no-dryer', text: 'No usar secadora' },
      ],
      colors: [{ label: '', value: '#1a1a1a', image: m.image }],
      images: m.images,
    };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,149}$/.test(slug)) return undefined;
  const r = await wpGet<{ product: any }>('/product', { slug });
  if (r.ok === false) {
    if (r.status !== 404) console.error('[private-access] product detail', slug, r.status, r.error);
    return undefined;
  }
  return normalizeProductDetail(withPlainPrices(r.data.product));
}

/** Stock en vivo por talle (para el chequeo antes de agregar al carrito). */
export async function fetchPrivateStock(slug: string): Promise<Record<string, StockLevel> | null> {
  if (isMockMode()) return getMockProduct(slug)?.stock ?? null;
  if (!/^[a-z0-9][a-z0-9-]{0,149}$/.test(slug)) return null;
  const r = await wpGet<any>('/stock', { slug });
  if (r.ok === false) return null;
  return stockFromNode(r.data);
}

export type { PrivateProduct };
