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
];

// Surtidos: las 4 combinaciones posibles de 3 colores distintos sobre los 4
// individuales. Son los que mejor explican la propuesta del pack, así que van
// primero en el home.
const PACKS_SURTIDOS = [
  'regular-tees-3-pack-black-white-melange',
  'regular-tees-3-pack-black-navy-white',
  'regular-tees-3-pack-black-melange-navy',
  'regular-tees-3-pack-melange-navy-white',
];

const PACKS_MONO = [
  'regular-tees-3-pack-black',
  'regular-tees-3-pack-white',
  'regular-tees-3-pack-grey',
  'regular-tees-3-pack-navy',
];

export const REGULAR_TEES_GROUPS = [
  { label: 'Individuales', slugs: INDIVIDUALES },
  { label: '3-Packs', slugs: [...PACKS_SURTIDOS, ...PACKS_MONO] },
];

export const REGULAR_TEES_SLUGS = REGULAR_TEES_GROUPS.flatMap(g => g.slugs);

// El pack surtido es el que más conviene destacar primero en la sección del
// home (combina los 3 colores, mejor punta de entrada que un mono-color).
export const BASICOS_HOME_FEATURED_SLUG = PACKS_SURTIDOS[0];

// Orden del home, distinto al de la página de colección: primero los 4 surtidos
// (arrancando por el destacado), después los mono-color y al final los
// individuales. La grilla es de 4 columnas, así que cada bloque ocupa una fila
// entera y la sección se lee de arriba hacia abajo por tipo de producto —
// además de poner adelante lo de mayor ticket.
export const BASICOS_HOME_ORDER = [...PACKS_SURTIDOS, ...PACKS_MONO, ...INDIVIDUALES];
