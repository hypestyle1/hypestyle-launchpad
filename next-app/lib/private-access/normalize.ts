// Producto privado: lo mismo que normaliza el resto del catálogo
// (fromWPNode de lib/products-normalize) más la descripción y los detalles de
// la ficha. Puro, sin fetch: se testea solo.

import { fromWPNode, type NormalizedProduct } from '@/lib/products-normalize';
import { PRIVATE_ACCESS_PATH } from './config';

export interface PrivateProduct extends NormalizedProduct {
  description: string;
  details: { label: string; text: string }[];
  /** Con el tag `proximamente`: se ve en la colección pero no se vende en la preventa (sale con la apertura al público). */
  comingSoon: boolean;
}

/** Tag de Woo de las prendas de la colección que NO entran en la preventa. Los mayoristas sí las pueden pedir. */
export const COMING_SOON_TAG = 'proximamente';

export function isComingSoonNode(node: any): boolean {
  return (node?.productTags?.nodes ?? []).some((t: any) => t?.slug === COMING_SOON_TAG);
}

export type StockLevel = 'ok' | 'low' | 'out';

/** HTML de Woo → texto plano para la ficha (sin dangerouslySetInnerHTML). */
export function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function previewDetails(saleEndsLabel: string, publicOpenLabel: string): { label: string; text: string }[] {
  return [
    { label: 'Preventa', text: `Precio de Mejores Amigos válido hasta el ${saleEndsLabel}. El ${publicOpenLabel} la colección sale al público a precio regular.` },
    { label: 'Envíos y cambios', text: 'Envíos a todo el país por Andreani. Cambios sin cargo dentro de los 30 días.' },
  ];
}

/**
 * El mu-plugin devuelve los precios crudos de Woo ("98000.00"), pero los
 * normalizadores del catálogo esperan el formato de WPGraphQL ("$98.000") y
 * tratan el punto como separador de miles: "98000.00" se leía como 9.800.000.
 * Se pasan a pesos enteros antes de normalizar.
 */
export function withPlainPrices<T>(node: T): T {
  if (!node || typeof node !== 'object') return node;
  const fix = (v: unknown) => {
    if (typeof v !== 'string' || !/^\s*\d+(\.\d+)?\s*$/.test(v)) return v;
    return String(Math.round(parseFloat(v)));
  };
  const out: any = { ...(node as any) };
  for (const k of ['price', 'regularPrice', 'salePrice']) if (k in out) out[k] = fix(out[k]);
  if (Array.isArray(out.variations?.nodes)) {
    out.variations = { ...out.variations, nodes: out.variations.nodes.map((v: any) => withPlainPrices(v)) };
  }
  return out;
}

/**
 * El mu-plugin devuelve el nombre tal como lo guarda WordPress, con las
 * entidades HTML escapadas ("STYLE&amp;CULTURE"); WPGraphQL, en cambio, lo
 * devuelve ya decodificado. Se decodifica para que la card muestre "&".
 */
export function decodeEntities(s: string): string {
  return String(s ?? '')
    .replace(/&#0*38;|&#x0*26;/gi, '&amp;')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8242;/g, '′')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // &amp; va última: si no, un `&amp;lt;` terminaría convertido en `<`.
    .replace(/&amp;/g, '&');
}

export function fromPrivateNode(node: any, labels: { saleEndsLabel: string; publicOpenLabel: string }): PrivateProduct {
  const base = fromWPNode(withPlainPrices({ ...node, name: decodeEntities(node?.name) }));
  return {
    ...base,
    href: `${PRIVATE_ACCESS_PATH}/${base.slug}`,
    description: stripHtml(node.description || node.shortDescription || ''),
    details: previewDetails(labels.saleEndsLabel, labels.publicOpenLabel),
    comingSoon: isComingSoonNode(node),
  };
}

/** Stock por talle a partir de la respuesta de `stock` (mismo criterio que fromWPNode). */
export function stockFromNode(node: any): Record<string, StockLevel> {
  return fromWPNode({ ...node, name: '', slug: node?.slug || '' }).stock;
}
