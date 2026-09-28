// Gift cards para el panel: qué se emitió, cuánto saldo queda y en qué pedido
// se usó cada una. Una gift card es un cupón de Woo con meta `_hs_gift_card`
// (PHP/hypestyle-gift-cards.php); el saldo a favor cargado a mano usa el mismo
// mecanismo, así que aparece acá también.
//
// Woo no deja filtrar pedidos por cupón: los usos se buscan por el mail de
// `used_by` y se confirman contra el cupón aplicado en cada pedido.

export type GiftCardEstado = 'sin_usar' | 'parcial' | 'usada' | 'vencida';

export interface GiftCardUso {
  id: number;
  number: string;
  status: string;
  fecha: string;
  cliente: string;
  email: string;
  /** Lo que el cupón descontó en ese pedido. */
  monto: number;
  /** El saldo ya bajó: el pedido se acreditó. Un pedido sin pagar todavía no consume. */
  debitado: boolean;
}

export interface GiftCardRow {
  id: number;
  code: string;
  tipo: 'gift_card' | 'saldo_a_favor';
  inicial: number;
  saldo: number;
  estado: GiftCardEstado;
  creada: string;
  /** Vacío si no vence o si ya se agotó (al agotarse el PHP la vence en el acto). */
  vence: string;
  /** Destinatario del regalo o titular del saldo, si se cargó. */
  para: string;
  origen: { id: number; number: string; status: string; cliente: string; email: string } | null;
  usos: GiftCardUso[];
  /** Parte del saldo consumido que no se pudo atar a un pedido. */
  usoSinIdentificar: number;
}

// Un pedido en estos estados no consume saldo ni lo va a consumir.
const ESTADOS_MUERTOS = ['cancelled', 'failed', 'refunded', 'trash'];

const metaDe = (o: any, key: string): string => {
  const m = (o?.meta_data || []).find((x: any) => x?.key === key);
  return m?.value == null ? '' : String(m.value);
};
const nombreDe = (o: any) => `${o?.billing?.first_name || ''} ${o?.billing?.last_name || ''}`.replace(/\s+/g, ' ').trim();

export function esGiftCardCoupon(coupon: any): boolean {
  return !!metaDe(coupon, '_hs_gift_card');
}

/** Lo que este pedido le descontó (o le va a descontar) al código, o null si no lo usa. */
export function usoEnPedido(order: any, code: string): GiftCardUso | null {
  const buscado = code.toLowerCase();
  if (ESTADOS_MUERTOS.includes(String(order?.status))) return null;

  // Checkout nacional: cupón nativo de Woo. Ruta PHP: fee negativo + meta.
  const linea = (order?.coupon_lines || []).find((c: any) => String(c?.code || '').toLowerCase() === buscado);
  const porMeta = metaDe(order, '_hs_gift_code').toLowerCase() === buscado;
  if (!linea && !porMeta) return null;

  const monto = linea
    ? (parseFloat(linea.discount) || 0) + (parseFloat(linea.discount_tax) || 0)
    : parseFloat(metaDe(order, '_hs_gift_debit')) || 0;
  return {
    id: Number(order.id),
    number: String(order.number ?? order.id),
    status: String(order.status),
    fecha: String(order.date_created || ''),
    cliente: nombreDe(order),
    email: String(order?.billing?.email || ''),
    monto,
    debitado: porMeta && !!metaDe(order, '_hs_gift_debited'),
  };
}

export function estadoDe(inicial: number, saldo: number, vence: string, ahora: Date): GiftCardEstado {
  if (saldo <= 0) return 'usada';
  if (vence && Date.parse(vence) < ahora.getTime()) return 'vencida';
  return saldo < inicial ? 'parcial' : 'sin_usar';
}

/**
 * Arma las filas del panel. `origenes` son los pedidos donde se compraron y
 * `candidatos` los pedidos de quienes figuran en `used_by`.
 */
export function armarGiftCards(coupons: any[], origenes: any[], candidatos: any[], ahora = new Date()): GiftCardRow[] {
  const origenPorId = new Map<number, any>(origenes.map((o) => [Number(o.id), o]));

  return coupons.filter(esGiftCardCoupon).map((c) => {
    const code = String(c.code || '').toUpperCase();
    const inicial = parseFloat(metaDe(c, '_hs_gift_initial')) || 0;
    const saldo = Math.max(0, parseFloat(metaDe(c, '_hs_gift_balance')) || 0);
    const venceRaw = String(c.date_expires || '');
    const estado = estadoDe(inicial, saldo, venceRaw, ahora);

    const vistos = new Set<number>();
    const usos: GiftCardUso[] = [];
    for (const o of candidatos) {
      const uso = usoEnPedido(o, code);
      if (!uso || vistos.has(uso.id)) continue;
      vistos.add(uso.id);
      usos.push(uso);
    }
    usos.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const identificado = usos.filter((u) => u.debitado).reduce((s, u) => s + u.monto, 0);
    const origen = origenPorId.get(Number(metaDe(c, '_hs_gift_order')));

    return {
      id: Number(c.id),
      code,
      tipo: /^saldo a favor/i.test(String(c.description || '')) ? 'saldo_a_favor' : 'gift_card',
      inicial,
      saldo,
      estado,
      creada: String(c.date_created || ''),
      vence: estado === 'usada' ? '' : venceRaw,
      para: metaDe(c, '_hs_gift_para'),
      origen: origen
        ? { id: Number(origen.id), number: String(origen.number ?? origen.id), status: String(origen.status), cliente: nombreDe(origen), email: String(origen?.billing?.email || '') }
        : null,
      usos,
      usoSinIdentificar: Math.max(0, Math.round((inicial - saldo - identificado) * 100) / 100),
    } satisfies GiftCardRow;
  }).sort((a, b) => b.creada.localeCompare(a.creada));
}

/** Mails (o ids de cliente) que usaron algún cupón gift card, sin repetir. */
export function usuariosDe(coupons: any[]): string[] {
  const out = new Set<string>();
  for (const c of coupons.filter(esGiftCardCoupon)) {
    for (const u of (c.used_by || [])) {
      const v = String(u || '').trim().toLowerCase();
      if (v) out.add(v);
    }
  }
  return [...out];
}
