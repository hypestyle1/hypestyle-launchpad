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
  // Orden (29/08): los dos HS CO primero (pedido explicito), despues las dos
  // pre-ventas con pauta activa, y el resto por unidades vendidas cobradas de
  // los ultimos 60 dias (Woo, completed+processing). La lista se muestra
  // COMPLETA, sin recorte a filas.
  // — Destacados —
  { slug: 'hs-co-green-hoodie' }, // colorway nuevo: Proximamente hasta cargar stock/mockup
  { slug: 'hs-co-grey-hoodie', live: true },
  { slug: 'find-jesus-longsleeve-black', preSale: true }, // despacha desde el 10/09
  { slug: 'longsleeve-waffle-horses', preSale: true }, // molde nuevo 28/08; 2do mas vendido (16u)
  // — Por ventas 60d (relevado 29/08) —
  { slug: 'lamb-of-god-pink-tee', live: true }, // 21u, el mas vendido del drop
  { slug: 'longsleeve-waffle-god-gave-me-style', live: true }, // 13u
  { slug: 'lion-of-judah-stone-wash-hoodie', live: true }, // 5u
  { slug: 'christ-reigns-tee', live: true }, // 5u
  { slug: 'christ-reigns-hoodie', live: true }, // 4u
  { slug: 'he-die-so-i-could-live-hoodie', live: true }, // 4u
  { slug: 'jesus-heart-tee', live: true }, // 3u
  { slug: 'faith-over-everything-camo-hoodie', live: true }, // 2u
  { slug: 'he-died-so-i-could-live-melange-hoodie', live: true }, // 2u
  { slug: 'sweater-distressed-hs-co', live: true }, // 2u
];
