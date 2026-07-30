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

// El pack surtido es el que más conviene destacar primero en la sección del
// home (combina los 3 colores, mejor punta de entrada que un mono-color).
export const BASICOS_HOME_FEATURED_SLUG = 'regular-tees-3-pack-black-white-melange';

// Carruseles de relleno en la fila 1 del home (junto al pack destacado), para
// no dejar una fila con un solo producto suelto. Curado a mano: la galería de
// WooCommerce mezcla mockups planos, tablas de talles y fotos con modelo bajo
// el mismo patrón de nombre de archivo (ej. "regular-2" es a veces mockup y a
// veces foto real según el producto), así que no se puede filtrar por nombre
// de forma confiable — se listan a mano solo las fotos con modelo.
export const BASICOS_HOME_CAROUSELS: { slug: string; images: string[] }[] = [
  {
    slug: 'regular-tee-black',
    images: [
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-7-be9febf5aea11f1a5917644449483469-1024-1024.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-4-5f34d47a4b4b8024c617644449976606-1024-1024.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/img_5434-8a2c7779b0a8624c6d17754202702645-1024-1024.jpg',
    ],
  },
  {
    slug: 'regular-tee-white',
    images: [
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-1-ed46655595ec84c28e17644450925696-1024-1024.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-white-2-7ff8f4cade7681c43617605655795279-1024-1024.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-white-3-e12b6f6e369ba1ed5717605655807285-1024-1024.jpg',
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/img_5434-8a2c7779b0a8624c6d17754202702645-1024-1024.jpg',
    ],
  },
  {
    // Navy no tiene todavía fotos con modelo (solo mockup frente/espalda, ver
    // BASICOS_HOME_FEATURED_SLUG) — se usa Melange como 3er carrusel.
    slug: 'regular-tee-melange',
    images: [
      'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/regular-3-546b4e2a4ff6ce216917644451518289-1024-1024.jpg',
    ],
  },
];
