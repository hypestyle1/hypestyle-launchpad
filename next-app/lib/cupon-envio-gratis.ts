const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

/** Meta del cupón en Woo que acota el envío gratis a retiro en sucursal. */
export const META_ALCANCE_ENVIO = '_hs_envio_alcance';

export interface EnvioDeCupon {
  /** El cupón tiene "Permitir envío gratis" tildado en Woo. */
  gratis: boolean;
  /** …y además lleva `_hs_envio_alcance = sucursal`: el domicilio paga. */
  soloSucursal: boolean;
}

const SIN_ENVIO: EnvioDeCupon = { gratis: false, soloSucursal: false };

/** Lee el alcance de la respuesta de WC REST (exportada para los tests). */
export function envioDesdeCupon(c: unknown): EnvioDeCupon {
  const cupon = c as { free_shipping?: boolean; meta_data?: { key?: string; value?: unknown }[] } | null;
  if (!cupon?.free_shipping) return SIN_ENVIO;
  const alcance = (cupon.meta_data ?? []).find((m) => m?.key === META_ALCANCE_ENVIO)?.value;
  return { gratis: true, soloSucursal: String(alcance ?? '').trim().toLowerCase() === 'sucursal' };
}

/**
 * Envío gratis de un cupón, leído de Woo. El validate-coupon del PHP solo
 * devuelve %/monto fijo. Lo usan /api/validate-coupon (lo que ve el checkout)
 * y la creación del pedido (lo que se cobra).
 *
 * El alcance sale de la MISMA consulta (`meta_data` viene en la respuesta):
 * acotar un cupón a sucursal no suma llamadas a WP. Si la consulta falla, el
 * cupón no regala envío en ningún modo (fail-closed). El `_` evita que
 * LiteSpeed sirva una lista cacheada de antes de crear el cupón.
 */
export async function envioDeCupon(code: string | null | undefined): Promise<EnvioDeCupon> {
  if (!WC_KEY || !WC_SEC || !code) return SIN_ENVIO;
  try {
    const r = await fetch(`${WP_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}&_=${Date.now()}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64') },
      cache: 'no-store',
    });
    const arr = await r.json();
    return envioDesdeCupon(Array.isArray(arr) ? arr[0] : null);
  } catch { return SIN_ENVIO; }
}

/**
 * Los códigos de Woo no llevan tildes: "PERDÓN" tipeado con tilde daba
 * "Código inválido". Se sacan los diacríticos y los espacios de los bordes.
 */
export function normalizarCodigoCupon(code: unknown): string {
  return String(code ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Compatibilidad: ¿el cupón da envío gratis en algún modo? */
export async function cuponConEnvioGratis(code: string | null | undefined): Promise<boolean> {
  return (await envioDeCupon(code)).gratis;
}
