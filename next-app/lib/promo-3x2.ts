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

/**
 * Ordena todas las unidades del carrito (no las líneas) de mayor a menor precio
 * y regala la 3ra de cada grupo completo de 3 — así el "gratis" siempre es
 * la más barata de cada trío, sin dejar tríos sueltos entre las unidades más caras.
 */
function unitPricesDesc(lines: Promo3x2Line[]): number[] {
  const units: number[] = [];
  for (const l of lines) for (let i = 0; i < l.quantity; i++) units.push(l.price);
  return units.sort((a, b) => b - a);
}

export function compute3x2Discount(lines: Promo3x2Line[]): number {
  const units = unitPricesDesc(lines);
  let discount = 0;
  for (let i = 2; i < units.length; i += 3) discount += units[i];
  return Math.round(discount);
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
