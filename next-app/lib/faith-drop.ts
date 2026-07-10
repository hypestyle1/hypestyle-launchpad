// Slugs curados del drop "FAITH IS THE REAL HYPE" (domingo).
// Se completa a medida que se suben los 12 productos a WP — mismo patron que
// best-sellers.ts. Mientras este vacio, FaithDrop.tsx muestra placeholders
// para poder previsualizar el layout (grilla de 4 col x 3 filas).
export const FAITH_DROP_SLUGS: string[] = [
  // — Fila 1 —
  // — Fila 2 —
  // — Fila 3 —
];

export type FaithDropSlide = { src: string; type?: 'image' | 'video' };

// Contenido de la comunidad debajo de la grilla de productos.
// Desktop: [0] y [1] se muestran uno al lado del otro (2 columnas).
// Mobile: se juntan en un solo carrusel (EditorialSlider) con todas las slides.
// Vacio = sin media todavia -> se muestra un placeholder en cada columna.
export const FAITH_DROP_MEDIA: FaithDropSlide[] = [];
