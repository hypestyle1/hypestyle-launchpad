/**
 * Medición solo desde el sitio real.
 *
 * El pixel de Meta, GA4 y Clarity tienen el ID de producción como default, así
 * que cualquier copia del sitio —`next dev`, el `next start` que levanta
 * Playwright en 127.0.0.1:3100, un preview de Vercel— le mandaba eventos al
 * mismo pixel con el que optimizan las campañas. Audit del 17/09/2026: del 01 al
 * 17/09 el pixel recibió 1.203 eventos desde host `127.0.0.1`/`localhost`, y en
 * cada hora con ese tráfico el InitiateCheckout subía la mitad de esa
 * cifra — 1 PageView + 1 InitiateCheckout por test de tests/e2e/checkout.spec.ts.
 * Unos 585 de los 992 InitiateCheckout del período eran de tests; los días sin
 * corridas locales el evento quedaba en 12-34, por debajo de AddToCart.
 *
 * El gate es por hostname y no por NODE_ENV: los e2e corren contra un build de
 * producción (`next start`), así que NODE_ENV ahí también es "production".
 */

const PRODUCTION_HOSTS = new Set(['hypestyle.com.ar', 'www.hypestyle.com.ar']);

export function isProductionHost(hostname: string | null | undefined): boolean {
  return PRODUCTION_HOSTS.has((hostname ?? '').trim().toLowerCase());
}

/** Igual que `isProductionHost`, a partir de una URL completa (event_source_url). */
export function isProductionUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return isProductionHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Lado navegador. En el server devuelve false: ahí no hay host que mirar. */
export function isTrackableHost(): boolean {
  if (typeof window === 'undefined') return false;
  return isProductionHost(window.location.hostname);
}
