// Idempotencia del pedido mayorista.
//
// El freno por "pedido reciente" (lib/mayorista-recent-order.ts) cubre el
// reintento humano: error en pantalla, recargar, confirmar de nuevo. No cubre
// dos envíos casi simultáneos del mismo carrito (doble click antes de que el
// botón se deshabilite, dos pestañas, el navegador que reintenta un POST
// cortado): los dos leen "no hay pedido reciente" y los dos crean una orden.
//
// El carrito manda una clave por carrito (`idempotencyKey`, se regenera cuando
// cambian los productos o cantidades y se repite en los reintentos). La orden
// la guarda en la meta `_mayorista_idempotency_key`. En el servidor:
//   1. antes de crear: si ya hay una orden viva del cliente con esa clave, se
//      devuelve esa (replay) en vez de crear otra;
//   2. después de crear: se vuelve a leer; si quedaron dos vivas con la misma
//      clave, la más nueva se cancela sola (Woo repone el stock) y se devuelve
//      la más vieja. Así la ventana entre 1 y la creación no deja dos órdenes.
// No hace falta ningún lock externo: alcanza con Woo REST.

export const IDEMPOTENCY_META = '_mayorista_idempotency_key';

const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Clave usable: la genera el navegador (UUID o similar). Lo demás se ignora. */
export function isValidIdempotencyKey(key: unknown): key is string {
  return typeof key === 'string' && KEY_RE.test(key);
}

const LIVE_STATUSES = new Set(['pending', 'on-hold', 'processing', 'completed']);

function metaValue(order: any, key: string): string | null {
  const m = (order?.meta_data as any[] | undefined)?.find(x => x?.key === key);
  return m == null ? null : String(m.value ?? '');
}

/** Órdenes vivas con esta clave, de la más vieja a la más nueva (por id). */
export function ordersWithKey(orders: any[], key: string): any[] {
  return (orders ?? [])
    .filter(o => LIVE_STATUSES.has(o?.status) && metaValue(o, IDEMPOTENCY_META) === key)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

export interface ReplayedOrder {
  id: number;
  number: string;
  /** Total bruto (antes del saldo a favor), como lo devuelve el pedido nuevo. */
  total: number;
  creditUsed: number;
}

/** Lo que responde el pedido cuando la orden ya existía con esta clave. */
export function replayOf(order: any): ReplayedOrder {
  const creditUsed = Number(metaValue(order, '_mayorista_credito_aplicado')) || 0;
  return {
    id: Number(order.id),
    number: String(order.number ?? order.id),
    total: (Number(order.total) || 0) + creditUsed,
    creditUsed,
  };
}

/**
 * Tras crear `createdId` con `key`: si otra orden viva con la misma clave es
 * más vieja, la nuestra sobra. Devuelve la que hay que conservar y, si es
 * otra, la que hay que cancelar.
 */
export function resolveDuplicate(orders: any[], key: string, createdId: number): { keep: any; cancel: any | null } | null {
  const same = ordersWithKey(orders, key);
  if (!same.length) return null;
  const oldest = same[0];
  if (Number(oldest.id) === createdId) return { keep: oldest, cancel: null };
  const ours = same.find(o => Number(o.id) === createdId) ?? null;
  return { keep: oldest, cancel: ours };
}

/** Clave nueva para el carrito (navegador). */
export function newIdempotencyKey(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}
