// Auditoría diaria de precios mayoristas.
//
// El precio mayorista se deriva del regular_price (lib/mayorista-pricing.ts),
// así que cualquier cambio de regular_price en un producto del catálogo
// mayorista lo mueve, venga de un script, del admin de WP o de un SALE mal
// hecho (23/09/2026: regular ×1,2 en 88 productos → mayorista +20% sin que
// nadie lo viera). WooCommerce no guarda historial de precios, así que la
// referencia vive en el producto mismo: la meta `_hs_ws_audit` guarda el
// último regular_price auditado. El cron compara, avisa y actualiza la meta.
// No es una fuente de verdad del precio: es la marca de "lo último que vimos".

import { wholesalePrice } from './mayorista-pricing';

export const WS_AUDIT_META = '_hs_ws_audit';

export interface AuditInput {
  id: number;
  name: string;
  /** regular_price que rige (el de las variaciones, o el del producto si es simple). */
  regularPrice: number | null;
  /** regular_price distintos entre variaciones (debería ser uno solo). */
  regulars: number[];
  meta: { key: string; value: unknown }[];
  /** ¿Está en el catálogo mayorista? (publicado, no pack/set/gift/excluido). */
  wholesale: boolean;
  /**
   * Precio al que la tienda vende HOY si está en oferta (el menor entre las
   * variaciones publicadas), o null si no hay oferta. El mayorista sigue
   * pagando 50% del regular_price: la oferta no le cambia el precio, pero sí
   * cuánto puede recargar al revender.
   */
  salePrice?: number | null;
}

/**
 * 13/10/2026: 77 de 117 productos del catálogo mayorista estaban en oferta
 * minorista (la mayoría 10% off, varios 33–42%). El mayorista paga 50% de la
 * lista; si la tienda vende a menos de 2× ese precio, el revendedor ya no
 * recarga 100%. Nadie lo veía: todo el riesgo se medía contra regular_price.
 *
 *   recargo real = precio de venta hoy / precio mayorista − 1
 *   critical     recargo real < 50% (el local casi no puede competir con la tienda)
 *   reduced      recargo real < 100% (hay oferta, el recargo bajó)
 */
export type SaleMarkupLevel = 'critical' | 'reduced';
export const CRITICAL_MARKUP = 0.5;

export interface SaleMarkup {
  id: number; name: string;
  /** PVP de lista (regular_price). */
  regular: number;
  /** Precio de venta hoy en la tienda. */
  sale: number;
  /** Precio mayorista (50% de lista). */
  ws: number;
  /** Recargo real del revendedor vendiendo al precio de hoy (1 = 100%). */
  markup: number;
  level: SaleMarkupLevel;
}

/** Recargo real del revendedor con la oferta minorista vigente, o null si no hay oferta. */
export function saleMarkupOf(p: Pick<AuditInput, 'id' | 'name' | 'regularPrice' | 'salePrice'>): SaleMarkup | null {
  const regular = Number(p.regularPrice), sale = Number(p.salePrice);
  if (!Number.isFinite(regular) || regular <= 0 || !Number.isFinite(sale) || sale <= 0 || sale >= regular) return null;
  const ws = wholesalePrice(regular);
  const markup = sale / ws - 1;
  return { id: p.id, name: p.name, regular, sale, ws, markup, level: markup < CRITICAL_MARKUP ? 'critical' : 'reduced' };
}

export interface AuditMark { regular: number; ws: number; at: string }

export interface PriceChange {
  id: number; name: string;
  before: number; after: number;
  wsBefore: number; wsAfter: number;
  since: string;
}

export interface AuditResult {
  /** Productos mayoristas cuyo regular_price cambió desde la última auditoría. */
  changes: PriceChange[];
  /** Productos mayoristas sin marca previa: se toma la foto de hoy, sin alertar. */
  baseline: { id: number; name: string; regular: number }[];
  /** Variaciones con regular_price distinto dentro del mismo producto. */
  divergent: { id: number; name: string; regulars: number[] }[];
  /** Productos mayoristas sin regular_price: no se pueden vender por el portal. */
  unpriced: { id: number; name: string }[];
  /** Escrituras de meta para dejar la marca al día (products/batch). */
  updates: { id: number; meta_data: { key: string; value: string }[] }[];
  /** Mayoristas sin novedades. */
  unchanged: number;
  /** Productos mayoristas en oferta minorista, del recargo real más bajo al más alto. */
  saleMarkup: SaleMarkup[];
}

export function parseAuditMark(meta: { key: string; value: unknown }[] | undefined): AuditMark | null {
  const raw = meta?.find(m => m.key === WS_AUDIT_META)?.value;
  if (raw == null || raw === '') return null;
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const regular = Number(v?.regular);
    if (!Number.isFinite(regular) || regular <= 0) return null;
    return { regular, ws: Number(v?.ws) || wholesalePrice(regular), at: String(v?.at ?? '') };
  } catch {
    return null;
  }
}

export function auditMarkValue(regular: number, today: string): string {
  return JSON.stringify({ regular, ws: wholesalePrice(regular), at: today });
}

