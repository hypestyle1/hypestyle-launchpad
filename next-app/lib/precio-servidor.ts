/**
 * Precios, descuentos y envío de un pedido calculados EN EL SERVIDOR.
 *
 * Hasta octubre de 2026 las rutas que crean pedidos usaban el precio por línea,
 * el descuento y el envío que mandaba el navegador (auditoría de seguridad del
 * 28/09, hallazgo C1): una request armada a mano con `price: 1` creaba un
 * pedido de $1 que después se cobraba y se despachaba. Acá el body del cliente
 * solo dice QUÉ se compra (producto, talle, cantidad, medio de pago, tarifa
 * elegida); CUÁNTO sale lo decide este módulo.
 *
 * Fuente del precio: la misma que usa la tienda para mostrarlo
 * (lib/products-server → fromWPNode): precio de oferta si existe, si no el
 * precio actual, si no el regular. Así lo que se cobra es lo que se vio, incluso
 * en el caso de una oferta con la ventana de fechas vencida en Woo (por eso se
 * mandaba el precio del carrito: Woo habría cobrado el regular).
 */
import { GIFT_CARD_SLUG, isValidGiftAmount } from '@/lib/gift-card';
import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';
import { compute3x2Discount } from '@/lib/promo-3x2';
import { computeChampionDiscount } from '@/lib/promo-champion';
import { costoEnvio, tarifaPorDefecto, type TarifaEnvio } from '@/lib/envio';

export const DESCUENTO_TRANSFERENCIA = 0.10;

export class PrecioError extends Error {
  constructor(msg: string) { super(msg); this.name = 'PrecioError'; }
}

export type ItemPedido = { id: string; price?: unknown; quantity?: unknown; size?: string; name?: string };
export type LineaPrecio = { id: string; price: number; quantity: number };

/**
 * Precio unitario que se cobra por cada línea. `catalogo` mapea slug → precio
 * de la tienda. La gift card es la única con precio elegido por el cliente:
 * vale lo que dice si es un monto permitido (mínimo, máximo y paso).
 */
export function preciosDeLineas(
  items: ItemPedido[],
  catalogo: Map<string, number>,
  opts: { precioGol?: number | null } = {},
): LineaPrecio[] {
  return items.map((it) => {
    const id = String(it.id ?? '');
    const quantity = Math.floor(Number(it.quantity));
    if (!id) throw new PrecioError('Producto inválido');
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
      throw new PrecioError(`Cantidad inválida para ${it.name ?? id}`);
    }

    if (id === GIFT_CARD_SLUG) {
      const monto = Number(it.price);
      if (!isValidGiftAmount(monto)) throw new PrecioError('Monto de gift card inválido');
      return { id, price: monto, quantity };
    }

    const enCatalogo = catalogo.get(id);
    if (!enCatalogo || !(enCatalogo > 0)) {
      throw new PrecioError(`${it.name ?? id} no está disponible`);
    }
    // LA NUESTRA: el descuento por gol se escribe en el sale_price de Woo, pero
    // el catálogo llega con hasta 60 s de caché. Si el descuento está activo
    // ahora, vale el precio con descuento aunque el catálogo no lo tenga todavía.
    const price = id === GOAL_DISCOUNT_SLUG && opts.precioGol && opts.precioGol > 0
      ? Math.min(enCatalogo, opts.precioGol)
      : enCatalogo;
    return { id, price, quantity };
  });
}

export function subtotal(lineas: LineaPrecio[]): number {
  return lineas.reduce((s, l) => s + l.price * l.quantity, 0);
}

/** Las gift cards no viajan ni llevan promos ni el 10% de transferencia. */
export function lineasFisicas(lineas: LineaPrecio[]): LineaPrecio[] {
  return lineas.filter((l) => l.id !== GIFT_CARD_SLUG);
}

/**
 * Descuentos que viajan como fee line negativa: promo CAMPEON50 (tiene
 * prioridad y no se suma con el 3x2), 3x2, y el 10% de transferencia local.
 * Los cupones no van acá: se mandan como coupon_lines y los calcula Woo.
 */
export function descuentos(
  lineas: LineaPrecio[],
  opts: { metodo: string; internacional: boolean; campeonActivo: boolean; tresPorDosActivo: boolean },
): { monto: number; etiqueta: string | undefined } {
  const fisicas = lineasFisicas(lineas);
  let campeon = 0;
  let tresPorDos = 0;
  if (!opts.internacional) {
    if (opts.campeonActivo) campeon = computeChampionDiscount(fisicas);
    else if (opts.tresPorDosActivo) tresPorDos = compute3x2Discount(fisicas);
  }
  const transferencia = opts.metodo === 'transferencia' && !opts.internacional
    ? Math.round(subtotal(fisicas) * DESCUENTO_TRANSFERENCIA)
    : 0;
  const etiqueta = [
    campeon > 0 ? 'CAMPEON50' : '',
    tresPorDos > 0 ? '3x2' : '',
    transferencia > 0 ? 'Transferencia (10%)' : '',
  ].filter(Boolean).join(' + ') || undefined;
  return { monto: campeon + tresPorDos + transferencia, etiqueta };
}

export type ResultadoEnvio =
  | { verificado: true; costo: number; tarifa: TarifaEnvio }
  | { verificado: false; costo: number; motivo: string };

/**
 * Costo del envío nacional con la misma regla que muestra el checkout
 * (lib/envio). `tarifas` es la respuesta del cotizador para el CP del pedido;
 * `null` si no se pudo cotizar.
 *
 * Si el cotizador no respondió, el pedido no se corta (Andreani cae seguido y
 * es una venta perdida): se usa el costo que vio el cliente, nunca negativo, y
 * el pedido queda marcado para revisarlo. Si respondió pero la tarifa elegida
 * no está entre las opciones, es una request armada: se rechaza.
 */
export function envioNacional(args: {
  tarifas: TarifaEnvio[] | null;
  tarifaId: string | null | undefined;
  costoCliente: unknown;
  subtotalFisico: number;
  cuponEnvioGratis: boolean;
}): ResultadoEnvio {
  const { tarifas, tarifaId, subtotalFisico, cuponEnvioGratis } = args;
  if (subtotalFisico <= 0) return { verificado: true, costo: 0, tarifa: { id: '', label: '', cost: 0 } };
  const ctx = { subtotalFisico, cuponEnvioGratis, internacional: false };

  if (!tarifas || tarifas.length === 0) {
    const c = Math.max(0, Math.round(Number(args.costoCliente) || 0));
    return { verificado: false, costo: c, motivo: 'el cotizador de Andreani no respondió' };
  }
  // Sin tarifa elegida: el checkout deja seguir así cuando su cotización falló
  // pero el carrito ya tenía envío gratis. Vale la de por defecto (sucursal).
  const tarifa = tarifaId ? tarifas.find((t) => t.id === tarifaId) : tarifaPorDefecto(tarifas);
  if (!tarifa) throw new PrecioError('El método de envío ya no está disponible. Volvé a elegirlo.');
  return { verificado: true, costo: Math.round(costoEnvio(tarifa, tarifas, ctx)), tarifa };
}
