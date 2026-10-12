/**
 * Anchos de las miniaturas del feed de Instagram (ver app/api/ig-image).
 * La tira dibuja cada foto a 48vw en mobile (~190 px, x3 = ~560) y a 16,6vw en
 * desktop (~240 px, x2 = ~480): con 320/480/640 cada pantalla pide la justa.
 */
export const IG_IMAGE_WIDTHS = [320, 480, 640] as const;

/** Mismos cortes que las clases de ancho de la tira (w-[48vw] sm:w-[33vw] md:w-[25vw] lg:w-[16.6vw]). */
export const IG_IMAGE_SIZES = '(min-width: 1024px) 16.6vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 48vw';

export function igImageSrcSet(id: string): string {
  return IG_IMAGE_WIDTHS.map((w) => `/api/ig-image/${encodeURIComponent(id)}?w=${w} ${w}w`).join(', ');
}

export function igImageSrc(id: string, w: (typeof IG_IMAGE_WIDTHS)[number] = 480): string {
  return `/api/ig-image/${encodeURIComponent(id)}?w=${w}`;
}
