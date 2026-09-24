// Wholesale Campaigns V1 — motor puro (sin red, sin React).
//
//   wholesale_regular  = regular_price × 0,50           (lib/mayorista-pricing.ts)
//   wholesale_campaign = wholesale_regular × (1 − descuento de campaña)
//
// La campaña es configuración (WP option `hs_wholesale_campaigns`, JSON) y
// NUNCA toca regular_price ni sale_price de Woo. Un producto está en una sola
// campaña vigente a la vez: si dos lo incluyen, gana el mayor descuento. La
// vigencia se decide acá, en cada lectura, con la fecha actual: una campaña
// `active` fuera de [startsAt, endsAt] NO aplica aunque ningún cron la haya
// marcado `ended` todavía. El cron solo deja prolijo el estado persistido.
//
// Fechas: ISO con offset. Argentina es UTC-3 fijo (sin horario de verano), y
// `arDate()` arma los límites del día en esa zona para que "termina el 02.10"
// sea 02.10 23:59:59 en Buenos Aires, no en UTC.

import { wholesalePrice } from './mayorista-pricing';
import type { PricingResult, PricedLine, PriceChange } from './mayorista-pricing';
import { wholesaleMarginRisk, type WholesaleRiskLevel } from './wholesale-margin-risk';

export const WHOLESALE_CAMPAIGNS_OPTION = 'hs_wholesale_campaigns';
export const AR_OFFSET = '-03:00';
export const MAX_DISCOUNT = 0.6;

export type CampaignStatus = 'draft' | 'active' | 'ended';
/** Estado que ve el admin: `active` persistido pero fuera de fechas se lee como scheduled/ended. */
export type EffectiveStatus = 'draft' | 'scheduled' | 'active' | 'ended';

export interface CampaignGroup { key: string; label: string; discount: number }
export interface CampaignItem {
  productId: number;
  group: string;
  /** Pisa el descuento del grupo (0 a MAX_DISCOUNT). */
  discount?: number;
  note?: string;
  /** El admin aceptó incluir un producto CRITICAL con descuento extra. */
  acceptCritical?: boolean;
}
export interface CampaignHistoryEntry { at: string; from: string; to: string; by?: string; note?: string }

export interface WholesaleCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  badge: string;
  headline: string;
  text: string;
  /** Mínimo de pedido propio de la campaña (null = el general). */
  minOrder: number | null;
  groups: CampaignGroup[];
  items: CampaignItem[];
  createdAt: string;
  updatedAt: string;
  activatedAt?: string | null;
  endedAt?: string | null;
  history: CampaignHistoryEntry[];
}

/* ─── Fechas ───────────────────────────────────────────────────────────── */

/** `arDate('2026-10-02', 'end')` → '2026-10-02T23:59:59-03:00'. */
export function arDate(ymd: string, edge: 'start' | 'end' = 'start'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`Fecha inválida: ${ymd}`);
  return `${ymd}T${edge === 'end' ? '23:59:59' : '00:00:00'}${AR_OFFSET}`;
}

function ts(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error(`Fecha inválida: ${iso}`);
  return t;
}

/* ─── Normalización / validación ───────────────────────────────────────── */

export interface CampaignProblem { field: string; message: string }

