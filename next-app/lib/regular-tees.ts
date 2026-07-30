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
    ],
  },
];

export const REGULAR_TEES_SLUGS = REGULAR_TEES_GROUPS.flatMap(g => g.slugs);
