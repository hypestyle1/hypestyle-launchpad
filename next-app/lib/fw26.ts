// Drop FW26 — fuente única de los productos de la colección.
// Usado por la página /colecciones/fw26 y la sección "New In [FW26]" del home.
export const FW26_GROUPS = [
  // Azzurro es la titular (se muestra primero), Bianca la suplente — mismo peso visual.
  { label: 'Napoli',        slugs: ['napoli-tee-azul', 'napoli-tee-blanca'] },
  // Los dos conjuntos HStars juntos (negro + gris): es el mismo modelo en dos
  // colorways, antes estaban partidos entre "Black Drop" y "Conjunto Gris".
  { label: 'Tracksuit HStars', slugs: ['hoodie-black-hstars', 'sweatpant-black-hstars', 'hoodie-grey-hstars', 'sweatpant-grey-hstars'] },
  { label: 'Half-Zip Polo', slugs: ['half-zip-polo-melange', 'half-zip-polo-navy', 'half-zip-polo-black'] },
  { label: 'Pink Set',      slugs: ['hoodie-pink', 'zip-hoodie-pink', 'sweatpant-pink'] },
  { label: 'Camo Drop',     slugs: ['camo-full-set-combo', 'zip-hoodie-camo', 'sweatpant-camo', 'camo-cap', 'beanie-camo'] },
  { label: 'Remeras',       slugs: ['only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra'] },
  // Hoodies sueltos: los que salieron del Black Drop al pasar esa sección a ser
  // solo conjuntos HStars. Shoot For The Stars NO va acá: se retiró del drop en
  // #352. (hoodie-melange / sweatpant-melange tampoco: esos slugs ya no existen
  // en Woo, estaban muertos en el config viejo.)
  { label: 'Hoodies',       slugs: ['stars-for-venezuela-hoodie'] },
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
