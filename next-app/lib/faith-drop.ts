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
  // — Fila 3 (todavia no lanzan — vidriera borrosa al fondo) —
  { slug: 'sweater-distressed-hs-co', blurred: true },
  { slug: 'faith-over-everything-camo-hoodie', blurred: true },
  { slug: 'lamb-of-god-pink-tee', blurred: true },
  { slug: 'hs-co-grey-hoodie', blurred: true },
];

export type FaithDropSlide = { src: string; type?: 'image' | 'video' };

// Contenido de la comunidad debajo de la grilla de productos (fotos Hanna, 18/07).
// Desktop: se reparte en 2 carruseles lado a lado (misma logica que EditorialSlider
// usa en "Camo Drop" dentro de NewInFW26 — crossfade + dots), mitad y mitad.
// Mobile: se juntan todas en un solo carrusel, igual que antes.
export const FAITH_DROP_MEDIA: FaithDropSlide[] = [
  { src: '/newin/faith-christ-reigns-hoodie.webp' },
  { src: '/newin/faith-christ-reigns-tee.webp' },
  { src: '/newin/faith-god-gave-me-style.webp' },
  { src: '/newin/faith-lion-of-judah.webp' },
];
