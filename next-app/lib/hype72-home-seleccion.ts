/**
 * HYPE 72 — qué productos entra en cada bloque del takeover de la home.
 *
 * Todo funciones puras sobre el catálogo normalizado (el MISMO que ya usa la
 * home vía `useProducts`): nada de listas de slugs inventadas acá, nada de
 * precios, nada de cantidades de stock.
 *
 * POR QUÉ POR TAG/CATEGORÍA Y NO POR SLUGS CURADOS A MANO:
 * las listas de slugs del proyecto (`BEST_SELLERS_SLUGS`, `MAS_HYPE_GROUPS`,
 * `REGULAR_TEES_GROUPS`) son curaduría de Valentín y se mantienen a mano — un
 * producto nuevo no aparece hasta que alguien agrega el slug (pasó con el pack
 * Black/Navy/White el 18/08/26, publicado y vendible pero invisible en el
 * home). Para un evento de tres días que arranca a las 23:00 de un domingo eso
 * es un riesgo caro: si entra un producto al drop y nadie toca el código, el
 * bloque lo deja afuera. Entonces:
 *   - donde YA existe curaduría en el repo, se reusa tal cual
 *     (`BASICOS_HOME_ORDER` para los packs, `BEST_SELLERS_SLUGS` para
 *     populares);
 *   - donde no, se filtra por tag de Woo y categoría, que es lo que Valentín
 *     ya mantiene al cargar el producto.
 *
 * El stock se usa solo para ORDENAR y para no mostrar agotados: nunca se
 * publica una cantidad.
 */

import type { NormalizedProduct } from './products-normalize';
import { BASICOS_HOME_ORDER } from './regular-tees';
import { BEST_SELLERS_SLUGS } from './best-sellers';

/** Tag de Woo de la colección SS27 Part 01 (el mismo de Private Access). */
const TAG_SS27 = 'ss27-part-01';
/** Tags que marcan temporada vigente: lo que NO los tiene es archivo. */
const TAGS_TEMPORADA = [TAG_SS27, 'new-in', 'fw26'];
/** Tag de vidriera: ProductCard le pone el badge "Próximamente" solo. */
export const TAG_PROXIMAMENTE = 'proximamente';

/** Al menos un talle comprable. */
export function hayStock(p: NormalizedProduct): boolean {
  return Object.values(p.stock).some((s) => s !== 'out');
}

/**
 * Todos los talles cómodos (ninguno agotado ni al límite). Es el proxy de
 * "stock alto" que se puede calcular desde el catálogo público: el GraphQL
 * normaliza a ok/low/out (`low` = 3 unidades o menos) y no expone cantidades.
 */
export function stockHolgado(p: NormalizedProduct): boolean {
  const sizes = Object.values(p.stock);
  return sizes.length > 0 && sizes.every((s) => s === 'ok');
}

const esPack = (p: NormalizedProduct) => p.category === 'Pack';
const esAccesorio = (p: NormalizedProduct) => p.category === 'Accesorio';
const texto = (p: NormalizedProduct) => `${p.slug} ${p.name}`.toLowerCase();
const esSleeveless = (p: NormalizedProduct) =>
  /sleeveless|musculosa|tanktop|tank-top/.test(texto(p)) || p.category === 'Top';
const esProximamente = (p: NormalizedProduct) => p.tags.includes(TAG_PROXIMAMENTE);
const deTemporada = (p: NormalizedProduct) => p.tags.some((t) => TAGS_TEMPORADA.includes(t));

