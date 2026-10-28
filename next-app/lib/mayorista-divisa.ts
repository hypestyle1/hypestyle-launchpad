/**
 * Divisa en la que el portal mayorista MUESTRA los precios.
 *
 * El catálogo vive en pesos: Woo guarda los precios en ARS, el pedido se crea
 * en ARS y la factura sale en ARS. Esto es solo la vitrina, para que un local
 * de afuera (Chile, el primero) entienda lo que está mirando sin hacer la
 * cuenta a mano. Donde se muestra un precio convertido va la nota de
 * `notaDivisa`: la cotización del día y en qué moneda se factura.
 *
 * La cotización es la misma de lib/fx.ts — dólar oficial (venta) de
 * dolarapi — con la que el sitio publica sus precios de afuera y con la que
 * cobra PayPal. Una sola fuente para que lo publicado y lo cobrado no se
 * separen (ver el comentario largo de lib/fx.ts).
 *
 * El formato se escribe acá y no con Intl porque el server y el cliente tienen
 * que pintar exactamente el mismo texto o React marca error de hidratación.
 */

import type { FxRates } from '@/lib/fx';

export type MayoristaDivisa = 'ARS' | 'USD' | 'CLP';

interface DivisaInfo {
  code: MayoristaDivisa;
  /** Nombre largo, para la nota de cotización. */
  label: string;
  symbol: string;
  decimals: 0 | 2;
  thousands: '.' | ',';
  decimal: '.' | ',';
}

/** El orden es el del selector. */
export const DIVISAS: DivisaInfo[] = [
  { code: 'ARS', label: 'pesos argentinos', symbol: '$',    decimals: 0, thousands: '.', decimal: ',' },
  { code: 'USD', label: 'dólares',          symbol: 'US$',  decimals: 2, thousands: ',', decimal: '.' },
  { code: 'CLP', label: 'pesos chilenos',   symbol: 'CLP$', decimals: 0, thousands: '.', decimal: ',' },
];

const BY_CODE = Object.fromEntries(DIVISAS.map(d => [d.code, d])) as Record<MayoristaDivisa, DivisaInfo>;

/** Normaliza 'usd' → 'USD'; null si no es una divisa del portal. Lo que llega de localStorage o de ?divisa= pasa por acá. */
export function parseDivisa(value: unknown): MayoristaDivisa | null {
  if (typeof value !== 'string') return null;
  const up = value.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(BY_CODE, up) ? (up as MayoristaDivisa) : null;
}

export function divisaInfo(code: MayoristaDivisa): DivisaInfo {
  return BY_CODE[code];
}

function agrupar(n: number, decimals: 0 | 2, thousands: string, decimal: string): string {
  const [entero, fraccion] = Math.abs(n).toFixed(decimals).split('.');
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${n < 0 ? '-' : ''}${miles}${fraccion ? decimal + fraccion : ''}`;
}

/**
 * Un precio del catálogo (siempre en pesos) escrito en la divisa elegida.
 * En ARS sale igual que `formatArs`: "$110.000", sin espacio ni centavos.
 */
export function formatDivisa(ars: number, divisa: MayoristaDivisa, rates: FxRates): string {
  const info = BY_CODE[divisa];
  if (divisa === 'ARS') return info.symbol + agrupar(Math.round(ars), 0, info.thousands, info.decimal);
  const cotizacion = rates[divisa];
  // Una cotización rota (0, negativa, NaN) daría Infinity en toda la vitrina:
  // antes que mostrar un precio inventado, se muestra el de pesos.
  if (!Number.isFinite(cotizacion) || cotizacion <= 0) return formatDivisa(ars, 'ARS', rates);
  return `${info.symbol} ${agrupar(ars / cotizacion, info.decimals, info.thousands, info.decimal)}`;
}

/**
 * Nota al pie de cualquier precio convertido. Dice la cotización usada y que
 * se factura en pesos: el mayorista de afuera tiene que poder reconstruir el
 * número, y nadie puede creer que el precio en dólares está congelado.
 *
 * La equivalencia se escribe en el sentido que se lee bien ("US$ 1 = $1.535"),
 * pero el peso chileno vale menos que el argentino, así que ahí se da vuelta
 * ("$1.000 = CLP$ 634") en vez de redondear 1,58 a $2.
 */
export function notaDivisa(divisa: MayoristaDivisa, rates: FxRates): string | null {
  if (divisa === 'ARS') return null;
  const info = BY_CODE[divisa];
  const cotizacion = rates[divisa];
  if (!Number.isFinite(cotizacion) || cotizacion <= 0) return null;
  const equivalencia = cotizacion >= 10
    ? `${info.symbol} 1 = ${formatDivisa(cotizacion, 'ARS', rates)}`
    : `${formatDivisa(1000, 'ARS', rates)} = ${formatDivisa(1000, divisa, rates)}`;
  return `Precios de referencia en ${info.label} al cambio de hoy (${equivalencia}). El pedido se factura en pesos argentinos.`;
}
