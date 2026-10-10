/**
 * Regla de envío gratis para Argentina — fuente única.
 *
 * El envío gratis es SOLO para retiro en sucursal. Quien elige domicilio paga
 * la diferencia contra la sucursal: a Hype le cuesta lo mismo bonificar una
 * sucursal que descontarla de un domicilio, y el cliente que ya llegó al umbral
 * no siente el domicilio como un castigo. Medido el 29/09/2026 sobre 23 envíos,
 * domicilio costaba 33% más ($ 2.984 por envío) y era el 83% de los despachos.
 *
 * Los envíos al exterior quedan AFUERA: salen unas diez veces más que uno
 * nacional, así que ni el umbral ni un cupón de envío gratis los bonifican.
 *
 * La usan el checkout (costo y selector de envío), el CartDrawer (barra de
 * progreso) y el copy de AnnouncementBar.
 *
 * IMPORTANTE: el plugin de Andreani en WooCommerce tiene su propio
 * `envio_gratis_monto` (Ajustes → Envíos → Argentina → Andreani Envios) y no
 * distingue sucursal de domicilio. Si queda activo bonifica los dos modos en
 * cualquier camino de compra que no sea este checkout. El cotizador que usa el
 * sitio (`hype_shipping_rates`) hoy devuelve el precio lleno también por encima
 * del umbral, y esta regla depende de eso: si el plugin empezara a devolver 0,
 * el domicilio saldría gratis.
 *
 * El número es una decisión comercial: no se cambia sin avisar. Al cambiarlo
 * hay que actualizar el texto visible (AnnouncementBar y
 * lib/i18n.ts).
 */
export const FREE_SHIPPING_THRESHOLD = 180000;

/**
 * Productos que traen el envío a sucursal incluido en el precio: con uno de
 * estos en el carrito la sucursal sale gratis aunque no se llegue al umbral, y
 * el domicilio paga la diferencia, igual que sobre el umbral. 10/10/2026: los
 * tres hoodies SS27 pasaron de $98.000 a $110.000 para cubrir el envío.
 */
export const ENVIO_GRATIS_SLUGS: ReadonlySet<string> = new Set([
  'splatter-hoodie-washed-grey',
  'zolotye-kupola-washed-graphite-hoodie',
  'hype-distressed-grey-hoodie',
]);

/** ¿Alguno de estos productos trae el envío a sucursal incluido? */
export function incluyeEnvioGratis(slugs: Iterable<string>): boolean {
  for (const s of slugs) if (ENVIO_GRATIS_SLUGS.has(s)) return true;
  return false;
}

export type ModoEntrega = 'sucursal' | 'domicilio';

/** Lo que devuelve /api/andreani-rates por cada tarifa. */
export interface TarifaEnvio {
  id: string;
  label: string;
  cost: number;
}

/**
 * Las tarifas llegan como `andreani_pyme_sucursal`, `andreani_pyme_estándar` y,
 * en algunos CP, `andreani_pyme_llega hoy`. Todo lo que no es sucursal va a la
 * puerta del cliente.
 */
export function modoDeTarifa(tarifa: Pick<TarifaEnvio, 'id' | 'label'>): ModoEntrega {
  const texto = `${tarifa.id ?? ''} ${tarifa.label ?? ''}`.toLowerCase();
  return texto.includes('sucursal') ? 'sucursal' : 'domicilio';
}

// Los precios se muestran sin centavos: la cuenta se hace sobre lo que se ve,
// para que el ahorro sea exactamente la resta de los dos números en pantalla.
const pesos = (n: number) => Math.round(n);

function tarifaSucursal(tarifas: TarifaEnvio[]): TarifaEnvio | null {
  return tarifas.find((t) => modoDeTarifa(t) === 'sucursal') ?? null;
}

function domicilioMasBarato(tarifas: TarifaEnvio[]): TarifaEnvio | null {
  const domicilios = tarifas.filter((t) => modoDeTarifa(t) === 'domicilio');
  if (domicilios.length === 0) return null;
  return domicilios.reduce((a, b) => (b.cost < a.cost ? b : a));
}

/** Sucursal primero; después los domicilios, del más barato al más caro. */
export function ordenarTarifas<T extends TarifaEnvio>(tarifas: T[]): T[] {
  return [...tarifas].sort((a, b) => {
    const ma = modoDeTarifa(a);
    const mb = modoDeTarifa(b);
    if (ma !== mb) return ma === 'sucursal' ? -1 : 1;
    return a.cost - b.cost;
  });
}

/** La que queda elegida al cotizar: sucursal si existe para ese CP. */
export function tarifaPorDefecto<T extends TarifaEnvio>(tarifas: T[]): T | null {
  return ordenarTarifas(tarifas)[0] ?? null;
}

/**
 * Cuánto se ahorra eligiendo sucursal en vez del domicilio más barato.
 * 0 si falta alguna de las dos o si la sucursal no es más barata.
 */
export function ahorroSucursal(tarifas: TarifaEnvio[]): number {
  const sucursal = tarifaSucursal(tarifas);
  const domicilio = domicilioMasBarato(tarifas);
  if (!sucursal || !domicilio) return 0;
  return Math.max(pesos(domicilio.cost) - pesos(sucursal.cost), 0);
}

export interface ContextoEnvio {
  /** Subtotal de lo que viaja: las gift cards no cuentan. */
  subtotalFisico: number;
  cuponEnvioGratis?: boolean;
  internacional?: boolean;
  /** El carrito tiene un producto de ENVIO_GRATIS_SLUGS (ver incluyeEnvioGratis). */
  productoConEnvioGratis?: boolean;
}

/**
 * ¿El carrito llegó al umbral? Un producto con el envío incluido cuenta como
 * haber llegado. Nunca para un envío al exterior.
 */
export function alcanzaUmbral({ subtotalFisico, internacional, productoConEnvioGratis }: ContextoEnvio): boolean {
  if (internacional) return false;
  return !!productoConEnvioGratis || subtotalFisico >= FREE_SHIPPING_THRESHOLD;
}

/**
 * ¿Este modo de entrega sale gratis?
 * - Exterior: nunca.
 * - Cupón de envío gratis: sí, en cualquier modo (es un beneficio que Hype
 *   entrega a mano).
 * - Umbral: solo sucursal.
 */
export function envioBonificado(modo: ModoEntrega, ctx: ContextoEnvio): boolean {
  if (ctx.internacional) return false;
  if (ctx.cuponEnvioGratis) return true;
  return modo === 'sucursal' && alcanzaUmbral(ctx);
}

/**
 * Lo que paga el cliente por la tarifa elegida.
 *
 * Por encima del umbral Hype bonifica hasta el valor de la sucursal, y el
 * domicilio paga el resto. Si el CP no tiene tarifa de sucursal, la referencia
 * es la opción más barata que haya: no se le puede cobrar entero a alguien que
 * no tuvo la opción gratis para elegir.
 */
export function costoEnvio(tarifa: TarifaEnvio, tarifas: TarifaEnvio[], ctx: ContextoEnvio): number {
  if (ctx.internacional) return tarifa.cost;
  if (ctx.cuponEnvioGratis) return 0;
  if (!alcanzaUmbral(ctx)) return tarifa.cost;

  const referencia = tarifaSucursal(tarifas) ?? tarifaPorDefecto(tarifas) ?? tarifa;
  return Math.max(pesos(tarifa.cost) - pesos(referencia.cost), 0);
}
