import type { CSSProperties } from 'react';

/**
 * Ajustes visuales por producto para los mockups de las cards.
 *
 * Los PNG de Woo no vienen todos con la prenda al mismo tamaño dentro del
 * cuadro. Medido el 9/11/2026 (ancho de la prenda sobre el ancho del PNG):
 * Athletic Dept 80%, Equestrian 75%, y las raglan ~65–67%. En una grilla eso
 * hace que unas "resalten" más que otras. Acá se iguala con una escala, sin
 * tocar los archivos de Woo.
 *
 * `sombra`: drop-shadow que sigue la silueta (los PNG son transparentes).
 * Pedido de Valentín para las raglan green y pink, que sobre el fondo gris
 * claro se lavaban.
 *
 * Se aplica en ProductCard solo a la foto principal en vista mockup, así que
 * vale para toda la web (home, colecciones, catálogo).
 */
export interface MockupAjuste {
  /** Escala de la imagen dentro del cuadro (1 = sin cambio). */
  escala?: number;
  /** Sombra leve que sigue la silueta. */
  sombra?: boolean;
}

const RAGLAN: MockupAjuste = { escala: 1.15, sombra: true };

export const MOCKUP_AJUSTES: Record<string, MockupAjuste> = {
  'hype-creative-goods-green-raglan-longsleeve': RAGLAN,
  'dept-of-culture-eagle-green-raglan-longsleeve': RAGLAN,
  'hype-creative-goods-pink-raglan-longsleeve': RAGLAN,
  'dept-of-culture-eagle-pink-raglan-longsleeve': RAGLAN,
  // Misma forma raglan y mismo 66%: solo escala, sin sombra (no fue pedida).
  'hs-crest-olive-raglan-longsleeve': { escala: 1.15 },
};

export const SOMBRA_MOCKUP =
  'drop-shadow(0 10px 14px rgba(10,10,10,0.14)) drop-shadow(0 2px 4px rgba(10,10,10,0.08))';

export function estiloMockup(slug: string | undefined): CSSProperties | undefined {
  const a = slug ? MOCKUP_AJUSTES[slug] : undefined;
  if (!a) return undefined;
  return {
    ...(a.escala ? { scale: String(a.escala) } : {}),
    ...(a.sombra ? { filter: SOMBRA_MOCKUP } : {}),
  };
}