export function auditWholesalePrices(products: AuditInput[], today = new Date().toISOString().slice(0, 10)): AuditResult {
  const out: AuditResult = { changes: [], baseline: [], divergent: [], unpriced: [], updates: [], unchanged: 0, saleMarkup: [] };
  for (const p of products) {
    if (!p.wholesale) continue;
    if (p.regulars.length > 1) out.divergent.push({ id: p.id, name: p.name, regulars: p.regulars });
    if (p.regularPrice == null || p.regularPrice <= 0) { out.unpriced.push({ id: p.id, name: p.name }); continue; }
    const sm = saleMarkupOf(p);
    if (sm) out.saleMarkup.push(sm);
    const mark = parseAuditMark(p.meta);
    if (!mark) {
      out.baseline.push({ id: p.id, name: p.name, regular: p.regularPrice });
      out.updates.push({ id: p.id, meta_data: [{ key: WS_AUDIT_META, value: auditMarkValue(p.regularPrice, today) }] });
      continue;
    }
    if (mark.regular === p.regularPrice) { out.unchanged++; continue; }
    out.changes.push({
      id: p.id, name: p.name,
      before: mark.regular, after: p.regularPrice,
      wsBefore: wholesalePrice(mark.regular), wsAfter: wholesalePrice(p.regularPrice),
      since: mark.at,
    });
    out.updates.push({ id: p.id, meta_data: [{ key: WS_AUDIT_META, value: auditMarkValue(p.regularPrice, today) }] });
  }
  out.saleMarkup.sort((a, b) => a.markup - b.markup || a.id - b.id);
  return out;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Sección del mail con las ofertas minoristas que bajan el recargo del revendedor. */
export function saleMarkupHtml(list: SaleMarkup[]): string {
  if (!list.length) return '';
  const critical = list.filter(s => s.level === 'critical').length;
  const rows = list.map(s => `<tr${s.level === 'critical' ? ' style="background:#fff3f3"' : ''}>
    <td style="padding:6px 8px;border:1px solid #eee">${s.id}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${s.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${fmt(s.regular)}</td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right"><b>${fmt(s.sale)}</b> (−${pct(1 - s.sale / s.regular)})</td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${fmt(s.ws)}</td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right;${s.level === 'critical' ? 'color:#b00;font-weight:bold' : ''}">${pct(s.markup)}</td>
  </tr>`).join('');
  return `<h3 style="font-size:14px;margin-top:20px">Ofertas minoristas que bajan el recargo del revendedor (${list.length})</h3>
    <p style="font-size:12px;color:#444">El mayorista paga 50% de la lista. Con la tienda en oferta, vendiendo al precio de hoy recarga menos del 100%${critical ? `; <b style="color:#b00">${critical} con recargo menor al ${pct(CRITICAL_MARKUP)}</b>` : ''}. No cambia ningún precio: es para decidir si la oferta sigue, si el producto sale del mayorista o si se avisa al local.</p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">id</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Lista</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Hoy en la tienda</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Mayorista</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Recargo real</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
}

/** Cuerpo del mail de alerta. Solo se manda si hay cambios (o a pedido). */
export function auditEmailHtml(r: AuditResult, today: string): string {
  const rows = r.changes.map(c => `<tr>
    <td style="padding:6px 8px;border:1px solid #eee">${c.id}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${c.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${fmt(c.before)} → <b>${fmt(c.after)}</b></td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${fmt(c.wsBefore)} → <b>${fmt(c.wsAfter)}</b></td>
    <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${((c.wsAfter / c.wsBefore - 1) * 100).toFixed(1)}%</td>
  </tr>`).join('');
  const extra = [
    r.divergent.length ? `<p style="font-size:12px;color:#b00">Variaciones con regular_price distinto: ${r.divergent.map(d => `${d.name} (${d.regulars.map(fmt).join(' / ')})`).join('; ')}.</p>` : '',
    r.unpriced.length ? `<p style="font-size:12px;color:#b00">Sin regular_price: ${r.unpriced.map(u => u.name).join('; ')}.</p>` : '',
    r.baseline.length ? `<p style="font-size:12px;color:#444">Primera foto tomada para ${r.baseline.length} producto(s).</p>` : '',
  ].join('');
  return `<div style="font-family:Arial,sans-serif;max-width:720px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Hype. — Precios mayoristas · ${today}</h2>
    <p style="font-size:13px">${r.changes.length ? `<b>${r.changes.length} producto(s)</b> del catálogo mayorista cambiaron de precio mayorista desde la última auditoría. El precio mayorista es el 50% del regular_price: si el cambio no fue intencional, revisar el regular_price en Woo.` : 'Sin cambios en los precios mayoristas.'}</p>
    ${r.changes.length ? `<table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">id</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">PVP (regular)</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Mayorista</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Δ</th>
      </tr></thead><tbody>${rows}</tbody></table>` : ''}
    ${extra}
    ${saleMarkupHtml(r.saleMarkup)}
    <p style="font-size:11px;color:#888;margin-top:12px">Sin novedades: ${r.unchanged}. Este aviso lo manda /api/admin/mayorista-precios-audit (cron diario).</p>
  </div>`;
}
