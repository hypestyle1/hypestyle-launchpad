// Reporte de stock de Woo Analytics: variaciones bajas y agotadas, con el
// umbral que ya configura Woo. Sin caché a propósito (stock cambia con cada
// venta). Medido en producción: ~1 s por tipo.

import { wcAuthHeader, WC_WP_URL } from '@/lib/wc-admin';
import type { BriefProvider, StockReport, StockVariationRow } from '../types';

/** "CHRIST REIGNS TEE - M" → "M". Si no hay separador, ''. */
export function sizeFromReportName(name: string): string {
  const idx = name.lastIndexOf(' - ');
  return idx >= 0 ? name.slice(idx + 3).trim() : '';
}

export function normalizeStockRow(r: any, status: 'lowstock' | 'outofstock'): StockVariationRow {
  const id = Number(r.id);
  const parent = Number(r.parent_id) || 0;
  const qty = r.stock_quantity === null || r.stock_quantity === undefined ? null : Number(r.stock_quantity);
  return {
    id,
    productId: parent || id,
    name: String(r.name || ''),
    size: parent ? sizeFromReportName(String(r.name || '')) : '',
    qty,
    isParent: !parent,
    status,
    lowStockAmount: r.low_stock_amount == null ? null : Number(r.low_stock_amount),
  };
}

async function fetchType(status: 'lowstock' | 'outofstock'): Promise<StockVariationRow[]> {
  const out: StockVariationRow[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${WC_WP_URL}/wp-json/wc-analytics/reports/stock?type=${status}&per_page=100&page=${page}&_cb=${Date.now()}`,
      { headers: wcAuthHeader(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`WC ${res.status} al leer el reporte de stock (${status})`);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const r of data) out.push(normalizeStockRow(r, status));
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
    if (page >= totalPages || data.length < 100) break;
  }
  return out;
}

async function fetchTotals(): Promise<StockReport['totals']> {
  try {
    const res = await fetch(`${WC_WP_URL}/wp-json/wc-analytics/reports/stock/stats?_cb=${Date.now()}`, { headers: wcAuthHeader(), cache: 'no-store' });
    if (!res.ok) return null;
    const d = await res.json();
    const t = d?.totals || {};
    return { lowstock: Number(t.lowstock) || 0, outofstock: Number(t.outofstock) || 0, instock: Number(t.instock) || 0 };
  } catch { return null; }
}

export const stockProvider: BriefProvider<'stock.report'> = {
  key: 'stock.report',
  domain: 'stock',
  async load() {
    const [low, out, totals] = await Promise.all([fetchType('lowstock'), fetchType('outofstock'), fetchTotals()]);
    return { low, out, totals };
  },
};