const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** Devuelve la campaña saneada o la lista de problemas. No inventa datos. */
export function validateCampaign(raw: any): { campaign: WholesaleCampaign | null; problems: CampaignProblem[] } {
  const problems: CampaignProblem[] = [];
  const id = String(raw?.id ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/i.test(id)) problems.push({ field: 'id', message: 'id inválido (letras, números, guiones; 3-80)' });
  const name = String(raw?.name ?? '').trim();
  if (!name) problems.push({ field: 'name', message: 'Falta el nombre' });
  const status = raw?.status;
  if (!['draft', 'active', 'ended'].includes(status)) problems.push({ field: 'status', message: 'status debe ser draft, active o ended' });
  let startsAt = '', endsAt = '';
  try { startsAt = new Date(ts(String(raw?.startsAt))).toISOString(); } catch { problems.push({ field: 'startsAt', message: 'Fecha de inicio inválida' }); }
  try { endsAt = new Date(ts(String(raw?.endsAt))).toISOString(); } catch { problems.push({ field: 'endsAt', message: 'Fecha de fin inválida' }); }
  if (startsAt && endsAt && ts(endsAt) <= ts(startsAt)) problems.push({ field: 'endsAt', message: 'El fin tiene que ser posterior al inicio' });

  const groups: CampaignGroup[] = [];
  const seenGroups = new Set<string>();
  for (const g of Array.isArray(raw?.groups) ? raw.groups : []) {
    const key = String(g?.key ?? '').trim();
    const discount = num(g?.discount);
    if (!key || seenGroups.has(key)) { problems.push({ field: 'groups', message: `Grupo sin key o repetido: "${key}"` }); continue; }
    if (discount == null || discount < 0 || discount > MAX_DISCOUNT) { problems.push({ field: 'groups', message: `Descuento del grupo "${key}" fuera de 0-${MAX_DISCOUNT * 100}%` }); continue; }
    seenGroups.add(key);
    groups.push({ key, label: String(g?.label ?? key), discount });
  }
  if (!groups.length) problems.push({ field: 'groups', message: 'Hace falta al menos un grupo' });

  const items: CampaignItem[] = [];
  const seenItems = new Set<number>();
  for (const it of Array.isArray(raw?.items) ? raw.items : []) {
    const productId = num(it?.productId);
    if (!productId || productId <= 0) { problems.push({ field: 'items', message: 'Ítem sin productId' }); continue; }
    if (seenItems.has(productId)) { problems.push({ field: 'items', message: `Producto ${productId} repetido` }); continue; }
    const group = String(it?.group ?? '');
    if (!seenGroups.has(group)) { problems.push({ field: 'items', message: `Producto ${productId}: grupo "${group}" no existe` }); continue; }
    const item: CampaignItem = { productId, group };
    if (it?.discount !== undefined && it?.discount !== null && it?.discount !== '') {
      const d = num(it.discount);
      if (d == null || d < 0 || d > MAX_DISCOUNT) { problems.push({ field: 'items', message: `Producto ${productId}: descuento fuera de 0-${MAX_DISCOUNT * 100}%` }); continue; }
      item.discount = d;
    }
    if (it?.note) item.note = String(it.note);
    if (it?.acceptCritical === true) item.acceptCritical = true;
    seenItems.add(productId);
    items.push(item);
  }

  const minOrder = raw?.minOrder == null || raw?.minOrder === '' ? null : num(raw.minOrder);
  if (minOrder != null && minOrder < 0) problems.push({ field: 'minOrder', message: 'Mínimo inválido' });

  if (problems.length) return { campaign: null, problems };
  const now = new Date().toISOString();
  return {
    problems,
    campaign: {
      id, name, status, startsAt, endsAt,
      badge: String(raw?.badge ?? '').trim(),
      headline: String(raw?.headline ?? '').trim(),
      text: String(raw?.text ?? '').trim(),
      minOrder,
      groups, items,
      createdAt: raw?.createdAt ? String(raw.createdAt) : now,
      updatedAt: now,
      activatedAt: raw?.activatedAt ?? null,
      endedAt: raw?.endedAt ?? null,
      history: Array.isArray(raw?.history) ? raw.history : [],
    },
  };
}

/* ─── Vigencia ─────────────────────────────────────────────────────────── */

export function effectiveStatus(c: WholesaleCampaign, now: Date | string | number = Date.now()): EffectiveStatus {
  if (c.status === 'draft') return 'draft';
  if (c.status === 'ended') return 'ended';
  const t = typeof now === 'number' ? now : ts(typeof now === 'string' ? now : now.toISOString());
  if (t < ts(c.startsAt)) return 'scheduled';
  if (t > ts(c.endsAt)) return 'ended';
  return 'active';
}

