/**
 * Cuentas en consignación.
 *
 * El modelo normal del portal es compra: el local paga el 50% del PVP y
 * revende al precio que quiera (lib/mayorista-pricing.ts). En consignación no
 * compra nada: recibe la mercadería, la exhibe, y cuando la vende se queda con
 * un porcentaje fijo del precio de lista y liquida el resto. Así se trabaja
 * con Bizarre (Chile) desde el 28/10/2026: ellos manejan 25% neto.
 *
 * Por eso una cuenta en consignación ve OTROS números: el precio de lista como
 * precio principal —es el que va a cobrar en su local— con su comisión y lo
 * que le queda a liquidar. El 50% mayorista no aplica y no se muestra, porque
 * ahí no hay compra.
 *
 * Es por cuenta, no global: se prende y se apaga desde /admin/mayoristas y
 * solo cambia lo que ve esa cuenta. Todas las demás siguen igual.
 *
 * Se guarda como JSON en un meta del customer de WooCommerce, sin guión bajo
 * (WC descarta los meta "protegidos" al escribir customers por REST).
 */

export const META_CONSIGNACION = 'mayorista_consignacion';

export interface Consignacion {
  /** Porcentaje del precio de lista que se queda el local. */
  pct: number;
  /** Desde cuándo rige (ISO corta). Informativo. */
  desde: string;
  /** Nota interna del acuerdo; la ve el admin, no el cliente. */
  nota?: string;
}

function pctValido(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 100;
}

/** Mensaje de error, o null si el porcentaje sirve. */
export function validarPct(n: unknown): string | null {
  return pctValido(n) ? null : 'La comisión tiene que ser un número entre 1 y 99';
}

export function parseConsignacion(meta: { key: string; value: unknown }[] | undefined): Consignacion | null {
  const raw = meta?.find(m => m.key === META_CONSIGNACION)?.value;
  if (!raw || typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw);
    const pct = Number(data?.pct);
    // Un porcentaje roto no se interpreta como "consignación al 0%": se trata
    // como cuenta normal, que es el modo seguro (cobra el mayorista de siempre).
    if (!pctValido(pct)) return null;
    return {
      pct,
      desde: String(data?.desde ?? ''),
      ...(data?.nota ? { nota: String(data.nota) } : {}),
    };
  } catch {
    return null;
  }
}

/** Entrada de meta para guardar (o borrar, con null) el acuerdo. */
export function consignacionMetaEntry(c: Consignacion | null): { key: string; value: string } {
  return { key: META_CONSIGNACION, value: c ? JSON.stringify(c) : '' };
}

export interface SplitConsignacion {
  /** Precio de lista (PVP): lo que cobra el local en el mostrador. */
  lista: number;
  /** Lo que se queda el local por esa venta. */
  comision: number;
  /** Lo que le liquida a Hype. */
  aLiquidar: number;
}

/**
 * Cómo se reparte una venta en consignación. Redondea la comisión y saca el
 * resto por diferencia, para que las dos partes sumen exactamente el precio de
 * lista y no quede un peso suelto en ningún lado.
 */
export function splitConsignacion(lista: number, pct: number): SplitConsignacion {
  const comision = Math.round(lista * (pct / 100));
  return { lista, comision, aLiquidar: lista - comision };
}
