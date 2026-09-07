/**
 * Cotización oficial del dólar y del euro.
 *
 * Existe para que el precio que se le MUESTRA al comprador de afuera y el que
 * se le COBRA salgan del mismo lugar. Hasta acá eran dos fuentes distintas y
 * desalineadas: LocaleContext dividía por una constante hardcodeada de 1250 y
 * /api/paypal-order cotizaba en vivo. Sobre un producto de $100.000 el sitio
 * publicaba US$ 80,00 y PayPal cobraba US$ 65,79 — el precio de vitrina quedó
 * ~22% por encima del real, y la brecha se ensancha sola con cada devaluación.
 *
 * Se usa `venta` porque es lo que cuesta comprar un dólar, que es la operación
 * que hace el comprador de afuera.
 *
 * Los valores de respaldo son la cotización del 05/09/2026. Solo entran en
 * juego si dolarapi está caída; conviene refrescarlos cada tanto para que un
 * corte no devuelva el sitio a precios viejos.
 *
 * También son lo que se pinta en el PRIMER render del cliente, antes de que
 * llegue /api/fx-rate: si quedan viejos, el precio en euros o dólares cambia
 * a la vista apenas carga la página (se vio el 05/09: € 36,99 → € 36,50).
 */

export interface FxRates {
  /** Pesos por dólar. */
  USD: number;
  /** Pesos por euro. */
  EUR: number;
}

export const FX_FALLBACK: FxRates = { USD: 1530, EUR: 1753 };

/** Una hora: el oficial se mueve por escalones, no tick a tick. */
export const FX_REVALIDATE_SECONDS = 3600;

async function fetchOne(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(url, { next: { revalidate: FX_REVALIDATE_SECONDS } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { venta?: number };
    // Una cotización de 0 o negativa rompería el precio de todo el sitio
    // (division by zero → Infinity), así que se descarta como si no hubiera
    // respuesta.
    return typeof data.venta === 'number' && data.venta > 0 ? data.venta : fallback;
  } catch {
    return fallback;
  }
}

/** Cotizaciones vigentes, con respaldo si la API no responde. */
export async function fetchFxRates(): Promise<FxRates> {
  const [USD, EUR] = await Promise.all([
    fetchOne('https://dolarapi.com/v1/dolares/oficial', FX_FALLBACK.USD),
    fetchOne('https://dolarapi.com/v1/cotizaciones/eur', FX_FALLBACK.EUR),
  ]);
  return { USD, EUR };
}

/** Atajo para los gateways de pago, que solo cobran en dólares. */
export async function getUsdRate(): Promise<number> {
  return fetchOne('https://dolarapi.com/v1/dolares/oficial', FX_FALLBACK.USD);
}
