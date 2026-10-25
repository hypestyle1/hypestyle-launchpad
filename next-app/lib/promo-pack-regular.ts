/**
 * Pack libre de Regular Tees: 3 remeras Regular individuales, de cualquier
 * color y talle, se cobran al precio del 3-PACK. Antes solo existían los packs
 * fijos (mono o una de cada color) y quien quería, por ejemplo, 2 negras y 1
 * blanca pagaba 3 individuales o escribía por WhatsApp.
 *
 * El precio del pack de 3 no se hardcodea: sale del catálogo (el 3-PACK Black),
 * así que si se cambia en Woo, el pack libre lo sigue solo. Si el catálogo no lo
 * trae, no hay descuento.
 *
 * Durante la ventana del evento HYPE 72 el pack pasa a "pagás 3, llevás 4":
 * cada 4 individuales se cobran a PACK_REGULAR_X4_PRECIO, el precio promocional
 * del evento, congelado (ver PACK_REGULAR_X4_DESDE / PACK_REGULAR_X4_HASTA y
 * packRegularUnidades).
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

// ─── Ventana y precio del evento HYPE 72 ─────────────────────────────────────
//
// ÚNICO lugar donde viven las fechas y el precio del evento. Para mover la
// ventana, cambiar estas constantes y nada más.
//
// Del 2/11/2026 00:00 al 4/11/2026 23:59 inclusive, hora argentina (UTC-3): el
// evento, sin el encore. El offset va escrito a mano (`-03:00`) y no como hora
// local del proceso: Vercel corre en UTC, así que un
// `new Date('2026-11-02T00:00')` sin offset daría las 21:00 del 1/11 en
// Argentina y el evento arrancaría tres horas antes.
//
// Se compara siempre contra la hora del SERVIDOR, nunca la del navegador (un
// reloj adelantado a mano no tiene que poder abrir la promo): el servidor la
// resuelve en lib/pedido-servidor al crear el pedido, y el navegador la pide a
// /api/pack-regular-status (hooks/usePackRegularUnidades).
//
// Una extensión al 5–8/11 (el encore) requiere autorización explícita de
// Valentín y se hace cambiando PACK_REGULAR_X4_HASTA a
// '2026-11-09T00:00:00-03:00'. Nada más: no hay fechas repetidas en otro lado.
//
// Rollback: no hace falta ninguno. Pasado el 4/11 23:59 la regla vuelve sola a
// grupos de 3 sin deploy; después del evento se pueden borrar estas constantes
// y el parámetro `unidades`.

/**
 * Arranque de la ventana, inclusive: **1/11/2026 23:00 ART**, una hora antes de
 * la apertura pública del 2/11 00:00.
 *
 * Esa hora es el acceso anticipado de Private Access y Mejores Amigos. No está
 * gateado por membresía: el precio queda activo para cualquiera que entre, y lo
 * anticipado es el AVISO (a las 23:00 se les escribe a los miembros, el anuncio
 * público sale a las 00:00). Si se filtra, se filtra una hora.
 *
 * Arrancar a las 00:00 dejaba una hora en la que un miembro entraba por el aviso
 * y veía el 4 PACK al precio viejo: la oferta prometida todavía no existía. El
 * precio tiene que estar vivo cuando se manda el aviso, no después.
 */
export const PACK_REGULAR_X4_DESDE = Date.parse('2026-11-01T23:00:00-03:00');

/**
 * Cierre de la ventana, exclusivo: 5/11/2026 00:00 ART. Escrito como el
 * arranque del día siguiente para que el último minuto (4/11 23:59) entre
 * completo, con sus segundos.
 */
export const PACK_REGULAR_X4_HASTA = Date.parse('2026-11-05T00:00:00-03:00');

