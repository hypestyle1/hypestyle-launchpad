// Fuente única de la colección "Regular Tees" (básicos) — usada por la página
// /colecciones/regular-tees y por la sección "Básicos" del home.
//
// Ojo: estas listas son curadas a mano. Un pack nuevo publicado en WooCommerce
// NO aparece ni acá ni en /colecciones/regular-tees hasta que se agrega su slug.
// Pasó con el pack (Black, Navy, White) el 18/08/2026: estaba publicado y
// vendible, pero invisible en el home.

const INDIVIDUALES = [
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-melange',
  'regular-tee-navy',
  'regular-tee-red',
];

// Surtidos: las combinaciones de 3 colores distintos. Son los que mejor
// explican la propuesta del pack, así que van primero en el home.
//
// Los 4 de siempre van primero y en el mismo orden: el primero es el destacado
// del home (BASICOS_HOME_FEATURED_SLUG) y mover esa posición cambiaría la home
// sin que nadie lo pida.
const PACKS_SURTIDOS = [
  'regular-tees-3-pack-black-white-melange',
  'regular-tees-3-pack-black-navy-white',
  'regular-tees-3-pack-black-melange-navy',
  'regular-tees-3-pack-melange-navy-white',
];

// Los 6 que suma la roja (30/10/2026): con cinco colores las combinaciones de 3
// pasan de 4 a 10. Hoy son borradores en Woo, así que el catálogo no los trae y
// las listas los ignoran solos hasta que se publiquen.
//
// Separados en dos por disponibilidad real, no por gusto: los tres primeros
// tienen 48 unidades y los tres con navy quedan en 4 unidades en M —el talle
// que más se vende— porque la pila de navy está en 4. Los que van al home son
// los que se pueden sostener; los otros tres viven en la página de colección.
const PACKS_SURTIDOS_RED = [
  'regular-tees-3-pack-red-black-white',
  'regular-tees-3-pack-red-black-melange',
  'regular-tees-3-pack-red-white-melange',
];
const PACKS_SURTIDOS_RED_NAVY = [
  'regular-tees-3-pack-red-black-navy',
  'regular-tees-3-pack-red-white-navy',
  'regular-tees-3-pack-red-navy-melange',
];

const PACKS_MONO = [
  'regular-tees-3-pack-black',
  'regular-tees-3-pack-white',
  'regular-tees-3-pack-grey',
  'regular-tees-3-pack-navy',
];

// La página de colección sí los lleva todos: ahí no hay grilla de filas
// cerradas que cuidar y el que busca una combinación puntual la encuentra.
export const REGULAR_TEES_GROUPS = [
  { label: 'Individuales', slugs: INDIVIDUALES },
  { label: '3-Packs', slugs: [...PACKS_SURTIDOS, ...PACKS_SURTIDOS_RED, ...PACKS_SURTIDOS_RED_NAVY, ...PACKS_MONO] },
];

export const REGULAR_TEES_SLUGS = REGULAR_TEES_GROUPS.flatMap(g => g.slugs);

// El pack surtido es el que más conviene destacar primero en la sección del
// home (combina los 3 colores, mejor punta de entrada que un mono-color).
export const BASICOS_HOME_FEATURED_SLUG = PACKS_SURTIDOS[0];

// Orden del home, distinto al de la página de colección: primero los surtidos
// (arrancando por el destacado), después los mono-color y al final los
// individuales. La sección se lee de arriba hacia abajo por tipo de producto y
// pone adelante lo de mayor ticket.
//
// Son 16 — múltiplo de 4, que es lo que pide la grilla de desktop: 7 surtidos
// (los 4 de siempre + los 3 con roja que tienen stock de sobra), 4 mono y 5
// individuales. Los 3 surtidos con navy quedan afuera del home a propósito
// (4 unidades en M); están en /colecciones/regular-tees.
export const BASICOS_HOME_ORDER = [
  ...PACKS_SURTIDOS, ...PACKS_SURTIDOS_RED, ...PACKS_MONO, ...INDIVIDUALES,
];
