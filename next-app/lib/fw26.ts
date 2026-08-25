// Drop FW26 — fuente única de los productos de la colección.
// Usado por la página /colecciones/fw26 y la sección "New In [FW26]" del home.
//
// ORDEN: por contribución al negocio, no por fecha de drop (tarea D3 del roadmap).
// Fuente: ventas cobradas de los últimos 30 días cruzadas con A1 (90 días).
// Los drops envejecen —Napoli pasó de ser la novedad a ser el 3% del revenue en
// dos semanas—, las categorías no. Por eso los grupos son por tipo de prenda.
//
// REGLA DE GRILLA: cada sección lleva una cantidad MÚLTIPLO DE 4 de productos.
// El home es de 2 columnas en mobile y 4 en desktop, así que cualquier otro
// número deja huecos en la última fila. Si un producto no entra, no se agrega
// "para completar": se elige por ventas cuál queda afuera (ver PRODUCTOS_FUERA).
export const FW26_GROUPS = [
  // 1. CONJUNTOS — 41% del revenue de 30 días y el ticket más alto del catálogo.
  // CAMO entra acá pero NO manda la sección: está en últimas unidades
  // (conteo 24/08: pant 3, zip 8) y el combo salió del home por falta de stock.
  {
    label: 'Conjuntos',
    slugs: [
      'hoodie-black-hstars', 'sweatpant-black-hstars',
      'hoodie-grey-hstars', 'sweatpant-grey-hstars',
      'hoodie-pink', 'sweatpant-pink',
      'zip-hoodie-camo', 'sweatpant-camo',
    ],
  },
  // 2. ABRIGO Y POLOS — 17%. Half-Zip Navy se queda pese a su tasa de pago baja:
  // el problema es PayPal, no el producto (ver project_internacional_sin_pasarela).
  {
    label: 'Abrigo y Polos',
    slugs: ['half-zip-polo-melange', 'half-zip-polo-navy', 'half-zip-polo-black', 'zip-hoodie-pink'],
  },
  // 3. REMERAS — 10%. Las Regular Tees y los 3-PACK NO van acá: ya tienen su
  // propia sección en Básicos, repetirlas duplicaba el catálogo en el mismo scroll.
  {
    label: 'Remeras',
    slugs: [
      'only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra',
      'napoli-tee-azul', 'napoli-tee-blanca',
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

// Productos que salieron del home a propósito, para que no vuelvan sin decisión:
//  - camo-full-set-combo: últimas unidades, oculto también en Woo.
//  - stars-for-venezuela-hoodie: quedaba de quinto en Abrigo y rompía la grilla.
//  - regular-tee-* y regular-tees-3-pack-*: viven en Básicos.
export const FW26_FUERA = [
  'camo-full-set-combo',
  'stars-for-venezuela-hoodie',
];

export const FW26_SLUGS = FW26_GROUPS.flatMap(g => g.slugs);
