export const PROMO_3X2_START = new Date('2026-07-05T00:00:00-03:00');
export const PROMO_3X2_END   = new Date('2026-07-07T23:59:59-03:00');
export const PROMO_3X2_MIN_UNITS = 3;

export function isPromo3x2Active(): boolean {
  const now = Date.now();
  return now >= PROMO_3X2_START.getTime() && now < PROMO_3X2_END.getTime();
}

export interface Promo3x2Line {
  price: number;
  quantity: number;
}

/** Todas las unidades del carrito (no las líneas), de mayor a menor precio. */
function unitPricesDesc(lines: Promo3x2Line[]): number[] {
  const units: number[] = [];
  for (const l of lines) for (let i = 0; i < l.quantity; i++) units.push(l.price);
  return units.sort((a, b) => b - a);
}

/**
 * Por cada 3 unidades, 1 es gratis — y esa gratis siempre es la MÁS BARATA de
 * todo el carrito (no la más barata de un sub-grupo). Con N unidades, regala
 * las floor(N/3) más baratas en total.
 */
export function compute3x2Discount(lines: Promo3x2Line[]): number {
  const units = unitPricesDesc(lines);
  const freeCount = Math.floor(units.length / PROMO_3X2_MIN_UNITS);
  if (freeCount === 0) return 0;
  const cheapest = units.slice(-freeCount);
  return Math.round(cheapest.reduce((sum, p) => sum + p, 0));
}

export function count3x2FreeUnits(lines: Promo3x2Line[]): number {
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);
  return Math.floor(totalUnits / PROMO_3X2_MIN_UNITS);
}

/** Cuántas unidades más hay que agregar para destrabar el próximo "gratis". */
export function unitsToNext3x2(lines: Promo3x2Line[]): number {
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);
  const rem = totalUnits % PROMO_3X2_MIN_UNITS;
  return rem === 0 ? PROMO_3X2_MIN_UNITS : PROMO_3X2_MIN_UNITS - rem;
}