export function isCampaignLive(c: WholesaleCampaign, now: Date | string | number = Date.now()): boolean {
  return effectiveStatus(c, now) === 'active';
}

export function liveCampaigns(list: WholesaleCampaign[], now: Date | string | number = Date.now()): WholesaleCampaign[] {
  return list.filter(c => isCampaignLive(c, now));
}

export interface CampaignDiscount { campaignId: string; campaignName: string; group: string; discount: number; badge: string }

export function discountOfItem(c: WholesaleCampaign, item: CampaignItem): number {
  if (typeof item.discount === 'number') return item.discount;
  return c.groups.find(g => g.key === item.group)?.discount ?? 0;
}

/** El descuento que rige para un producto hoy: la campaña vigente que más le
 *  descuenta. `null` si ninguna vigente lo incluye (o el descuento es 0). */
export function campaignDiscountFor(list: WholesaleCampaign[], productId: number, now: Date | string | number = Date.now()): CampaignDiscount | null {
  let best: CampaignDiscount | null = null;
  for (const c of liveCampaigns(list, now)) {
    const item = c.items.find(i => i.productId === productId);
    if (!item) continue;
    const discount = discountOfItem(c, item);
    if (discount <= 0) continue;
    if (!best || discount > best.discount) best = { campaignId: c.id, campaignName: c.name, group: item.group, discount, badge: c.badge };
  }
  return best;
}

/** Productos que aparecen en más de una campaña vigente (aviso al admin). */
export function overlappingProducts(list: WholesaleCampaign[], now: Date | string | number = Date.now()): { productId: number; campaigns: string[] }[] {
  const seen = new Map<number, string[]>();
  for (const c of liveCampaigns(list, now)) for (const it of c.items) seen.set(it.productId, [...(seen.get(it.productId) ?? []), c.id]);
  // Orden estable por productId: el admin y los tests lo leen como lista.
  return [...seen.entries()].filter(([, cs]) => cs.length > 1).map(([productId, campaigns]) => ({ productId, campaigns })).sort((a, b) => a.productId - b.productId);
}

/* ─── Precio de campaña sobre líneas ya resueltas ──────────────────────── */

export function campaignPrice(regularPrice: number, discount: number): { wsRegular: number; unitPrice: number } {
  const wsRegular = wholesalePrice(regularPrice);
  return { wsRegular, unitPrice: Math.round(wsRegular * (1 - discount)) };
}

export interface CampaignPricedLine extends PricedLine {
  /** Precio mayorista normal (50% del PVP). */
  wsRegular: number;
  campaign: CampaignDiscount | null;
}

export interface CampaignPricingResult extends Omit<PricingResult, 'lines'> {
  lines: CampaignPricedLine[];
  /** Descuento de campaña otorgado en $ (suma de líneas). */
  discountTotal: number;
  /** Campañas aplicadas en este pedido. */
  campaignIds: string[];
}

/** Toma el resultado de `priceLines` (precio normal, calculado en servidor) y
 *  aplica la campaña vigente línea por línea. Sin campaña, devuelve lo mismo
 *  con `wsRegular = unitPrice` y `campaign = null`. Los cambios contra el
 *  carrito se recalculan contra el precio final. */
export function applyCampaign(pricing: PricingResult, list: WholesaleCampaign[], now: Date | string | number = Date.now()): CampaignPricingResult {
  const lines: CampaignPricedLine[] = [];
  const changes: PriceChange[] = [];
  let discountTotal = 0;
  const campaignIds = new Set<string>();
  for (const l of pricing.lines) {
    const wsRegular = l.unitPrice;
    const c = campaignDiscountFor(list, l.productId, now);
    const unitPrice = c ? Math.round(wsRegular * (1 - c.discount)) : wsRegular;
    const changed = l.clientPrice == null || Math.round(l.clientPrice) !== unitPrice;
    if (c) { campaignIds.add(c.campaignId); discountTotal += (wsRegular - unitPrice) * l.quantity; }
    const line: CampaignPricedLine = { ...l, wsRegular, campaign: c, unitPrice, lineTotal: unitPrice * l.quantity, changed };
    lines.push(line);
    if (changed) changes.push({ slug: l.slug, name: l.name, size: l.size, ...(l.color ? { color: l.color } : {}), quantity: l.quantity, before: l.clientPrice, after: unitPrice });
  }
  return { lines, changes, unpriced: pricing.unpriced, total: lines.reduce((s, l) => s + l.lineTotal, 0), discountTotal, campaignIds: [...campaignIds] };
}

