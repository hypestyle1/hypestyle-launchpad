// Productos curados del drop "FAITH IS THE REAL HYPE" (domingo).
// Se completa a medida que se suben los productos a WP — mismo patron que
// best-sellers.ts. Mientras este vacio, FaithDrop.tsx muestra placeholders
// para poder previsualizar el layout (grilla de 4 col x 3 filas).
//
// `live: false` (default) = badge "Próximamente", solo vidriera (sin talles
// ni "agregar al carrito"). Pasar a `live: true` producto por producto a
// medida que se van lanzando — no todos salen el mismo dia.
// `blurred: true` = la foto se muestra borrosa (para productos recien
// subidos cuya foto todavia no es la definitiva/el reveal final).
// `preSale: true` = ya está a la venta (talles + carrito habilitados, como
// `live`) pero con badge "Pre-Venta" en vez de "New In", para dejar claro
// que todavia no es el lanzamiento definitivo.
export type FaithDropItem = {
  slug: string;
  live?: boolean;
  blurred?: boolean;
  preSale?: boolean;
};

export const FAITH_DROP_ITEMS: FaithDropItem[] = [
  // — Fila 1 (disponibles) —
  { slug: 'longsleeve-waffle-horses', live: true },
  { slug: 'longsleeve-waffle-god-gave-me-style', live: true },
  { slug: 'christ-reigns-hoodie', live: true },
  { slug: 'he-die-so-i-could-live-hoodie', live: true },
  // — Fila 2 (disponibles) —
  { slug: 'lion-of-judah-stone-wash-hoodie', live: true },
  { slug: 'christ-reigns-tee', live: true },
  { slug: 'jesus-heart-tee', live: true },
  { slug: 'he-died-so-i-could-live-melange-hoodie', live: true },
  // — Fila 3 (publicados 30/07/26) —
  { slug: 'sweater-distressed-hs-co', live: true },
  { slug: 'faith-over-everything-camo-hoodie', preSale: true }, // sale en pre-venta, aclarado con badge
  { slug: 'lamb-of-god-pink-tee', live: true },
  { slug: 'hs-co-grey-hoodie', live: true },
];
