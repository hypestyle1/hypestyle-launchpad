// "Mis pedidos" del mayorista: lo que se lee de cada orden de Woo para
// mostrar el detalle, seguir el envío y volver a pedir. Puro, sin red.

import { envioDeOrden, type MetodoEnvio } from './mayorista-envio';
import type { MayoristaProduct } from './mayorista-products';
import { sizeLevel, stockKey, canOrder } from './mayorista-products';
import type { MayoristaCartItem } from '@/context/MayoristaCartContext';

export interface PedidoLine {
  productId: number;
  variationId: number;
  name: string;
  size: string;
  color: string;
  quantity: number;
  /** Precio unitario cobrado (total de la línea / cantidad). */
  unitPrice: number;
  lineTotal: number;
}

export interface PedidoView {
  id: number;
  number: string;
  date: string;
  status: string;
  /** Total de la orden (después del saldo a favor). */
  total: number;
  /** Suma de las líneas (antes del saldo a favor). */
  subtotal: number;
  creditUsed: number;
  campaignName: string;
  itemCount: number;
  items: string[];
  lines: PedidoLine[];
  envio: { metodo: MetodoEnvio | null; destino: string; resumen: string };
  tracking: string;
  trackingUrl: string | null;
  mayorista: boolean;
}

type WcMeta = { key: string; value: unknown; display_key?: string; display_value?: unknown };

const SIZE_KEYS = ['talle', 'pa_talle', 'size', 'pa_size'];
const COLOR_KEYS = ['color', 'pa_color', 'colour'];

function lineAttr(meta: WcMeta[] | undefined, keys: string[]): string {
  const m = (meta ?? []).find(x => keys.includes(String(x.key ?? '').toLowerCase()));
  return m ? String(m.display_value ?? m.value ?? '').trim() : '';
}

function orderMeta(order: any, key: string): string {
  const m = (order?.meta_data as WcMeta[] | undefined)?.find(x => x.key === key);
  return m == null ? '' : String(m.value ?? '');
}

/**
 * Link de seguimiento según transportista. Solo Andreani tiene una URL
 * pública por número de envío; Via Cargo y los expresos se siguen en el sitio
 * del transportista con el número (se muestra como texto).
 */
export function trackingUrlFor(metodo: MetodoEnvio | null, tracking: string): string | null {
  const n = tracking.trim();
  if (!n) return null;
  // Mismo link que usa el seguimiento minorista (app/seguimiento) y el admin.
  if (metodo === 'andreani_domicilio' || metodo === 'andreani_sucursal') return `https://www.andreani.com/envio/${encodeURIComponent(n)}`;
  return null;
}

export function pedidoLinesFrom(order: any): PedidoLine[] {
  return ((order?.line_items as any[]) ?? []).map((li) => {
    const quantity = Number(li.quantity) || 0;
    const lineTotal = Number(li.total) || 0;
    return {
      productId: Number(li.product_id) || 0,
      variationId: Number(li.variation_id) || 0,
      name: String(li.name ?? ''),
      size: lineAttr(li.meta_data, SIZE_KEYS),
      color: lineAttr(li.meta_data, COLOR_KEYS),
      quantity,
      unitPrice: quantity > 0 ? Math.round(lineTotal / quantity) : 0,
      lineTotal,
    };
  });
}

export function pedidoViewFrom(order: any): PedidoView {
  const lines = pedidoLinesFrom(order);
  const envio = envioDeOrden((k) => orderMeta(order, k));
  const tracking = orderMeta(order, '_tracking_number');
  const creditUsed = Number(orderMeta(order, '_mayorista_credito_aplicado')) || 0;
  return {
    id: Number(order.id),
    number: String(order.number ?? order.id),
    date: String(order.date_created ?? ''),
    status: String(order.status ?? ''),
    total: parseFloat(order.total) || 0,
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    creditUsed,
    campaignName: orderMeta(order, '_wholesale_campaign_name'),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    items: lines.map(l => l.name),
    lines,
    envio,
    tracking,
    trackingUrl: trackingUrlFor(envio.metodo, tracking),
    mayorista: orderMeta(order, '_es_mayorista') === 'true',
  };
}

export interface ReorderPlan {
  items: MayoristaCartItem[];
  /** Líneas que no se pudieron volver a pedir y por qué. */
  skipped: { name: string; size: string; reason: 'no-catalog' | 'no-size' | 'out' }[];
}

/**
 * Qué se puede volver a pedir hoy de una orden vieja: el producto tiene que
 * estar en el catálogo, con ese talle (y color) y con stock. El precio es el
 * de hoy, no el de la orden; la cantidad se recorta a lo que hay.
 */
export function reorderPlan(lines: PedidoLine[], catalog: MayoristaProduct[]): ReorderPlan {
  const byId = new Map(catalog.map(p => [p.productId, p]));
  const plan: ReorderPlan = { items: [], skipped: [] };
  for (const l of lines) {
    const p = byId.get(l.productId);
    if (!p) { plan.skipped.push({ name: l.name, size: l.size, reason: 'no-catalog' }); continue; }
    const size = p.sizes.find(s => s.toLowerCase() === l.size.toLowerCase()) ?? (p.sizes.length === 1 ? p.sizes[0] : null);
    if (!size) { plan.skipped.push({ name: l.name, size: l.size, reason: 'no-size' }); continue; }
    const color = p.colors.find(c => c.toLowerCase() === l.color.toLowerCase()) ?? (p.colors.length === 1 ? p.colors[0] : undefined);
    const level = p.colorAxis ? p.stock[stockKey(p, size, color)] : sizeLevel(p, size);
    // Agotado, sin stock confirmado o "próximamente": no se vuelve a pedir.
    if (!canOrder(p, level)) { plan.skipped.push({ name: l.name, size, reason: 'out' }); continue; }
    const available = p.stockQty[stockKey(p, size, color)];
    const quantity = typeof available === 'number' && available > 0 ? Math.min(l.quantity, available) : l.quantity;
    plan.items.push({ slug: p.slug, name: p.name, price: p.promo?.price ?? p.wholesalePrice, image: p.image, size, ...(color ? { color } : {}), quantity: Math.max(1, quantity) });
  }
  return plan;
}

export const SKIP_REASON_LABEL: Record<ReorderPlan['skipped'][number]['reason'], string> = {
  'no-catalog': 'ya no está en el catálogo',
  'no-size': 'ya no viene en ese talle',
  out: 'está sin stock',
};
