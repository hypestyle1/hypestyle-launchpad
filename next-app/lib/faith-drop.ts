// Slugs curados del drop "FAITH IS THE REAL HYPE" (domingo).
// Se completa a medida que se suben los 12 productos a WP — mismo patron que
// best-sellers.ts. Mientras este vacio, FaithDrop.tsx muestra placeholders
// para poder previsualizar el layout (grilla de 4 col x 3 filas).
export const FAITH_DROP_SLUGS: string[] = [
  // — Fila 1 —
  // — Fila 2 —
  // — Fila 3 —
];

type SlideItem = { src: string; type?: 'image' | 'video' };
export type FaithDropMedia =
  | { type: 'image'; src: string; alt: string }
  | { type: 'video'; src: string; alt: string; poster?: string }
  | { type: 'slider'; images?: string[]; slides?: SlideItem[]; alt: string };

// Imagen o carrusel debajo de la grilla de productos (contenido de la comunidad
// / UGC del drop). null = sin media todavia -> se muestra un placeholder.
export const FAITH_DROP_MEDIA: FaithDropMedia | null = null;
