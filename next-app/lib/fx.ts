/**
 * Cotización de las monedas en las que el sitio muestra precios.
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
 * Dos fuentes:
 * - dolarapi.com da dólar, euro, real, peso chileno y peso uruguayo contra el
 *   peso argentino.
 * - La libra y el peso mexicano no están en dolarapi. Salen de frankfurter.dev
 *   (tipos de referencia del Banco Central Europeo, gratis y sin clave) como
 *   cruce contra el dólar: pesos por libra = pesos por dólar / libras por dólar.
 *   El dólar del cruce es el mismo oficial de arriba, así que todas las monedas
 *   quedan paradas sobre la misma cotización.
 *
 * Solo el dólar se COBRA (PayPal y wire). El resto es precio de referencia: ver
 * `chargeCurrency` en lib/currency.ts.
 *
 * Los valores de respaldo son la cotización del 18/09/2026. Solo entran en
 * juego si la fuente está caída; conviene refrescarlos cada tanto para que un
 * corte no devuelva el sitio a precios viejos.
 *
 * También son lo que se pinta en el PRIMER render del cliente, antes de que
 * llegue /api/fx-rate: si quedan viejos, el precio en euros o dólares cambia
 * a la vista apenas carga la página (se vio el 05/09: € 36,99 → € 36,50).
 */

import type { RatesLike } from '@/lib/currency';

/** Pesos argentinos por unidad de cada moneda. */
export type FxRates = RatesLike;

export const FX_FALLBACK: FxRates = {
  USD: 1535,
  EUR: 1741,
  BRL: 294.4,
  GBP: 2048,
  MXN: 89.4,
  CLP: 1.578,
  UYU: 37.65,
};

/** Una hora: el oficial se mueve por escalones, no tick a tick. */
export const FX_REVALIDATE_SECONDS = 3600;

const DOLARAPI_USD = 'https://dolarapi.com/v1/dolares/oficial';
const dolarapi = (moneda: string) => `https://dolarapi.com/v1/cotizaciones/${moneda}`;
const CROSS_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP,MXN';

/** Monedas que se cotizan por cruce contra el dólar. */
const CROSS = ['GBP', 'MXN'] as const;

// Una cotización de 0, negativa o no numérica rompería el precio de todo el
// sitio (division by zero → Infinity), así que se descarta como si no hubiera
// respuesta.
const usable = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

async function fetchOne(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(url, { next: { revalidate: FX_REVALIDATE_SECONDS } });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { venta?: number };
    return usable(data.venta) ? data.venta : fallback;
  } catch {
    return fallback;
  }
}

/** Unidades de cada moneda por dólar (GBP ≈ 0,75; MXN ≈ 17), o {} si la fuente falla. */
async function fetchCross(): Promise<Partial<Record<(typeof CROSS)[number], number>>> {
  try {
    const res = await fetch(CROSS_URL, { next: { revalidate: FX_REVALIDATE_SECONDS } });
    if (!res.ok) return {};
    const data = (await res.json()) as { rates?: Record<string, unknown> };
    const out: Partial<Record<(typeof CROSS)[number], number>> = {};
    for (const code of CROSS) {
      const perUsd = data.rates?.[code];
      if (usable(perUsd)) out[code] = perUsd;
    }
    return out;
  } catch {
    return {};
  }
}

/** Cotizaciones vigentes. Cada moneda cae a su respaldo por separado si su fuente no responde. */
export async function fetchFxRates(): Promise<FxRates> {
  const [USD, EUR, BRL, CLP, UYU, cross] = await Promise.all([
    fetchOne(DOLARAPI_USD, FX_FALLBACK.USD),
    fetchOne(dolarapi('eur'), FX_FALLBACK.EUR),
    fetchOne(dolarapi('brl'), FX_FALLBACK.BRL),
    fetchOne(dolarapi('clp'), FX_FALLBACK.CLP),
    fetchOne(dolarapi('uyu'), FX_FALLBACK.UYU),
    fetchCross(),
  ]);
  return {
    USD,
    EUR,
    BRL,
    CLP,
    UYU,
    GBP: cross.GBP ? USD / cross.GBP : FX_FALLBACK.GBP,
    MXN: cross.MXN ? USD / cross.MXN : FX_FALLBACK.MXN,
  };
}

/**
 * Completa con el respaldo lo que falte o venga roto en una respuesta de
 * /api/fx-rate. Lo usa el cliente: durante un deploy puede llegarle todavía la
 * respuesta cacheada de la versión anterior, que solo traía USD y EUR, y una
 * moneda sin cotización daría NaN en toda la vitrina.
 */
export function mergeRates(data: unknown, base: FxRates = FX_FALLBACK): FxRates {
  const out = { ...base };
  if (data && typeof data === 'object') {
    for (const code of Object.keys(out) as (keyof FxRates)[]) {
      const v = (data as Record<string, unknown>)[code];
      if (usable(v)) out[code] = v;
    }
  }
  return out;
}

/** Atajo para los gateways de pago, que solo cobran en dólares. */
export async function getUsdRate(): Promise<number> {
  return fetchOne(DOLARAPI_USD, FX_FALLBACK.USD);
}
