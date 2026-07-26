// Drop FW26 — fuente única de los productos de la colección.
// Usado por la página /colecciones/fw26 y la sección "New In [FW26]" del home.
export const FW26_GROUPS = [
  { label: 'Half-Zip Polo', slugs: ['half-zip-polo-melange', 'half-zip-polo-navy', 'half-zip-polo-black'] },
  { label: 'Pink Set',      slugs: ['hoodie-pink', 'zip-hoodie-pink', 'sweatpant-pink'] },
  { label: 'Camo Drop',     slugs: ['camo-full-set-combo', 'zip-hoodie-camo', 'sweatpant-camo', 'camo-cap', 'beanie-camo'] },
  { label: 'Remeras',       slugs: ['only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra'] },
  { label: 'Conjunto Gris', slugs: ['hoodie-grey-hstars', 'sweatpant-grey-hstars', 'hoodie-melange', 'sweatpant-melange'] },
  { label: 'Accesorios',    slugs: ['chain-hype', 'pack-x3-medias-hype', 'per-aspera-ad-astra-zippo'] },
];

export const FW26_SLUGS = FW26_GROUPS.flatMap(g => g.slugs);