/* ─── Preview financiero ───────────────────────────────────────────────── */

export interface PreviewProduct {
  id: number;
  name: string;
  /** Unidades disponibles (null = sin gestión de stock). */
  stock: number | null;
  /** PVP real = regular_price. */
  regularPrice: number | null;
  cost: number | null;
  costReliable: boolean;
  /** ¿Está en el catálogo mayorista? */
  wholesale: boolean;
}

export interface PreviewRow {
  productId: number; name: string; group: string; discount: number;
  stock: number | null; wsRegular: number; wsPromo: number;
  valueNormal: number; valuePromo: number; cost: number | null;
  marginPromo: number | null; risk: WholesaleRiskLevel; acceptCritical: boolean;
}

export interface CampaignPreview {
  rows: PreviewRow[];
  totals: {
    products: number; units: number; valueNormal: number; valuePromo: number; discountTotal: number;
    cogsKnown: number; valuePromoKnown: number; marginKnown: number; marginKnownPct: number | null; productsWithCost: number;
  };
  byGroup: Record<string, { products: number; units: number; valueNormal: number; valuePromo: number; discountTotal: number; cogsKnown: number; marginKnown: number }>;
  costUnknown: { productId: number; name: string }[];
  risk: { productId: number; name: string; multiple: number | null }[];
  critical: { productId: number; name: string; multiple: number | null; accepted: boolean }[];
  /** En `items` pero fuera del catálogo mayorista (pack, set, gift, excluido): no se aplican. */
  excluded: { productId: number; name: string }[];
  /** En `items` pero no encontrados en el catálogo. */
  missing: number[];
  /** Sin stock gestionado: no entran en unidades ni valores. */
  unmanaged: { productId: number; name: string }[];
  /** Lo que impide activar: CRITICAL sin aceptar. */
  activationBlockers: { productId: number; name: string; reason: string }[];
}

