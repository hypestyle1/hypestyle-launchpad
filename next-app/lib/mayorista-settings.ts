// Mínimo de pedido mayorista: general (WP option, editable en /admin/mayoristas
// vía PHP mayorista-settings) con override opcional por cliente (meta
// 'mayorista_min_order' del customer de WooCommerce, sin guión bajo — mismo
// motivo que 'es_mayorista': WC descarta los meta protegidos al crear/leer
// customers por REST).

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function getGlobalMinOrder(): Promise<number> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/mayorista-settings`, {
      headers: { Authorization: `Bearer ${WP_SECRET}` },
      cache: 'no-store',
    });
    if (!res.ok) return 500000;
    const data = await res.json();
    return Number(data.minOrder) || 500000;
  } catch {
    return 500000;
  }
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
  const found = customerMeta?.find(m => m.key === 'mayorista_min_order');
  const n = found ? Number(found.value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}
