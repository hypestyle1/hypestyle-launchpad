// Vista de campaña para el portal mayorista (pura, sin red).
//
// Toma el catálogo ya normalizado y las campañas guardadas, decide cuál está
// vigente AHORA y le cuelga a cada producto su promo (grupo, descuento, precio
// promo, etiqueta). El precio que se cobra lo recalcula el servidor al
// confirmar (lib/wholesale-campaigns.applyCampaign): esto es lo que se muestra.

import type { MayoristaProduct } from './mayorista-products';
import { campaignDiscountFor, liveCampaigns, discountOfItem, type WholesaleCampaign } from './wholesale-campaigns';
import { NEXT_DROP_LABEL } from './mayorista-copy';

/** Etiqueta de escasez por producto: `note: 'sin-reposicion'` en el ítem de
 *  la campaña la fuerza; el resto de la campaña dice "Unidades limitadas". */
export type PromoTag = 'sin-reposicion' | 'unidades-limitadas';
export const PROMO_TAG_LABEL: Record<PromoTag, string> = { 'sin-reposicion': 'Sin reposición', 'unidades-limitadas': 'Unidades limitadas' };

export interface ProductPromo {
  campaignId: string;
  group: string;
  label: string;
  discount: number;
  /** Precio promo = wholesalePrice × (1 − discount), redondeado. */
  price: number;
  saving: number;
  badge: string;
  tag: PromoTag;
}

export interface CampaignBanner {
  id: string;
  name: string;
  badge: string;
  headline: string;
  text: string;
  cta: string;
  secondary: string;
  startsAt: string;
  endsAt: string;
  /** Mayor descuento de la campaña, para "HASTA 20% EXTRA". */
  maxDiscount: number;
  groups: { key: string; label: string; discount: number; count: number }[];
  /** Productos de la campaña que están en el catálogo (con stock). */
  productCount: number;
}

export type PromoFilter = 'all' | 'promo' | { group: string };

export function promoTagOf(c: WholesaleCampaign, productId: number): PromoTag {
  const it = c.items.find(i => i.productId === productId);
  return it?.note === 'sin-reposicion' ? 'sin-reposicion' : 'unidades-limitadas';
}

/** El catálogo con la promo vigente colgada a cada producto. */
export function decorateCatalog(products: MayoristaProduct[], campaigns: WholesaleCampaign[], now: Date | string | number = Date.now()): MayoristaProduct[] {
  const live = liveCampaigns(campaigns, now);
  if (!live.length) return products.map(p => ({ ...p, promo: undefined }));
  return products.map(p => {
    const d = campaignDiscountFor(live, p.productId, now);
    if (!d) return { ...p, promo: undefined };
    const c = live.find(x => x.id === d.campaignId)!;
    const price = Math.round(p.wholesalePrice * (1 - d.discount));
    const promo: ProductPromo = {
      campaignId: d.campaignId, group: d.group, discount: d.discount, price, saving: p.wholesalePrice - price,
      label: c.groups.find(g => g.key === d.group)?.label ?? `${Math.round(d.discount * 100)}% EXTRA`,
      badge: c.badge || 'LIQUIDACIÓN', tag: promoTagOf(c, p.productId),
    };
    return { ...p, promo };
  });
}

/** Datos del hero. `null` si no hay campaña vigente. Cuenta los productos
 *  por grupo sobre el catálogo real (lo agotado no cuenta). */
export function campaignBanner(products: MayoristaProduct[], campaigns: WholesaleCampaign[], now: Date | string | number = Date.now()): CampaignBanner | null {
  const live = liveCampaigns(campaigns, now);
  if (!live.length) return null;
  // Con más de una vigente, el hero es de la que más productos tiene en catálogo.
  const inCatalog = new Set(products.map(p => p.productId));
  const c = [...live].sort((a, b) => b.items.filter(i => inCatalog.has(i.productId)).length - a.items.filter(i => inCatalog.has(i.productId)).length)[0];
  const groups = c.groups.map(g => ({
    key: g.key, label: g.label, discount: g.discount,
    count: c.items.filter(i => i.group === g.key && inCatalog.has(i.productId) && discountOfItem(c, i) > 0).length,
  }));
  return {
    id: c.id, name: c.name, badge: c.badge || 'LIQUIDACIÓN', headline: c.headline || c.name, text: c.text,
    cta: c.cta || 'Ver la liquidación', secondary: c.secondary || (NEXT_DROP_LABEL ? `Next drop ${NEXT_DROP_LABEL}` : ''),
    startsAt: c.startsAt, endsAt: c.endsAt,
    maxDiscount: Math.max(0, ...c.items.map(i => discountOfItem(c, i))),
    groups,
    productCount: c.items.filter(i => inCatalog.has(i.productId)).length,
  };
}

export function filterByPromo(products: MayoristaProduct[], filter: PromoFilter): MayoristaProduct[] {
  if (filter === 'all') return products;
  if (filter === 'promo') return products.filter(p => p.promo);
  return products.filter(p => p.promo?.group === filter.group);
}

/** Promo primero (mayor descuento antes), después el orden que ya traía el catálogo. */
export function sortPromoFirst(products: MayoristaProduct[]): MayoristaProduct[] {
  return products.map((p, i) => ({ p, i })).sort((a, b) => (b.p.promo?.discount ?? -1) - (a.p.promo?.discount ?? -1) || a.i - b.i).map(x => x.p);
}

/** "Termina el 02.10 · 23:59" en hora Argentina. */
export function endsLabel(iso: string): string {
  // Argentina es UTC-3 fijo: se arma a mano (el ICU de Node no siempre
  // respeta `2-digit` en es-AR).
  const d = new Date(new Date(iso).getTime() - 3 * 3600000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `Termina el ${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