export function campaignPreview(c: WholesaleCampaign, products: PreviewProduct[]): CampaignPreview {
  const byId = new Map(products.map(p => [p.id, p]));
  const out: CampaignPreview = {
    rows: [], byGroup: {}, costUnknown: [], risk: [], critical: [], excluded: [], missing: [], unmanaged: [], activationBlockers: [],
    totals: { products: 0, units: 0, valueNormal: 0, valuePromo: 0, discountTotal: 0, cogsKnown: 0, valuePromoKnown: 0, marginKnown: 0, marginKnownPct: null, productsWithCost: 0 },
  };
  for (const g of c.groups) out.byGroup[g.key] = { products: 0, units: 0, valueNormal: 0, valuePromo: 0, discountTotal: 0, cogsKnown: 0, marginKnown: 0 };

  for (const item of c.items) {
    const p = byId.get(item.productId);
    if (!p) { out.missing.push(item.productId); continue; }
    if (!p.wholesale || !p.regularPrice) { out.excluded.push({ productId: p.id, name: p.name }); continue; }
    const discount = discountOfItem(c, item);
    const { wsRegular, unitPrice: wsPromo } = campaignPrice(p.regularPrice, discount);
    const r = wholesaleMarginRisk({ regularPrice: p.regularPrice, cost: p.cost, costReliable: p.costReliable, wholesale: true });
    const stock = p.stock;
    const known = r.level !== 'COST_UNKNOWN' && p.cost != null;
    const row: PreviewRow = {
      productId: p.id, name: p.name, group: item.group, discount, stock, wsRegular, wsPromo,
      valueNormal: stock != null ? stock * wsRegular : 0, valuePromo: stock != null ? stock * wsPromo : 0,
      cost: known ? p.cost : null, marginPromo: known ? (wsPromo - p.cost!) / wsPromo : null, risk: r.level, acceptCritical: !!item.acceptCritical,
    };
    out.rows.push(row);
    if (stock == null) out.unmanaged.push({ productId: p.id, name: p.name });
    if (r.level === 'COST_UNKNOWN') out.costUnknown.push({ productId: p.id, name: p.name });
    if (r.level === 'RISK') out.risk.push({ productId: p.id, name: p.name, multiple: r.multiple });
    if (r.level === 'CRITICAL') {
      out.critical.push({ productId: p.id, name: p.name, multiple: r.multiple, accepted: !!item.acceptCritical });
      if (discount > 0 && !item.acceptCritical) out.activationBlockers.push({ productId: p.id, name: p.name, reason: `CRITICAL (${r.multiple?.toFixed(2)}x el costo) con ${Math.round(discount * 100)}% extra sin confirmación` });
    }
    const t = out.totals, g = out.byGroup[item.group];
    t.products++; g.products++;
    if (stock != null) {
      t.units += stock; g.units += stock;
      t.valueNormal += row.valueNormal; g.valueNormal += row.valueNormal;
      t.valuePromo += row.valuePromo; g.valuePromo += row.valuePromo;
      t.discountTotal += row.valueNormal - row.valuePromo; g.discountTotal += row.valueNormal - row.valuePromo;
      if (known) {
        t.productsWithCost++;
        t.cogsKnown += stock * p.cost!; g.cogsKnown += stock * p.cost!;
        t.valuePromoKnown += row.valuePromo;
        t.marginKnown += row.valuePromo - stock * p.cost!; g.marginKnown += row.valuePromo - stock * p.cost!;
      }
    }
  }
  out.totals.marginKnownPct = out.totals.valuePromoKnown ? out.totals.marginKnown / out.totals.valuePromoKnown : null;
  return out;
}

/* ─── Lista persistida (option) ────────────────────────────────────────── */

/** Upsert por id sobre la lista guardada; `deleteIds` saca campañas. */
export function mergeCampaigns(existing: WholesaleCampaign[], upserts: WholesaleCampaign[], deleteIds: string[] = []): WholesaleCampaign[] {
  const map = new Map(existing.map(c => [c.id, c]));
  for (const u of upserts) {
    const prev = map.get(u.id);
    const history = [...(prev?.history ?? []), ...(prev && prev.status !== u.status ? [{ at: u.updatedAt, from: prev.status, to: u.status }] : [])];
    map.set(u.id, {
      ...u,
      createdAt: prev?.createdAt ?? u.createdAt,
      activatedAt: u.status === 'active' && prev?.status !== 'active' ? u.updatedAt : (u.activatedAt ?? prev?.activatedAt ?? null),
      endedAt: u.status === 'ended' && prev?.status !== 'ended' ? u.updatedAt : (u.endedAt ?? prev?.endedAt ?? null),
      history,
    });
  }
  for (const id of deleteIds) map.delete(id);
  return [...map.values()];
}

/** Lo que haría el cron diario: marcar `ended` lo que ya venció. Es cosmética
 *  para el admin; la vigencia real la decide `isCampaignLive`. */
export function expireCampaigns(list: WholesaleCampaign[], now: Date | string | number = Date.now()): { list: WholesaleCampaign[]; ended: string[] } {
  const ended: string[] = [];
  const at = new Date(typeof now === 'number' ? now : now).toISOString();
  const next = list.map(c => {
    if (c.status === 'active' && effectiveStatus(c, now) === 'ended') {
      ended.push(c.id);
      return { ...c, status: 'ended' as const, endedAt: at, updatedAt: at, history: [...c.history, { at, from: 'active', to: 'ended', by: 'cron' }] };
    }
    return c;
  });
  return { list: next, ended };
}
