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
  const out: AuditResult = { changes: [], baseline: [], divergent: [], unpriced: [], updates: [], unchanged: 0 };
  for (const p of products) {
    if (!p.wholesale) continue;
    if (p.regulars.length > 1) out.divergent.push({ id: p.id, name: p.name, regulars: p.regulars });
    if (p.regularPrice == null || p.regularPrice <= 0) { out.unpriced.push({ id: p.id, name: p.name }); continue; }
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
  return out;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

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
    <p style="font-size:11px;color:#888;margin-top:12px">Sin novedades: ${r.unchanged}. Este aviso lo manda /api/admin/mayorista-precios-audit (cron diario).</p>
  </div>`;
}
