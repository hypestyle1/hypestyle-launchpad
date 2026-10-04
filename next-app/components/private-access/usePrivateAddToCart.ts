'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { gaAddToCart } from '@/lib/ga';
import { fbAddToCart } from '@/lib/fbpixel';
import { paTrack, rememberPrivateItem } from '@/lib/private-access/analytics';
import type { PrivateProduct } from '@/lib/private-access/normalize';

type Result = 'added' | 'out' | 'error';

/**
 * Agregar al carrito un producto de la preventa. Antes de agregar consulta el
 * stock en vivo por la ruta privada (con la cookie de sesión): el checkStock
 * del sitio va por GraphQL público y no ve los productos privados, así que
 * siempre decía "hay stock". Si el talle se agotó, no se agrega.
 *
 * El carrito es el mismo de siempre (slug + talle + precio): el checkout y
 * el mu-plugin no necesitan saber que el producto era privado.
 */
export function usePrivateAddToCart() {
  const { add, setDrawerOpen } = useCart();
  const [checking, setChecking] = useState(false);

  async function addToCart(product: PrivateProduct, size: string): Promise<Result> {
    if (checking) return 'error';
    setChecking(true);
    try {
      const res = await fetch(`/api/private-access/stock?slug=${encodeURIComponent(product.slug)}`, { cache: 'no-store' });
      if (res.ok) {
        const { stock } = await res.json();
        if (stock?.[size] === 'out') return 'out';
      } else if (res.status === 401) {
        // La sesión venció o la preventa se cerró: que el gate lo resuelva.
        window.location.reload();
        return 'error';
      }
      // Si la consulta falla por red, se agrega igual: el mu-plugin descuenta
      // stock al crear el pedido y es la fuente de verdad.
      add({ id: product.slug, name: product.name, price: product.price, image: product.image, size, quantity: 1 });
      rememberPrivateItem(product.slug);
      fbAddToCart({ id: product.slug, name: product.name, price: product.price, quantity: 1 });
      gaAddToCart({ item_id: product.slug, item_name: product.name, item_category: product.category, item_variant: size, price: product.price, quantity: 1 });
      paTrack('private_add_to_cart', { item_id: product.slug, item_variant: size, value: product.price, currency: 'ARS' });
      setDrawerOpen(true);
      return 'added';
    } catch {
      return 'error';
    } finally {
      setChecking(false);
    }
  }

  return { addToCart, checking };
}
