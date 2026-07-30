// "Más Hype" — catálogo de productos publicados que no tenían ninguna
// exposición en el home (ni en Best Sellers, Básicos, Faith Is The Real Hype,
// New In FW26 ni Shop The Look). Incluye también Stars For Venezuela: la
// campaña benéfica (férulas para el terremoto del 24/6) ya terminó, pero el
// producto se sigue vendiendo — solo se le sacó el armado especial de
// "Benefit Drop" del home (30/07/26).
export const MAS_HYPE_GROUPS = [
  {
    label: 'Hoodies',
    slugs: ['stars-for-venezuela-hoodie', 'crewneck-hyped-up-black', 'hoodie-black-hstars'],
  },
  {
    label: 'Pantalón',
    slugs: ['sweatpant-black-hstars'],
  },
  {
    label: 'Remeras',
    slugs: [
      'la-nuestra-jersey-mundial-26',
      'regular-tee-11-x-art-by-randal',
      'per-aspera-ad-astra-white-tee',
      'race-tee-gris',
      'worldwide-movement-taupe-tee',
      'aeroblue-tees',
      'aeropink-tees',
      'baby-come-back-tees',
      'rodeo-star-taupe-tee-v2',
      'deer-sleveless-brown',
      'eye-sleveless-wheat',
      'forpain-sleveless-pink',
      'mustang-sleveless-black',
      'waffle-crest-sleeveless-earth-brown',
      'waffle-crest-sleeveless-pearl-grey',
      'floral-silver-cross-longsleeve-black',
      'ladytribal-black-longsleeve',
    ],
  },
  {
    label: 'Musculosas',
    slugs: ['crop-tops', 'sleeveless-ranglan', 'tanktops'],
  },
  {
    label: 'Jort',
    slugs: ['jumbo-jorts-34-wheat'],
  },
  {
    label: 'Accesorios',
    slugs: ['hs-ring-silver-925', 'trucker-cap-11-x-art-by-randal', 'trucker-cap-no-faith-no-glory'],
  },
];

export const MAS_HYPE_SLUGS = MAS_HYPE_GROUPS.flatMap(g => g.slugs);

// Selección para la vidriera del home — 8 productos (2 filas x 4), priorizando
// piezas con stock real y visualmente distintas entre sí (no 5 remeras
// parecidas seguidas). El resto solo se ve entrando a la página completa.
export const MAS_HYPE_HOME_SLUGS = [
  'stars-for-venezuela-hoodie',
  'la-nuestra-jersey-mundial-26',
  'regular-tee-11-x-art-by-randal',
  'trucker-cap-11-x-art-by-randal',
  'hoodie-black-hstars',
  'sweatpant-black-hstars',
  'hs-ring-silver-925',
  'race-tee-gris',
];
