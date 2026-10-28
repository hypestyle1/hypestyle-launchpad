/**
 * Lee en el servidor si la sesión que está mirando el portal es una cuenta en
 * consignación, para que el catálogo se pinte bien en el PRIMER render.
 *
 * Sin esto el acuerdo llegaba recién con /api/mayorista/perfil, en el cliente:
 * la grilla salía un instante con el precio mayorista (50% del PVP) y después
 * saltaba al de lista. Sobre una remera de $45.900 eso es ver $22.950 y que el
 * número se duplique solo — justo lo que no puede pasar con plata a la vista.
 *
 * El provider sigue refrescando con el perfil; esto solo da el valor inicial.
 */

import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { parseConsignacion, type Consignacion } from '@/lib/mayorista-consignacion';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

/**
 * `cookies()` de Next, pasado por quien llama (el layout) para que este módulo
 * no dependa de headers y se pueda testear.
 * Devuelve null si no hay sesión, si Woo no responde o si la cuenta compra
 * normal: en todos esos casos el portal muestra lo de siempre.
 */
export async function consignacionDeSesion(token: string | undefined): Promise<Consignacion | null> {
  const customerId = await verifySessionToken(token);
  if (!customerId) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}?_fields=meta_data`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64') },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parseConsignacion((await res.json())?.meta_data);
  } catch (err) {
    console.error('[mayorista-consignacion-server]', err instanceof Error ? err.message : err);
    return null;
  }
}

export { MAYORISTA_COOKIE };
