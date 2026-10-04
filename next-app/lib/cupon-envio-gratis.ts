const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

/**
 * Flag "envío gratis" de un cupón, leído de Woo. El validate-coupon del PHP
 * solo devuelve %/monto fijo. Lo usan /api/validate-coupon (lo que ve el
 * checkout) y la creación del pedido (lo que se cobra).
 */
export async function cuponConEnvioGratis(code: string | null | undefined): Promise<boolean> {
  if (!WC_KEY || !WC_SEC || !code) return false;
  try {
    const r = await fetch(`${WP_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64') },
      cache: 'no-store',
    });
    const arr = await r.json();
    const c = Array.isArray(arr) ? arr[0] : null;
    return !!c?.free_shipping;
  } catch { return false; }
}
