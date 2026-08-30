// "Más Hype" — catálogo de productos publicados que no tenían ninguna
// exposición en el home (ni en Best Sellers, Básicos, Faith Is The Real Hype,
// New In FW26 ni Shop The Look).
// Stars For Venezuela, Hoodie/SweatPant Black HStars ya NO están acá: pasaron
// a tener su propia sección fija "Black Drop" en NewInFW26.tsx (30/07/26) —
// se sacarían de acá para no duplicar la misma pieza en dos secciones del home.
export const MAS_HYPE_GROUPS = [
  {
    label: 'Hoodies',
    slugs: ['crewneck-hyped-up-black'],
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
// LA NUESTRA salió de acá el 29/08: subió al grupo Remeras de NEW IN (fw26.ts),
// que es el bloque más visto del home. Entra CROP TOPs en su lugar — con stock
// y la única musculosa de la vidriera, así no quedan 5 remeras seguidas.
// LA NUESTRA sigue listada en MAS_HYPE_GROUPS, o sea en la página /mas-hype.
export const MAS_HYPE_HOME_SLUGS = [
  'crop-tops',
  'regular-tee-11-x-art-by-randal',
  'trucker-cap-11-x-art-by-randal',
  'hs-ring-silver-925',
  'race-tee-gris',
  'per-aspera-ad-astra-white-tee',
  'waffle-crest-sleeveless-pearl-grey',
  'aeropink-tees',
];
