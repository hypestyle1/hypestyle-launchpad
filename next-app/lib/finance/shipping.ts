import type { DataSource } from './types';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ShippingResult {
  /** Lo que pagó el cliente (WC shipping_total). Exacto. */
  charged: number;
  /** Costo real del envío (config flatRealCost, o snapshot futuro), o null si falta. */
  realCost: number | null;
  /** realCost − charged. Positivo = Hype absorbe; negativo = Hype gana. null si falta el real. */
  difference: number | null;
  /** Lo que Hype absorbe (difference si es positivo; 0 si el cliente cubrió de más). */
  absorbed: number;
  chargedSource: DataSource;
  realSource: DataSource;
}

/**
 * Envío de un pedido. `charged` siempre exacto (Woo). `realCost` viene de la
 * config (flatRealCost) hasta integrar Andreani; si no está, queda 'missing' y
 * NO se asume cero. No se hace clamp de la diferencia (puede ser negativa).
 */
export function computeShipping(chargedTotal: number, flatRealCost: number | null): ShippingResult {
  const charged = round2(chargedTotal || 0);
  if (flatRealCost === null || flatRealCost === undefined) {
    return { charged, realCost: null, difference: null, absorbed: 0, chargedSource: 'exact', realSource: 'missing' };
  }
  const realCost = round2(flatRealCost);
  const difference = round2(realCost - charged);
  return {
    charged, realCost, difference,
    absorbed: Math.max(0, difference), // lo que Hype pone de más; la diferencia negativa se ve aparte
    chargedSource: 'exact',
    realSource: 'configured',
  };
}
