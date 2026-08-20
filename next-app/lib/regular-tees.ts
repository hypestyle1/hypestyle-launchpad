// Fuente única de la colección "Regular Tees" (básicos) — usada por la página
// /colecciones/regular-tees y por la sección "Básicos" del home.
export const REGULAR_TEES_GROUPS = [
  { label: 'Individuales', slugs: ['regular-tee-black', 'regular-tee-white', 'regular-tee-melange', 'regular-tee-navy'] },
  {
    label: '3-Packs',
    slugs: [
      'regular-tees-3-pack-black',
      'regular-tees-3-pack-white',
      'regular-tees-3-pack-grey',
      'regular-tees-3-pack-navy',
      'regular-tees-3-pack-black-white-melange',
      'regular-tees-3-pack-black-navy-white',
      'regular-tees-3-pack-black-melange-navy',
      'regular-tees-3-pack-melange-navy-white',
    ],
  },
];

// Ojo: esta lista es curada a mano. Un pack nuevo publicado en WooCommerce NO
// aparece ni acá ni en /colecciones/regular-tees hasta que se agrega su slug.
// Pasó con el pack (Black, Navy, White) el 18/08/2026: estaba publicado y
// vendible, pero invisible en el home.

export const REGULAR_TEES_SLUGS = REGULAR_TEES_GROUPS.flatMap(g => g.slugs);

// El pack surtido es el que más conviene destacar primero en la sección del
// home (combina los 3 colores, mejor punta de entrada que un mono-color).
export const BASICOS_HOME_FEATURED_SLUG = 'regular-tees-3-pack-black-white-melange';
