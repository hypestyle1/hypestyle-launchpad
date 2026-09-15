// Talle agotado en un producto del top del mes. La venta perdida se estima
// repartiendo las unidades del producto entre sus talles por igual (no hay
// mix por talle en los pedidos normalizados todavía). Confianza: estimated.

import { fmtARS, plural } from '../../format';
import type { ProductRank } from '@/lib/dashboard/finance';
import type { BriefRule, BriefSignal, SourceRef, StockVariationRow } from '../../types';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SIZE_RE = /^(XXS|XS|S|M|L|XL|XXL|XXXL|U|ÚNICO|UNICO|TU|\d{1,3}(?:[.,]\d)?)$/i;

/** "Zip Hoodie Camo - XL" → "Zip Hoodie Camo". Solo recorta si el sufijo parece un talle. */
export function stripSizeSuffix(name: string): string {
  const idx = name.lastIndexOf(' - ');
  if (idx < 0) return name.trim();
  const tail = name.slice(idx + 3).trim();
  return SIZE_RE.test(tail) ? name.slice(0, idx).trim() : name.trim();
}

export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => { const i = SIZE_ORDER.indexOf(s.toUpperCase()); return i === -1 ? SIZE_ORDER.length : i; };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** "M y XL" · "S, M y XL". */
export function listAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function groupByProduct(rows: StockVariationRow[]): Map<number, StockVariationRow[]> {
  const m = new Map<number, StockVariationRow[]>();
  for (const r of rows) (m.get(r.productId) || m.set(r.productId, []).get(r.productId)!).push(r);
  return m;
}

/** Nombre del producto: el prefijo de una variación del reporte si hay, si no el del line item sin talle. */
function productName(p: ProductRank, rows: StockVariationRow[]): string {
  const v = rows.find((r) => !r.isParent && r.name.includes(' - '));
  return v ? stripSizeSuffix(v.name) : stripSizeSuffix(p.name);
}

const label = (v: StockVariationRow) => v.size || stripSizeSuffix(v.name);

export const topProductSizeOut: BriefRule = {
  id: 'stock.top-product-size-out',
  domain: 'stock',
  requires: ['sales.30d', 'stock.report'],
  evaluate(inputs, ctx): BriefSignal[] {
    const sales = inputs['sales.30d']!;
    const report = inputs['stock.report']!;
    const { topN, sizesPerProduct, lostDays } = ctx.config.stock;
    const outBy = groupByProduct(report.out);
    const lowBy = groupByProduct(report.low);
    const top = sales.topProducts.slice(0, topN);
    const signals: BriefSignal[] = [];

    top.forEach((p, rank) => {
      const outAll = outBy.get(p.productId) || [];
      const lowAll = lowBy.get(p.productId) || [];
      // El padre aparece en el reporte cuando todas sus variaciones se agotan: no es un talle.
      const outVars = outAll.filter((v) => !v.isParent);
      const parentOut = outAll.some((v) => v.isParent);
      const out = outVars.length ? outVars : (parentOut && !lowAll.length ? outAll : []);
      if (!out.length) return;
      const low = lowAll.filter((v) => !v.isParent);

      const name = productName(p, [...outAll, ...lowAll]);
      const unitPrice = p.units > 0 ? p.revenue / p.units : 0;
      const dailyUnits = sales.days > 0 ? p.units / sales.days : 0;
      const sizesOut = outVars.length ? Math.min(sizesPerProduct, outVars.length) : sizesPerProduct;
      const share = Math.min(1, sizesOut / Math.max(1, sizesPerProduct));
      const amount = Math.round(dailyUnits * share * lostDays * unitPrice);

      const outLabels = sortSizes(outVars.map(label).filter(Boolean));
      const allOut = !outVars.length || outLabels.length >= sizesPerProduct;
      const sizesTxt = !outVars.length
        ? 'agotado'
        : allOut
          ? `agotado en todos los talles (${outLabels.join(', ')})`
          : `sin ${plural(outLabels.length, 'talle', 'talles')} ${listAnd(outLabels)}`;
      const lowTxt = low.length ? ` Bajo: ${sortSizes(low.map(label)).map((s) => `${s} (${low.find((v) => label(v) === s)?.qty ?? '?'})`).join(', ')}.` : '';

      const sourceRefs: SourceRef[] = [
        { type: 'product', id: p.productId, label: name },
        ...outVars.map((v) => ({ type: 'variation' as const, id: v.id, label: v.name })),
        ...low.map((v) => ({ type: 'variation' as const, id: v.id, label: v.name })),
      ];

      signals.push({
        id: `stock:top-product-size-out:${p.productId}`,
        domain: 'stock',
        rule: this.id,
        situation: `${name} ${sizesTxt}, es el top ${rank + 1} del mes`,
        evidence: `${p.units} vendidos en ${sales.days} días (${fmtARS(p.revenue)}). Venta perdida estimada ${fmtARS(amount)} en ${lostDays} días.${lowTxt}`,
        action: allOut ? 'Reponer o mandar a estampar si es POD; si no vuelve, sacarlo del top de la home.' : 'Reponer el talle, o mandarlo a estampar si es POD.',
        href: `${ctx.config.wpUrl}/wp-admin/post.php?post=${p.productId}&action=edit`,
        hrefLabel: 'Editar en Woo',
        impact: { amount, currency: 'ARS', kind: 'lost' },
        // Top 1 → 2, último del ranking → cerca de 1.
        urgency: 1 + (topN - rank) / topN,
        confidence: 'estimated',
        tone: 'warning',
        observedAt: ctx.now.toISOString(),
        entity: { type: 'product', id: p.productId, label: name },
        sourceRefs,
        meta: { rank: rank + 1, units30d: p.units, revenue30d: p.revenue, outSizes: outLabels, lowSizes: sortSizes(low.map(label)), unitPrice: Math.round(unitPrice), allOut },
      });
    });

    return signals;
  },
};
