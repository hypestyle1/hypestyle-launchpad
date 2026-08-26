import { mergeFinanceConfig } from './config';
import type { FinanceConfig } from './types';

// Carga la config financiera desde la WP option hs_finance_config (vía la ruta
// hypestyle/v1/finance-config del mu-plugin). Si la ruta todavía no está
// desplegada o falla, cae a los defaults centralizados — el motor sigue andando.
// Cacheada en memoria (5 min) para no pegarle a WP en cada request de Finanzas.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').trim();

let cache: { at: number; cfg: FinanceConfig } | null = null;
const TTL = 5 * 60_000;

export async function loadFinanceConfig(force = false): Promise<FinanceConfig> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.cfg;
  let saved: Partial<FinanceConfig> | null = null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/finance-config?_cb=${Date.now()}`, {
      headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      saved = data && typeof data === 'object' ? (data.config ?? data) : null;
    }
  } catch { /* ruta no desplegada aún → defaults */ }
  const cfg = mergeFinanceConfig(saved);
  cache = { at: Date.now(), cfg };
  return cfg;
}

export async function saveFinanceConfig(cfg: FinanceConfig): Promise<boolean> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/finance-config`, {
      method: 'POST',
      headers: { 'X-Hypestyle-Secret': WP_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: cfg }),
    });
    if (res.ok) { cache = { at: Date.now(), cfg }; return true; }
    return false;
  } catch { return false; }
}