/**
 * Precio promocional del pack de 4 dentro de la ventana: $66.300, CONGELADO acá
 * a propósito.
 *
 * El pack de 3 sigue leyendo el catálogo de Woo (precioPackRegular): si mañana
 * el 3-PACK cambia de precio, el pack de 3 lo sigue solo y el de 4 no se mueve.
 * Hoy el 3-PACK vale exactamente esto, así que durante la ventana la promesa es
 * literal: pagás lo mismo que el pack de 3 y llevás 4.
 *
 * $66.300 es el precio de HYPE 72: hay que revisar esta constante si cambia la
 * estructura de precios de las Regular Tees (una sale, un ajuste de lista, otro
 * precio de 3-PACK). Si en Woo el 3-PACK quedara POR DEBAJO de este número, el
 * pack de 4 sería peor que el de 3: computePackRegularDiscount se queda siempre
 * con el más conveniente para el cliente, no con el del evento por ser el del
 * evento.
 */
export const PACK_REGULAR_X4_PRECIO = 66300;

/** ¿Corre el "pagás 3, llevás 4" en este instante? */
export function packRegularX4Vigente(ahora: number = Date.now()): boolean {
  return ahora >= PACK_REGULAR_X4_DESDE && ahora < PACK_REGULAR_X4_HASTA;
}

/** Cuántas individuales entran por un precio de pack en este instante. */
export function packRegularUnidades(ahora: number = Date.now()): PackRegularUnidades {
  return packRegularX4Vigente(ahora) ? PACK_REGULAR_UNIDADES_X4 : PACK_REGULAR_UNIDADES;
}

/**
 * Gracia después del cierre, SOLO para cobrar.
 *
 * El navegador puede seguir mostrando el pack de 4 unos minutos después del
 * cierre: el carrito pregunta por /api/pack-regular-status y el hook lo refresca
 * cada 5 minutos (usePackRegularUnidades). Si el servidor cobrara el pack de 3
 * en esa franja, el cliente terminaría pagando MÁS que el precio promocional que
 * vio — lo único que no puede pasar.
 *
 * 10 minutos es el doble del refresco: cubre el refresco más el rato de
 * completar los datos y apretar Pagar. Cuesta diez minutos de promo al cierre;
 * cobrar de más no es una alternativa.
 */
export const PACK_REGULAR_X4_GRACIA_MS = 10 * 60_000;

/**
 * Tamaño del pack con el que se COBRA un pedido (lib/pedido-servidor). No es el
 * mismo que se muestra: incluye la gracia del cierre.
 *
 * Al ABRIR no hay gracia y no hace falta: antes de la ventana el carrito muestra
 * el pack de 3 (más caro) y si el servidor ya está en ventana cobra el de 4, o
 * sea de menos. El desajuste que importa es el otro, y es el que cubre la gracia.
 *
 * Fuera de la gracia —reloj del servidor corrido más de 10 minutos, un deploy
 * que cambie la ventana a mitad del evento, una pestaña que estuvo media hora
 * abierta— el que corta es el checkout: compara el total que cobró Woo contra el
 * que mostró (`authorizedTotal` vs `montoAPagar` en app/checkout/page.tsx) y, si
 * no coinciden, muestra el total nuevo y no cobra nada hasta que el cliente lo
 * acepte.
 */
export function packRegularUnidadesAlCobrar(ahora: number = Date.now()): PackRegularUnidades {
  const vigenteOEnGracia = ahora >= PACK_REGULAR_X4_DESDE
    && ahora < PACK_REGULAR_X4_HASTA + PACK_REGULAR_X4_GRACIA_MS;
  return vigenteOEnGracia ? PACK_REGULAR_UNIDADES_X4 : PACK_REGULAR_UNIDADES;
}

/**
 * Tamaño del pack que muestra el navegador a partir de la respuesta de
 * /api/pack-regular-status (lo usa usePackRegularUnidades).
 *
 * Fail-safe hacia el pack de siempre ante CUALQUIER respuesta que no diga 4:
 * mientras carga, si el fetch falla, si hay timeout, si el 500 vuelve con un
 * body raro. Con el fallback el carrito muestra el descuento más chico y el
 * servidor, que sí sabe la hora, cobra el del evento: se cobra de menos, nunca
 * de más.
 */