/** Los slugs de una lista curada, en ESE orden, que existan y se puedan comprar. */
function porSlugs(catalogo: NormalizedProduct[], slugs: readonly string[]): NormalizedProduct[] {
  const bySlug = new Map(catalogo.map((p) => [p.slug, p]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is NormalizedProduct => Boolean(p) && hayStock(p!) && !esProximamente(p!));
}

/** Todo lo comprable: sin agotados y sin vidriera (los "próximamente" van a su bloque). */
function comprables(catalogo: NormalizedProduct[]): NormalizedProduct[] {
  return catalogo.filter((p) => hayStock(p) && !esProximamente(p));
}

/**
 * 05 — PACKS Y OFERTAS DESTACADAS. El ancla comercial.
 *
 * Reusa `BASICOS_HOME_ORDER` tal cual: los 4 packs surtidos primero (mayor
 * ticket y los que mejor explican la propuesta), después los mono-color y al
 * final las individuales. Las individuales importan en el evento porque la
 * mecánica del 4 PACK es "pagás 3, llevás 4" sobre individuales sueltas — eso
 * lo resuelve el carrito (`lib/promo-pack-regular.ts`), no esta sección.
 *
 * Si además hay otros packs cargados en Woo (categoría `Pack`) que no están en
 * la lista curada, entran atrás: un pack nuevo del evento no se queda afuera
 * por no haber tocado el código.
 */
export function bloquePacks(catalogo: NormalizedProduct[]): NormalizedProduct[] {
  const curados = porSlugs(catalogo, BASICOS_HOME_ORDER);
  const yaEstan = new Set(curados.map((p) => p.slug));
  const otrosPacks = comprables(catalogo).filter((p) => esPack(p) && !yaEstan.has(p.slug));
  return [...curados, ...otrosPacks];
}

/**
 * 06 — ARCHIVO / TEMPORADAS ANTERIORES.
 *
 * Lo que no lleva ningún tag de temporada vigente (`ss27-part-01`, `new-in`,
 * `fw26`): colecciones cerradas que siguen publicadas y con stock. Sin packs
 * (son el bloque 05) y sin accesorios.
 *
 * OJO — lo que la matriz pedía y HOY NO EXISTE: "Archivo x3" y "Hype Box" no
 * son productos de Woo (verificado contra el catálogo el 25/10: 142 productos,
 * ninguno con `box` ni `archivo` en el slug). Son ofertas sin SKU. Mientras no
 * existan, este bloque muestra el archivo producto por producto; cuando se
 * carguen, entran solos por no tener tag de temporada. Los Half-Zip Polo SÍ
 * existen pero están etiquetados `new-in`, así que entran por el bloque 08.
 */
export function bloqueArchivo(catalogo: NormalizedProduct[]): NormalizedProduct[] {
  return comprables(catalogo)
    .filter((p) => !deTemporada(p) && !esPack(p) && !esAccesorio(p))
    // Lo de stock holgado primero: el archivo se muestra para mover unidades.
    .sort((a, b) => Number(stockHolgado(b)) - Number(stockHolgado(a)));
}

/**
 * 07 — SLEEVELESS Y STOCK ALTO.
 *
 * Las musculosas primero (la familia completa junta, como en el estante de
 * Best sellers) y después todo lo demás con los talles holgados. Sin archivo
 * repetido: lo que ya salió en el bloque 06 se excluye con `excluir`.
 */
export function bloqueSleeveless(
  catalogo: NormalizedProduct[],
  excluir: ReadonlySet<string> = new Set(),
): NormalizedProduct[] {
  const base = comprables(catalogo).filter((p) => !excluir.has(p.slug) && !esPack(p));
  const sleeveless = base.filter(esSleeveless);
  const yaEstan = new Set(sleeveless.map((p) => p.slug));
  const holgados = base.filter((p) => !yaEstan.has(p.slug) && stockHolgado(p));
  return [...sleeveless, ...holgados];
}

/**
 * 08 — HOODIES, TEES Y SS27.
 *
 * Los hoodies primero: la mayor contribución por unidad del catálogo. Después
 * el resto de SS27 (el drop vigente) y las remeras de temporada. Es el bloque
 * de margen, no de liquidación.
 */
export function bloqueHoodiesTees(
  catalogo: NormalizedProduct[],
  excluir: ReadonlySet<string> = new Set(),
): NormalizedProduct[] {
  const base = comprables(catalogo).filter((p) => !excluir.has(p.slug) && !esPack(p));
  const hoodies = base.filter((p) => p.category === 'Hoodie' || p.category === 'Campera' || p.category === 'SWEATER');
  const yaEstan = new Set(hoodies.map((p) => p.slug));
  const resto = base.filter((p) => !yaEstan.has(p.slug) && deTemporada(p));
  return [...hoodies, ...resto];
}

/**
 * 09 — PRODUCTOS POPULARES.
 *
 * `BEST_SELLERS_SLUGS` tal cual, la curaduría que ya existe y que alimenta hoy
 * a `BackInStock`. Sin repetir nada de los bloques de arriba.
 */
export function bloquePopulares(
  catalogo: NormalizedProduct[],
  excluir: ReadonlySet<string> = new Set(),
): NormalizedProduct[] {
  return porSlugs(catalogo, BEST_SELLERS_SLUGS).filter((p) => !excluir.has(p.slug));
}

/**
 * 10 — PRÓXIMAMENTE.
 *
 * Tag `proximamente` de Woo. Va al final y separado del resto a propósito:
 * ProductCard con ese tag ya saca el "agregar rápido" y pone el badge
 * "Próximamente", así que nada de este bloque se puede confundir con algo
 * comprable hoy.
 */
export function bloqueProximamente(catalogo: NormalizedProduct[]): NormalizedProduct[] {
  return catalogo.filter(esProximamente);
}

/**
 * Los seis bloques de producto resueltos de una, sin repetir ni un producto.
 *
 * Cada bloque excluye lo que ya tomaron los anteriores. Sin esto, con 142
 * productos y seis filtros amplios, la misma card aparecía tres veces en el
 * mismo scroll.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  LA PRIORIDAD DE REPARTO NO ES EL ORDEN DE PANTALLA                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  En pantalla el orden lo manda la matriz de rentabilidad                 ║
 * ║  (hype72HomeOrden): packs, archivo, sleeveless, hoodies/tees,            ║
 * ║  populares, próximamente.                                                ║
 * ║                                                                          ║
 * ║  Pero repartir en ESE orden deja "Lo más pedido" VACÍO — verificado      ║
 * ║  contra el catálogo real el 25/10: los filtros amplios de archivo,       ║
 * ║  sleeveless y hoodies/tees se comen los 40 slugs curados antes de que    ║
 * ║  populares llegue a pedir, y la sección desaparecía.                     ║
 * ║                                                                          ║
 * ║  Los dos bloques con CURADURÍA HUMANA (packs y populares) reparten       ║
 * ║  primero. Son los únicos que hacen una afirmación sobre productos        ║
 * ║  concretos ("lo más pedido" es un dato, no un cajón), así que no pueden  ║
 * ║  llenarse con lo que sobró. Los tres filtros amplios se quedan con el    ║
 * ║  resto, que es para lo que están.                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export function hype72Bloques(catalogo: NormalizedProduct[]) {
  const packs = bloquePacks(catalogo);
  const vistos = new Set(packs.map((p) => p.slug));

  const populares = bloquePopulares(catalogo, vistos);
  populares.forEach((p) => vistos.add(p.slug));

  const archivo = bloqueArchivo(catalogo).filter((p) => !vistos.has(p.slug));
  archivo.forEach((p) => vistos.add(p.slug));

  const sleeveless = bloqueSleeveless(catalogo, vistos);
  sleeveless.forEach((p) => vistos.add(p.slug));

  const hoodiesTees = bloqueHoodiesTees(catalogo, vistos);
  hoodiesTees.forEach((p) => vistos.add(p.slug));

  // Próximamente no mira `vistos`: nunca se solapa (es el único bloque de
  // vidriera y todos los demás excluyen el tag).
  const proximamente = bloqueProximamente(catalogo);

  return { packs, archivo, sleeveless, hoodiesTees, populares, proximamente };
}
