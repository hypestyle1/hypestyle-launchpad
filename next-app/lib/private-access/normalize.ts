// Producto privado: lo mismo que normaliza el resto del catálogo
// (fromWPNode de lib/products-normalize) más la descripción y los detalles de
// la ficha. Puro, sin fetch: se testea solo.

import { fromWPNode, type NormalizedProduct } from '@/lib/products-normalize';
import { PRIVATE_ACCESS_PATH } from './config';

export interface PrivateProduct extends NormalizedProduct {
  description: string;
  details: { label: string; text: string }[];
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

export function fromPrivateNode(node: any, labels: { saleEndsLabel: string; publicOpenLabel: string }): PrivateProduct {
  const base = fromWPNode(node);
  return {
    ...base,
    href: `${PRIVATE_ACCESS_PATH}/${base.slug}`,
    description: stripHtml(node.description || node.shortDescription || ''),
    details: previewDetails(labels.saleEndsLabel, labels.publicOpenLabel),
  };
}

/** Stock por talle a partir de la respuesta de `stock` (mismo criterio que fromWPNode). */
export function stockFromNode(node: any): Record<string, StockLevel> {
  return fromWPNode({ ...node, name: '', slug: node?.slug || '' }).stock;
}