export function unidadesPackRegularDeStatus(
  status: { unidades?: unknown } | null | undefined,
): PackRegularUnidades {
  return status?.unidades === PACK_REGULAR_UNIDADES_X4
    ? PACK_REGULAR_UNIDADES_X4
    : PACK_REGULAR_UNIDADES;
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

/** Lo que ahorran todos los grupos de `tamanio` que entren, a `precioPack`. */
function ahorroPorGrupos(units: number[], tamanio: number, precioPack: number): number {
  let total = 0;
  for (let i = 0; i + tamanio <= units.length; i += tamanio) {
    total += ahorroDelGrupo(units, i, tamanio, precioPack);
  }
  return total;
}

/**
 * Por cada grupo de Regular individuales, la diferencia entre lo que suman y el
 * precio del pack. Nunca negativo: si las individuales están más baratas que el
 * pack (una oferta puntual), se cobran como individuales.
 *
 * `precioPack` es el precio del 3-PACK en el catálogo de Woo. `unidades` es el
 * tamaño del grupo (3 el de siempre, 4 en la ventana del evento). Las unidades
 * se agrupan de más caras a más baratas, así las que quedan afuera del múltiplo
 * son las más baratas y el descuento es el mayor posible.
 *
 * Dentro de la ventana los grupos de 4 se cobran a PACK_REGULAR_X4_PRECIO (el
 * precio congelado del evento, NO el del catálogo) y un resto de exactamente 3
 * se cobra al precio del catálogo: nadie paga más por llevar menos del
 * múltiplo. Entonces 3 pagan el pack de 3, 4 pagan el del evento, y 7 pagan 4 + 3.
 *
 * Sin precio de catálogo no hay descuento, ni siquiera en la ventana: si el
 * catálogo no cargó, mejor no inventar promos.
 */
export function computePackRegularDiscount(
  lines: PackRegularLine[],
  precioPack: number | null | undefined,
  unidades: PackRegularUnidades = PACK_REGULAR_UNIDADES,
): number {
  if (!precioPack || precioPack <= 0) return 0;
  const units = unidadesRegular(lines);
  // La regla de siempre: grupos de 3 al precio del catálogo.
  const conReglaDe3 = ahorroPorGrupos(units, PACK_REGULAR_UNIDADES, precioPack);
  if (unidades !== PACK_REGULAR_UNIDADES_X4) return Math.round(conReglaDe3);

  // La regla de la ventana: grupos de 4 al precio congelado del evento y, si
  // sobran exactamente 3, ese resto paga el pack de 3 del catálogo.
  let conReglaDe4 = 0;
  let i = 0;
  for (; i + PACK_REGULAR_UNIDADES_X4 <= units.length; i += PACK_REGULAR_UNIDADES_X4) {
    conReglaDe4 += ahorroDelGrupo(units, i, PACK_REGULAR_UNIDADES_X4, PACK_REGULAR_X4_PRECIO);
  }
  if (units.length - i === PACK_REGULAR_UNIDADES) {
    conReglaDe4 += ahorroDelGrupo(units, i, PACK_REGULAR_UNIDADES, precioPack);
  }

  // INVARIANTE: dentro de la ventana, en ninguna cantidad se paga más que con
  // la regla de 3. El precio del evento está congelado y el del catálogo no: si
  // el 3-PACK bajara de PACK_REGULAR_X4_PRECIO, el pack de 4 sería el peor
  // negocio para el cliente y gana la regla de siempre.
  return Math.round(Math.max(conReglaDe4, conReglaDe3));
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
 * — la cuarta es gratis mientras el 3-PACK del catálogo valga lo mismo que
 * PACK_REGULAR_X4_PRECIO (hoy sí). Fuera de la ventana, con 2 en el carrito, da
 * lo que cuesta la tercera con el pack aplicado. null si no se puede saber (sin
 * precio de unidad).
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
 *
 * Se calcula, no se promete: si el 3-PACK del catálogo bajara de
 * PACK_REGULAR_X4_PRECIO, la cuarta dejaría de ser gratis y el carrito dejaría
 * de ofrecerla sola, sin tocar nada.
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
