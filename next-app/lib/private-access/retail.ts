'use client';

// Adaptador: producto privado → props del ProductCard retail. La grilla y la
// ficha de Private Access usan los MISMOS componentes que la tienda; la única
// diferencia es de dónde salen los datos (ruta privada con sesión) y a dónde
// lleva el click. Si Hype cambia el diseño de las cards, la preventa cambia sola.

import type { PrivateProduct } from './normalize';
import { PRIVATE_ACCESS_PATH } from './config';
import { paTrack, rememberPrivateItem } from './analytics';

/** Props del ProductCard retail (mismos campos que pasa CategoriaPage). */
export function toRetailCardProps(p: PrivateProduct) {
  return {
    id: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    badge: p.badge,
    image: p.image,
    images: p.images,
    sizes: p.sizes,
    stock: p.stock,
    href: `${PRIVATE_ACCESS_PATH}/${p.slug}`,
    customizable: p.customizable,
  };
}

/**
 * Stock en vivo por la ruta privada (con la cookie de sesión). Reemplaza al
 * checkStock por GraphQL público, que no ve productos privados y respondía
 * "hay stock" siempre. Ante un error de red deja agregar: el pedido descuenta
 * stock en Woo y es la fuente de verdad.
 */
export async function checkPrivateStock(slug: string, size: string): Promise<'ok' | 'low' | 'out'> {
  try {
    const res = await fetch(`/api/private-access/stock?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.status === 401) { window.location.reload(); return 'out'; }
    if (!res.ok) return 'ok';
    const { stock } = await res.json();
    return stock?.[size] ?? 'ok';
  } catch {
    return 'ok';
  }
}

/** Después de agregar al carrito: evento propio + marca para el private_purchase. */
export function onPrivateAddedToCart({ id, size, price }: { id: string; size: string; price: number }): void {
  rememberPrivateItem(id);
  paTrack('private_add_to_cart', { item_id: id, item_variant: size, value: price, currency: 'ARS' });
}
