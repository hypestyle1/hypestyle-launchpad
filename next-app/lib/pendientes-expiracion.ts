/**
 * Expiración de pedidos sin pagar (auditoría 17/10).
 *
 * Al 17/10 había 314 pending, 310 de más de 24 h, y ninguno se cancelaba
 * solo: el cron de Woo (`woocommerce_cancel_unpaid_orders`) solo toca
 * pedidos `created_via: checkout`, y los del checkout headless son
 * `rest-api`. La bandeja queda sucia y cualquier conteo crudo de "pedidos"
 * los incluye.
 *
 * Importante: un pending del checkout headless NO reserva ni descuenta
 * stock (Woo reduce recién en processing/on-hold/completed), así que
 * cancelarlo no libera nada ni puede romper inventario. Esto es higiene
 * operativa, no una medida de stock.
 *
 * El criterio es conservador: ante cualquier señal de pago en curso, el
 * pedido NO se toca. Las esperas por método están pensadas para que una
 * transferencia lenta nunca se cancele antes de tiempo.
 */

/** Horas de espera antes de considerar abandonado un pedido, por método. */
export const ESPERA_HORAS: Record<string, number> = {
  // Transferencia: puede acreditar días después (feriados, banco lento).
  transferencia:      7 * 24,
  'talo-pay-cvu-woo': 7 * 24,
  bacs:               7 * 24,
  // Pagos inmediatos: si no se pagó en 48 h, no se paga más.
  tarjeta:            48,
  mercadopago:        48,
  'woo-mercado-pago-basic': 48,
  efectivo:           72,  // cupón de pago en efectivo: puede pagarse al otro día
  gocuotas:           48,
  paypal:             48,
};
/** Método desconocido o vacío: la espera más larga, por las dudas. */
export const ESPERA_DEFAULT_HORAS = 7 * 24;

/**
 * Metas que marcan "no tocar": excepción cargada a mano o pago reportado.
 *
 * `_talo_payment_id` NO entra acá a propósito: Talo genera el CVU al crear el
 * pedido, así que ese meta existe en toda transferencia aunque nunca se haya
 * pagado (en la simulación del 17/10 protegía 49 pendientes viejos, o sea que
 * ninguna transferencia habría expirado nunca). Lo que sí marca un cobro es
 * `date_paid`, `transaction_id` o el pago reportado — y Talo acredita solo,
 * pasando el pedido a processing. Con la espera de 7 días alcanza.
 */
const METAS_NO_TOCAR = ['_hs_no_expirar', '_hs_pago_reportado'];

/** Marca que deja el barrido, para poder auditar y revertir después. */
export const META_EXPIRADO = '_hs_expirado_auto';

export type PedidoPendiente = {
  id: number;
  number?: string | number;
  status: string;
  created_via?: string;
  payment_method?: string;
  date_created_gmt?: string;
  date_paid_gmt?: string | null;
  transaction_id?: string;
  total?: string;
  meta_data?: { key?: string; value?: unknown }[];
};

export type Decision =
  | { accion: 'cancelar'; id: number; numero: string; metodo: string; horas: number; espera: number; total: string }
  | { accion: 'conservar'; id: number; numero: string; metodo: string; horas: number; motivo: string };

export function esperaDe(metodo: string): number {
  return ESPERA_HORAS[metodo] ?? ESPERA_DEFAULT_HORAS;
}

export function decidir(pedido: PedidoPendiente, ahora: number): Decision {
  const metodo = (pedido.payment_method ?? '').trim();
  const numero = String(pedido.number ?? pedido.id);
  const creado = pedido.date_created_gmt ? new Date(pedido.date_created_gmt + 'Z').getTime() : NaN;
  const horas = Number.isFinite(creado) ? Math.floor((ahora - creado) / 3600_000) : -1;
  const base = { id: pedido.id, numero, metodo, horas };

  // Idempotencia: solo pending. Un pedido ya cancelado o pagado no se vuelve a tocar.
  if (pedido.status !== 'pending') return { ...base, accion: 'conservar', motivo: `status ${pedido.status}` };

  // Señales de pago: si algo indica que el cobro existió, no se cancela.
  if (pedido.date_paid_gmt) return { ...base, accion: 'conservar', motivo: 'tiene fecha de pago' };
  if ((pedido.transaction_id ?? '').trim()) return { ...base, accion: 'conservar', motivo: 'tiene transaction_id' };

  const metas = pedido.meta_data ?? [];
  for (const m of metas) {
    const key = String(m.key ?? '');
    if (METAS_NO_TOCAR.includes(key) && String(m.value ?? '').trim()) {
      return { ...base, accion: 'conservar', motivo: `marcado ${key}` };
    }
  }
  if (metas.some((m) => String(m.key ?? '') === META_EXPIRADO)) {
    return { ...base, accion: 'conservar', motivo: 'ya procesado' };
  }

  // Pedidos que no creó el checkout (carga manual, mayorista, canjes) no se
  // tocan nunca: tienen su propio circuito y los sigue una persona.
  const via = (pedido.created_via ?? '').trim();
  if (via !== 'rest-api' && via !== 'checkout') {
    return { ...base, accion: 'conservar', motivo: `created_via ${via || 'desconocido'}` };
  }

  if (horas < 0) return { ...base, accion: 'conservar', motivo: 'sin fecha de creación válida' };

  const espera = esperaDe(metodo);
  if (horas < espera) return { ...base, accion: 'conservar', motivo: `espera ${horas}h de ${espera}h` };

  return { ...base, accion: 'cancelar', espera, total: String(pedido.total ?? '0') };
}

export function resumir(decisiones: Decision[]) {
  const cancelar = decisiones.filter((d): d is Extract<Decision, { accion: 'cancelar' }> => d.accion === 'cancelar');
  const porMetodo: Record<string, number> = {};
  for (const d of cancelar) porMetodo[d.metodo || '(sin método)'] = (porMetodo[d.metodo || '(sin método)'] ?? 0) + 1;
  const motivos: Record<string, number> = {};
  for (const d of decisiones) {
    if (d.accion === 'conservar') motivos[d.motivo.replace(/\d+/g, 'N')] = (motivos[d.motivo.replace(/\d+/g, 'N')] ?? 0) + 1;
  }
  return {
    analizados: decisiones.length,
    aCancelar: cancelar.length,
    seConservan: decisiones.length - cancelar.length,
    porMetodo,
    motivosDeConservar: motivos,
  };
}
