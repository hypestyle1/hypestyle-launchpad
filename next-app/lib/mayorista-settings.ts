// Mínimo de pedido mayorista: general (WP option, editable en /admin/mayoristas
// vía PHP mayorista-settings) con override opcional por cliente (meta
// 'mayorista_min_order' del customer de WooCommerce, sin guión bajo — mismo
// motivo que 'es_mayorista': WC descarta los meta protegidos al crear/leer
// customers por REST) y mínimo propio por campaña (lib/wholesale-campaigns.ts).
//
// Política del 13/10/2026: el mínimo vigente vive SOLO en WordPress. Si no se
// puede leer, no se inventa uno: el portal avisa y pide reintentar, y el
// pedido no se crea (antes caía en silencio a $500.000, y el cliente podía ver
// un monto en pantalla y el servidor validar otro).

import { MIN_ORDER_UNAVAILABLE_MESSAGE } from './mayorista-copy';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export { MIN_ORDER_UNAVAILABLE_MESSAGE };

/** WordPress no respondió o devolvió un mínimo inválido. */
export class MinOrderUnavailableError extends Error {
  constructor(detail: string) {
    super(`No se pudo leer el pedido mínimo de WordPress: ${detail}`);
    this.name = 'MinOrderUnavailableError';
  }
}

export async function getGlobalMinOrder(): Promise<number> {
  let res: Response;
  try {
    // _cb: la CDN de Hostinger cachea los GET por URL exacta (igual que las
    // campañas); sin esto un cambio desde el admin podía tardar en verse.
    res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/mayorista-settings?_cb=${Date.now()}`, {
      headers: { Authorization: `Bearer ${WP_SECRET}` },
      cache: 'no-store',
    });
  } catch (err) {
    throw new MinOrderUnavailableError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) throw new MinOrderUnavailableError(`WP ${res.status}`);
  const data = await res.json().catch(() => null);
  const minOrder = Number(data?.minOrder);
  // 0 o vacío no es "sin mínimo": hoy no existe esa política, así que se
  // trata como configuración rota, igual que un error de red.
  if (!Number.isFinite(minOrder) || minOrder <= 0) throw new MinOrderUnavailableError(`valor inválido (${JSON.stringify(data?.minOrder)})`);
  return minOrder;
}

export async function setGlobalMinOrder(minOrder: number): Promise<boolean> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/mayorista-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` },
    body: JSON.stringify({ minOrder }),
  });
  return res.ok;
}

export function customerMinOrderOverride(customerMeta: { key: string; value: string }[] | undefined): number | null {
  const raw = customerMeta?.find(m => m.key === 'mayorista_min_order')?.value?.trim();
  // Ojo: Number('') es 0 (no NaN) — sin el chequeo de string vacío, borrar el
  // override (guardarlo como '') se leería como "mínimo = $0" en vez de "sin override".
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Mínimo que rige para un pedido: el override del cliente manda; si no, el
 * mínimo propio de la campaña aplicada; si no, el general. Es la única regla,
 * la usan el perfil, la disponibilidad y el pedido para que la barra, el
 * carrito y la validación digan lo mismo.
 */
export function effectiveMinOrder(parts: { override: number | null; campaignMin: number | null; global: number | null }): number | null {
  return parts.override ?? parts.campaignMin ?? parts.global;
}

/**
 * Mínimo efectivo leyendo el general de WordPress solo si hace falta (si hay
 * override o mínimo de campaña, no se consulta). Devuelve null cuando el
 * general era necesario y no se pudo leer: el que llama decide si avisa
 * (perfil, disponibilidad) o frena (pedido).
 */
export async function resolveMinOrder(parts: { override: number | null; campaignMin?: number | null }): Promise<number | null> {
  const local = effectiveMinOrder({ override: parts.override, campaignMin: parts.campaignMin ?? null, global: null });
  if (local != null) return local;
  try {
    return await getGlobalMinOrder();
  } catch (err) {
    console.error('[mayorista-settings]', err instanceof Error ? err.message : err);
    return null;
  }
}
