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
export type FaithDropItem = {
  slug: string;
  live?: boolean;
  blurred?: boolean;
};

export const FAITH_DROP_ITEMS: FaithDropItem[] = [
  // — Fila 1 —
  { slug: 'longsleeve-waffle-horses' },
  { slug: 'longsleeve-waffle-god-gave-me-style' },
  { slug: 'christ-reigns-hoodie' },
  { slug: 'he-die-so-i-could-live-hoodie' },
  // — Fila 2 —
  { slug: 'lion-of-judah-stone-wash-hoodie' },
  { slug: 'christ-reigns-tee' },
  { slug: 'faith-over-everything-camo-hoodie' },
  { slug: 'jesus-heart-tee' },
  // — Fila 3 —
  { slug: 'he-died-so-i-could-live-melange-hoodie' },
  { slug: 'sweater-distressed-hs-co' },
  { slug: 'lamb-of-god-pink-tee', blurred: true },
  { slug: 'hs-co-grey-hoodie', blurred: true },
];

export type FaithDropSlide = { src: string; type?: 'image' | 'video' };

// Contenido de la comunidad debajo de la grilla de productos.
// Desktop: [0] y [1] se muestran uno al lado del otro (2 columnas).
// Mobile: se juntan en un solo carrusel (EditorialSlider) con todas las slides.
// Vacio = sin media todavia -> se muestra un placeholder en cada columna.
export const FAITH_DROP_MEDIA: FaithDropSlide[] = [];
