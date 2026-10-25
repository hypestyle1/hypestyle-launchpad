/**
 * Pack libre de Regular Tees: 3 remeras Regular individuales, de cualquier
 * color y talle, se cobran al precio del 3-PACK. Antes solo existían los packs
 * fijos (mono o una de cada color) y quien quería, por ejemplo, 2 negras y 1
 * blanca pagaba 3 individuales o escribía por WhatsApp.
 *
 * El precio del pack no se hardcodea: sale del catálogo (el 3-PACK Black), así
 * que si se cambia en Woo, el pack libre lo sigue solo. Si el catálogo no lo
 * trae, no hay descuento.
 *
 * Durante la ventana del evento HYPE 72 el pack pasa a "pagás 3, llevás 4":
 * cada 4 individuales se cobran al mismo precio del 3-PACK (ver
 * PACK_REGULAR_X4_DESDE / PACK_REGULAR_X4_HASTA y packRegularUnidades).
 *
 * Lo usan el carrito, el checkout y el servidor (lib/precio-servidor), con la
 * misma cuenta: lo que se muestra es lo que se cobra.
 */
export const PACK_REGULAR_SLUGS: ReadonlySet<string> = new Set([
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-navy',
  'regular-tee-melange',
]);
export const PACK_REGULAR_REF_SLUG = 'regular-tees-3-pack-black';

/** Tamaño del pack fuera de la ventana del evento: el de siempre. */
export const PACK_REGULAR_UNIDADES = 3;

/** Tamaño del pack dentro de la ventana: pagás 3, llevás 4. */
export const PACK_REGULAR_UNIDADES_X4 = 4;

/** Cuántas individuales entran por cada precio de pack. */
export type PackRegularUnidades = typeof PACK_REGULAR_UNIDADES | typeof PACK_REGULAR_UNIDADES_X4;

// ─── Ventana del evento HYPE 72 ──────────────────────────────────────────────
//
// ÚNICO lugar donde viven las fechas del evento. Para mover la ventana antes de
// mergear, cambiar estas dos constantes y nada más.
//
// Del 2/11/2026 00:00 al 8/11/2026 23:59 inclusive, hora argentina (UTC-3). El
// offset va escrito a mano (`-03:00`) y no como hora local del proceso: Vercel
// corre en UTC, así que un `new Date('2026-11-02T00:00')` sin offset daría las
// 21:00 del 1/11 en Argentina y el evento arrancaría tres horas antes.
//
// Se compara siempre contra la hora del SERVIDOR, nunca la del navegador (un
// reloj adelantado a mano no tiene que poder abrir la promo): el servidor la
// resuelve en lib/pedido-servidor al crear el pedido, y el navegador la pide a
// /api/pack-regular-status (hooks/usePackRegularUnidades).
//
// Rollback: no hace falta ninguno. Pasado el 8/11 23:59 la regla vuelve sola a
// grupos de 3 sin deploy; después del evento se pueden borrar estas constantes
// y el parámetro `unidades`.

/** Arranque de la ventana, inclusive: 2/11/2026 00:00 ART. */
export const PACK_REGULAR_X4_DESDE = Date.parse('2026-11-02T00:00:00-03:00');

/**
 * Cierre de la ventana, exclusivo: 9/11/2026 00:00 ART. Escrito como el
 * arranque del día siguiente para que el último minuto (8/11 23:59) entre
 * completo, con sus segundos.
 */
export const PACK_REGULAR_X4_HASTA = Date.parse('2026-11-09T00:00:00-03:00');

/** ¿Corre el "pagás 3, llevás 4" en este instante? */
export function packRegularX4Vigente(ahora: number = Date.now()): boolean {
  return ahora >= PACK_REGULAR_X4_DESDE && ahora < PACK_REGULAR_X4_HASTA;
}

/** Cuántas individuales entran por un precio de pack en este instante. */
export function packRegularUnidades(ahora: number = Date.now()): PackRegularUnidades {
  return packRegularX4Vigente(ahora) ? PACK_REGULAR_UNIDADES_X4 : PACK_REGULAR_UNIDADES;
}

/**
 * Nombre del fee negativo que viaja a Woo y que se muestra en el resumen.
 * Dentro de la ventana cambia a "x4" para poder distinguir en Woo los pedidos
 * del evento de los del pack de siempre.
 *
 * Nada aguas abajo compara este nombre: el único fee que se busca por nombre
 * exacto es el 10% de transferencia (lib/repago → TRANSFER_FEE_NAME), y cuando
 * el pack y la transferencia caen juntos el fee sale combinado ("Pack Regular
 * x4 + Transferencia (10%)"), caso que repago ya detecta por `includes
 * ('Transferencia')` y no por el texto del pack.
 */
export function packRegularEtiqueta(unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES): string {
  return unidades === PACK_REGULAR_UNIDADES_X4 ? 'Pack Regular x4' : 'Pack Regular x3';
}

export interface PackRegularLine {
  id: string;
  price: number;
  quantity: number;
}

/** Precio del pack según un catálogo slug → precio (o lista de productos). */
export function precioPackRegular(
  catalogo: Map<string, number> | ReadonlyArray<{ slug: string; price: number }>,
): number | null {
  const precio = catalogo instanceof Map
    ? catalogo.get(PACK_REGULAR_REF_SLUG)
    : catalogo.find((p) => p.slug === PACK_REGULAR_REF_SLUG)?.price;
  return precio && precio > 0 ? precio : null;
}

