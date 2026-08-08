import type { Metadata } from 'next';

export const SITE_URL = 'https://hypestyle.com.ar';
export const SITE_NAME = 'HYPESTYLE';

// El <title> de la home es "Hype." a propósito (branding, ver app/layout.tsx).
// El resto de las páginas sí lleva título descriptivo: es lo que Google muestra
// como titular en los resultados, y con "Hype." en todas eran todas iguales.
const TITLE_SUFFIX = ' | HYPESTYLE';

/**
 * Google corta la description por ANCHO EN PÍXELES (~920px), no por cantidad de
 * caracteres. Contar caracteres no alcanza: una description de producto en
 * mayúsculas ("REMERA TEJIDO CROCHET…") mide 1121px con solo 153 caracteres y
 * se trunca igual, mientras que una en minúscula entra cómoda con la misma
 * cantidad. Por eso se estima el ancho carácter por carácter.
 */
const DESCRIPTION_MAX_PX = 920;

// Anchos aproximados por tipo de carácter, calibrados contra mediciones reales
// del audit (error < 1px sobre las descriptions de producto y del layout).
const CHAR_WIDTH = { upper: 9.2, lower: 7.5, narrow: 5, space: 6, wide: 11.7, wideLower: 10.7 };

function charWidth(c: string): number {
  if (c === ' ') return CHAR_WIDTH.space;
  if (/[MW]/.test(c)) return CHAR_WIDTH.wide;
  if (/[mw]/.test(c)) return CHAR_WIDTH.wideLower;
  if (/[A-ZÁÉÍÓÚÑ0-9]/.test(c)) return CHAR_WIDTH.upper;
  if (/[iljtfr.,;:!|()[\]'`]/.test(c)) return CHAR_WIDTH.narrow;
  return CHAR_WIDTH.lower;
}

/**
 * Corte por cantidad de caracteres. Para el structured data, donde no hay
 * ancho de SERP que respetar y solo interesa no mandar un texto interminable.
 */
export function truncateChars(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Ancho estimado del texto tal como lo renderiza Google en el resultado. */
export function pixelWidth(text: string): number {
  let w = 0;
  for (const c of text) w += charWidth(c);
  return w;
}

/**
 * Corta el texto para que entre en el ancho de la SERP, sin partir palabras.
 * Devuelve el texto tal cual si ya entra.
 */
export function truncate(text: string, maxPx = DESCRIPTION_MAX_PX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const ellipsis = charWidth('…');
  if (pixelWidth(clean) <= maxPx) return clean;

  let cut = '';
  let w = 0;
  for (const c of clean) {
    if (w + charWidth(c) + ellipsis > maxPx) break;
    cut += c;
    w += charWidth(c);
  }
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > cut.length * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Path del sitio → URL absoluta canónica.
 *
 * SIN barra final: Next sirve las rutas sin barra y redirige con 308 las que la
 * llevan (`/tees/` → `/tees`). Un canonical apuntando a una URL que redirige es
 * una señal contradictoria, así que se normaliza a la forma que devuelve 200.
 */
export function canonicalUrl(path: string): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? `${SITE_URL}/${clean}` : `${SITE_URL}/`;
}

interface BuildMetadataArgs {
  /** Sin el sufijo de marca: se agrega salvo que `rawTitle` sea true. */
  title: string;
  description: string;
  /** Path del sitio, ej. "/tees/". Define el canonical auto-referencial. */
  path: string;
  /** Imagen para Open Graph / Twitter. Absoluta o relativa a la raíz. */
  image?: string;
  imageAlt?: string;
  /** 'product' en fichas de producto, 'website' en el resto. */
  type?: 'website' | 'article';
  /** No agregar " | HYPESTYLE" (lo usa la home, que va con branding limpio). */
  rawTitle?: boolean;
  noindex?: boolean;
}

/**
 * Metadata de página con canonical auto-referencial.
 *
 * IMPORTANTE: toda página indexable tiene que pasar por acá. El layout raíz ya
 * no fija un canonical global — lo hacía apuntando siempre a la home, así que
 * cada ficha de producto y cada colección se declaraba a sí misma como duplicado
 * de la home y Google no las indexaba por separado.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = '/og-image.png',
  imageAlt = 'HYPESTYLE — STYLE&CULTURE',
  type = 'website',
  rawTitle = false,
  noindex = false,
}: BuildMetadataArgs): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = rawTitle ? title : `${title}${TITLE_SUFFIX}`;
  const desc = truncate(description);

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: 'es_AR',
      type,
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      images: [image],
    },
  };
}
