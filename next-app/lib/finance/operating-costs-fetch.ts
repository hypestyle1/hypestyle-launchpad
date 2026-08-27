// Fetch server-side de los Operating Costs desde la option WP `hs_operating_costs`.
// Si la option está vacía o la ruta PHP no existe todavía, cae a los DEFAULTS
// confirmados — así la página funciona antes/después del deploy PHP sin romper.
// Vive en lib (no en el route.ts) porque Next sólo deja exportar handlers HTTP
// desde los archivos de ruta.

import { DEFAULT_OPERATING_COSTS } from './operating-costs-defaults';
import type { OperatingCost } from './operating-costs';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';

export async function fetchOperatingCosts(): Promise<{ costs: OperatingCost[]; persisted: boolean }> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/operating-costs?_cb=${Date.now()}`, {
      headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const costs = Array.isArray(data.costs) ? data.costs : [];
      if (costs.length) return { costs, persisted: true };
    }
  } catch { /* cae a defaults */ }
  return { costs: DEFAULT_OPERATING_COSTS, persisted: false };
}