function unidadesRegular(lines: PackRegularLine[]): number[] {
  const units: number[] = [];
  for (const l of lines) {
    if (!PACK_REGULAR_SLUGS.has(l.id)) continue;
    for (let i = 0; i < l.quantity; i++) units.push(l.price);
  }
  return units.sort((a, b) => b - a);
}

/** Lo que ahorra un grupo de unidades que se cobra al precio del pack. */
function ahorroDelGrupo(units: number[], desde: number, tamanio: number, precioPack: number): number {
  let suma = 0;
  for (let k = 0; k < tamanio; k++) suma += units[desde + k];
  return Math.max(0, suma - precioPack);
}

/**
 * Por cada grupo de Regular individuales, la diferencia entre lo que suman y el
 * precio del pack. Nunca negativo: si las individuales están más baratas que el
 * pack (una oferta puntual), se cobran como individuales.
 *
 * `unidades` es el tamaño del grupo (3 el de siempre, 4 en la ventana del
 * evento). Las unidades se agrupan de más caras a más baratas, así las que
 * quedan afuera del múltiplo son las más baratas y el descuento es el mayor
 * posible.
 *
 * Con grupos de 4, un resto de exactamente 3 se cobra igual al precio del pack:
 * nadie paga más por llevar menos del múltiplo. Entonces 3 pagan pack, 4 pagan
 * el mismo pack, y 7 pagan dos packs (4 + 3).
 */
export function computePackRegularDiscount(
  lines: PackRegularLine[],
  precioPack: number | null | undefined,
  unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES,
): number {
  if (!precioPack || precioPack <= 0) return 0;
  const units = unidadesRegular(lines);
  let total = 0;
  let i = 0;
  for (; i + unidades <= units.length; i += unidades) {
    total += ahorroDelGrupo(units, i, unidades, precioPack);
  }
  // Resto de 3 con grupos de 4 (fuera de la ventana el resto siempre es < 3).
  if (units.length - i === PACK_REGULAR_UNIDADES) {
    total += ahorroDelGrupo(units, i, PACK_REGULAR_UNIDADES, precioPack);
  }
  return Math.round(total);
}

/**
 * Cuántas Regular faltan para el próximo precio de pack. 0 si no hay ninguna o
 * si el descuento ya está aplicado del todo.
 *
 * Siempre hacen falta 3 para gatillar un pack nuevo, también en la ventana: lo
 * que cambia es que ahí, con 3 ya descontadas, la cuarta entra gratis (ver
 * packRegularCostoSiguiente).
 */
export function packRegularFaltan(
  lines: PackRegularLine[],
  unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES,
): number {
  const n = unidadesRegular(lines).length;
  if (n === 0) return 0;
  const rem = n % unidades;
  if (rem === 0) return 0;
  // Con grupos de 4 un resto de 3 ya paga precio de pack: no falta nada.
  if (rem >= PACK_REGULAR_UNIDADES) return 0;
  return PACK_REGULAR_UNIDADES - rem;
}

/** Precio de la Regular individual más barata del carrito, o null si no hay. */
export function packRegularMasBarata(lines: PackRegularLine[]): number | null {
  const units = unidadesRegular(lines);
  return units.length > 0 ? units[units.length - 1] : null;
}

/**
 * Cuánto sale sumar una Regular más de precio `precioUnidad`: su precio menos
 * lo que crece el descuento. Dentro de la ventana, con 3 ya en el carrito, da 0
 * — la cuarta es gratis. Fuera de la ventana, con 2 en el carrito, da lo que
 * cuesta la tercera con el pack aplicado. null si no se puede saber (sin precio
 * de unidad).
 */
export function packRegularCostoSiguiente(
  lines: PackRegularLine[],
  precioPack: number | null | undefined,
  precioUnidad: number | null | undefined,
  unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES,
): number | null {
  if (!precioUnidad || !Number.isFinite(precioUnidad) || precioUnidad <= 0) return null;
  const antes = computePackRegularDiscount(lines, precioPack, unidades);
  // El slug da igual mientras sea una Regular individual: lo que pesa es el precio.
  const unaMas: PackRegularLine = { id: 'regular-tee-black', price: precioUnidad, quantity: 1 };
  const despues = computePackRegularDiscount([...lines, unaMas], precioPack, unidades);
  return Math.max(0, Math.round(precioUnidad - (despues - antes)));
}

/**
 * ¿La próxima Regular que se sume entra sin costo? Solo pasa en la ventana del
 * evento, con el pack de 3 ya descontado: es el "llevás 4" de "pagás 3, llevás
 * 4" y hay que decirlo, porque `packRegularFaltan` da 0 (el descuento ya está
 * aplicado) y sin este aviso la cuarta gratis queda invisible.
 */
export function packRegularSiguienteGratis(
  lines: PackRegularLine[],
  precioPack: number | null | undefined,
  unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES,
): boolean {
  if (unidades !== PACK_REGULAR_UNIDADES_X4) return false;
  if (computePackRegularDiscount(lines, precioPack, unidades) <= 0) return false;
  const costo = packRegularCostoSiguiente(lines, precioPack, packRegularMasBarata(lines), unidades);
  return costo === 0;
}
