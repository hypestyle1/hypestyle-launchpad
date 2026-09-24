// Saldo a favor de un mayorista: nota de crédito que se descuenta sola del
// próximo pedido. Nace para compensar una prenda con falla cuando no hay otra
// igual para reponer — el cliente compró para revender, así que lo que le
// sirve es el valor de esa unidad, no un porcentaje.
//
// Vive en el customer de Woo como un JSON en una sola meta (sin guión bajo:
// WC descarta en silencio las "protegidas" al actualizar un customer por REST).
// El saldo se guarda junto con los movimientos para poder explicar de dónde
// sale cada peso.

export const CREDIT_META = 'mayorista_credito';

export interface CreditMovement {
  fecha: string;   // ISO
  monto: number;   // positivo = carga, negativo = uso
  motivo: string;
  orden?: string;  // pedido que lo originó o donde se usó
}

export interface CreditState {
  saldo: number;
  movimientos: CreditMovement[];
}

const EMPTY: CreditState = { saldo: 0, movimientos: [] };

const round = (n: number) => Math.round(n * 100) / 100;

/** Lee la meta del customer. Tolera que WP la devuelva como string o ya parseada. */
export function parseCredit(meta: { key: string; value: unknown }[] | undefined): CreditState {
  const raw = meta?.find((m) => m.key === CREDIT_META)?.value;
  if (!raw) return { ...EMPTY, movimientos: [] };
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const saldo = Number((data as any)?.saldo);
    const movimientos = Array.isArray((data as any)?.movimientos) ? (data as any).movimientos : [];
    return { saldo: Number.isFinite(saldo) && saldo > 0 ? round(saldo) : 0, movimientos };
  } catch {
    return { ...EMPTY, movimientos: [] };
  }
}

/** Cuánto del saldo se aplica a un pedido: nunca más que el pedido ni que el saldo. */
export function creditToApply(saldo: number, total: number): number {
  if (!(saldo > 0) || !(total > 0)) return 0;
  return round(Math.min(saldo, total));
}

/** Suma un movimiento. El saldo no baja de cero. */
export function addMovement(state: CreditState, mov: CreditMovement): CreditState {
  return {
    saldo: Math.max(0, round(state.saldo + mov.monto)),
    movimientos: [...state.movimientos, { ...mov, monto: round(mov.monto) }],
  };
}

export function creditMetaEntry(state: CreditState) {
  return { key: CREDIT_META, value: JSON.stringify(state) };
}
