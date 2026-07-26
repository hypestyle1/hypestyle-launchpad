// Slugs curados que se muestran en la sección "Sale — Best Sellers" del home.
// Compartido entre BackInStock (home) y la página SALE, que excluye estos
// para no repetir productos y destacar los que no aparecen en el home.
// Todos con descuento aplicado (10/15/20/30% según ventas históricas, 26/07/26).
// Orden pensado para grilla de 4 columnas (desktop) — 41 productos, última fila incompleta.
export const BEST_SELLERS_SLUGS = [
  // — Fila 1 —
  'per-aspera-ad-astra-zippo',
  'jersey-fileteado-x-alfredo-genovese',
  'mesh-camo-blue-tee',            // subido (stock abundante), después del fileteado
  'lettering-melange-jort',
  // — Fila 2: Stay Hustle subido + 2 nuevos + No Service Hoodie de cierre —
  'hoodie-stay-hustle',
  'regular-tees-3-pack-black-white-melange',
  'crewneck-hyped-up-grey',
  'no-service-for-the-faithless-hoodie',
  // — Fila 3 en adelante: orden original (sin los promovidos arriba) —
  'no-service-for-the-faithless-white',
  'no-service-for-the-faithless-black',
  'no-service-for-the-faithless-grey',
  'no-service-for-the-faithless-green',
  'baby-come-back-black',
  'no-love-only-style-tops',
  'trucker-cap-baby-come-back',
  'lettering-pink-jort',
  'lettering-graphite-hoodie',
  'lettering-graphite-jort',
  'mesh-realtree-tee',
  'mesh-realtree-pink-tee',
  'fleece-jacket-v1-negrogris',
  'hoodie-shield-olive',
  'jort-cargo-realtree-beige',
  'jort-cargo-realtree-pink',
  'race-tee',
  'sweatpants-bombe-bordo',
  'knitted-tshirt-sand',
  'raglan-tee-tribal-cross',
  'find-jesus-longsleeve-black',   // stock muy bajo (1 unidad en L y en XL) — puede agotarse rápido
  'sleeveless-ranglan-white',
  'sleeveless-ranglan-militar-green',
  'sleeveless-ranglan-grey',
  'sleeveless-ranglan-black',
  'hypestation-white-tee',
  'hypestation-black-tee',
  'honda-white-tee',
  'honda-black-tee',
  'skyline-tee',
  'aerogrey-tees',
  'mesh-camo-grey-tee',
  'per-aspera-ad-astra-black-tee', // cierra la grilla (41 productos)
];
