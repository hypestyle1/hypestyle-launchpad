/**
 * Monedas en las que el sitio MUESTRA precios, y cómo se escribe cada una.
 *
 * Vive acá y no en LocaleContext porque el contexto tiene JSX y vitest corre
 * solo sobre lib/: el formato de un precio es justo lo que conviene testear.
 *
 * Mostrar no es cobrar. El sitio cobra en dos monedas nada más: pesos
 * argentinos si el envío es a Argentina y dólares (PayPal o wire) si es afuera
 * — ver `chargeCurrency`. Todo lo demás es una referencia para que alguien de
 * Brasil o de Chile entienda el precio sin hacer la cuenta, y el checkout lo
 * aclara cuando la moneda elegida no es la del cobro.
 *
 * Sumar una moneda = agregarla al tipo y a CURRENCIES, darle cotización y
 * respaldo en lib/fx.ts, y poner su nombre (`label`) en lib/i18n.ts con las
 * cinco columnas.
 */

export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'GBP' | 'MXN' | 'CLP' | 'UYU';

export interface CurrencyInfo {
  code: Currency;
  /** Cuatro monedas de la lista usan "$": cada una lleva su prefijo para que no se confundan. */
  symbol: string;
  /** Nombre en español; es la clave de lib/i18n.ts. */
  label: string;
  /** El peso chileno no tiene centavos. El argentino sí, pero el sitio nunca los mostró. */
  decimals: 0 | 2;
  thousands: '.' | ',';
  decimal: '.' | ',';
}

/** El orden es el del selector. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'ARS', symbol: '$',    label: 'Pesos argentinos',   decimals: 0, thousands: '.', decimal: ',' },
  { code: 'USD', symbol: 'US$',  label: 'Dólares',            decimals: 2, thousands: ',', decimal: '.' },
  { code: 'EUR', symbol: '€',    label: 'Euros',              decimals: 2, thousands: ',', decimal: '.' },
  { code: 'BRL', symbol: 'R$',   label: 'Reales brasileños',  decimals: 2, thousands: '.', decimal: ',' },
  { code: 'GBP', symbol: '£',    label: 'Libras esterlinas',  decimals: 2, thousands: ',', decimal: '.' },
  { code: 'MXN', symbol: 'MX$',  label: 'Pesos mexicanos',    decimals: 2, thousands: ',', decimal: '.' },
  { code: 'CLP', symbol: 'CLP$', label: 'Pesos chilenos',     decimals: 0, thousands: '.', decimal: ',' },
  { code: 'UYU', symbol: '$U',   label: 'Pesos uruguayos',    decimals: 2, thousands: '.', decimal: ',' },
];

const BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c])) as Record<Currency, CurrencyInfo>;

/** Para validar lo que viene de localStorage: una moneda que ya no existe no debe llegar a formatPrice. */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BY_CODE, value);
}

export function currencyInfo(code: Currency): CurrencyInfo {
  return BY_CODE[code];
}

/** Pesos argentinos por unidad de cada moneda extranjera. */
export type RatesLike = Record<Exclude<Currency, 'ARS'>, number>;

/**
 * Formato determinístico, sin Intl: el server y el navegador tienen que
 * escribir exactamente lo mismo o React marca error de hidratación.
 */
export function formatMoney(arsAmount: number, currency: Currency, rates: RatesLike): string {
  const info = BY_CODE[currency];
  const value = currency === 'ARS' ? arsAmount : arsAmount / rates[currency];
  const [entero, fraccion] = Math.abs(value).toFixed(info.decimals).split('.');
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, info.thousands);
  const signo = value < 0 ? '-' : '';
  return `${info.symbol} ${signo}${miles}${fraccion ? info.decimal + fraccion : ''}`;
}

/**
 * En qué moneda se cobra de verdad un pedido.
 * Argentina paga en pesos (MercadoPago, GOcuotas, transferencia); el resto del
 * mundo paga en dólares (PayPal y wire cotizan en USD, ver /api/paypal-order).
 * PayPal cobra en dólares siempre, también con envío a Argentina.
 */
export function chargeCurrency(shippingCountry: string, paymentMethod?: string): 'ARS' | 'USD' {
  if (paymentMethod === 'paypal') return 'USD';
  return shippingCountry === 'AR' ? 'ARS' : 'USD';
}
