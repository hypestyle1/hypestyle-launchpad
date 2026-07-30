// Drop FW26 — fuente única de los productos de la colección.
// Usado por la página /colecciones/fw26 y la sección "New In [FW26]" del home.
export const FW26_GROUPS = [
  { label: 'Black Drop',    slugs: ['hoodie-black-hstars', 'sweatpant-black-hstars', 'stars-for-venezuela-hoodie', 'shoot-for-the-stars'] },
  { label: 'Half-Zip Polo', slugs: ['half-zip-polo-melange', 'half-zip-polo-navy', 'half-zip-polo-black'] },
  { label: 'Pink Set',      slugs: ['hoodie-pink', 'zip-hoodie-pink', 'sweatpant-pink'] },
  { label: 'Camo Drop',     slugs: ['camo-full-set-combo', 'zip-hoodie-camo', 'sweatpant-camo', 'camo-cap', 'beanie-camo'] },
  { label: 'Remeras',       slugs: ['only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra'] },
  { label: 'Conjunto Gris', slugs: ['hoodie-grey-hstars', 'sweatpant-grey-hstars', 'hoodie-melange', 'sweatpant-melange'] },
  { label: 'Accesorios',    slugs: ['chain-hype', 'pack-x3-medias-hype', 'per-aspera-ad-astra-zippo'] },
  // Solo los productos ya publicados del drop (live o preSale en FAITH_DROP_ITEMS,
  // faith-drop.ts) — los que todavía están "Próximamente" (blurred) no se listan acá.
  {
    label: 'Faith Is The Real Hype',
    slugs: [
      'longsleeve-waffle-horses',
      'longsleeve-waffle-god-gave-me-style',
      'christ-reigns-hoodie',
      'he-die-so-i-could-live-hoodie',
      'lion-of-judah-stone-wash-hoodie',
      'christ-reigns-tee',
      'jesus-heart-tee',
      'he-died-so-i-could-live-melange-hoodie',
      'sweater-distressed-hs-co',
      'faith-over-everything-camo-hoodie',
      'lamb-of-god-pink-tee',
      'hs-co-grey-hoodie',
    ],
  },
];

export const FW26_SLUGS = FW26_GROUPS.flatMap(g => g.slugs);
