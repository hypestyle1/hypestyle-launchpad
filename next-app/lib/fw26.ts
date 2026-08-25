// Drop FW26 — fuente única de los productos de la colección.
// Usado por la página /colecciones/fw26 y la sección "New In [FW26]" del home.
//
// ORDEN: por contribución al negocio, no por fecha de drop (tarea D3 del roadmap).
// Fuente: ventas cobradas de los últimos 30 días cruzadas con A1 (90 días).
// Los drops envejecen —Napoli pasó de ser la novedad a ser el 3% del revenue en
// dos semanas—, las categorías no. Por eso los grupos son por tipo de prenda.
//
// CAMO no va arriba pese a ser el 29% histórico: está en últimas unidades
// (conteo del 24/08: combo 3, pant 3, zip 8). Poner arriba algo que se agota es
// peor que no ponerlo. El combo directamente sale del home por falta de stock.
export const FW26_GROUPS = [
  // 1. CONJUNTOS — 41% del revenue de los últimos 30 días y el ticket más alto.
  {
    label: 'Conjuntos',
    slugs: [
      'hoodie-black-hstars', 'sweatpant-black-hstars',
      'hoodie-grey-hstars', 'sweatpant-grey-hstars',
      'hoodie-pink', 'zip-hoodie-pink', 'sweatpant-pink',
      'zip-hoodie-camo', 'sweatpant-camo',
    ],
  },
  // 2. ABRIGO Y POLOS — 17%. Half-Zip Navy se queda pese a su tasa de pago baja:
  // el problema es PayPal, no el producto (ver project_internacional_sin_pasarela).
  {
    label: 'Abrigo y Polos',
    slugs: ['half-zip-polo-melange', 'half-zip-polo-navy', 'half-zip-polo-black', 'stars-for-venezuela-hoodie'],
  },
  // 3. REMERAS Y PACKS — 14% juntas. Los 3-PACK no estaban en el home y facturan
  // $478k en 30 días; Napoli baja acá desde la primera posición.
  {
    label: 'Remeras y Packs',
    slugs: [
      'only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra',
      'napoli-tee-azul', 'napoli-tee-blanca',
      'regular-tees-3-pack-black-white-melange', 'regular-tees-3-pack-black-navy-white',
      'regular-tees-3-pack-black', 'regular-tees-3-pack-white', 'regular-tees-3-pack-grey',
    ],
  },
  // 4. Accesorios — posición fija al final, la maneja el componente.
  { label: 'Accesorios',    slugs: ['chain-hype', 'pack-x3-medias-hype', 'per-aspera-ad-astra-zippo', 'camo-cap'] },
  // 5. Faith Is The Real Hype — 16%, drop con identidad propia y su propia lógica
  // de lanzamiento (FaithDrop maneja los flags live/blurred/preSale).
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
