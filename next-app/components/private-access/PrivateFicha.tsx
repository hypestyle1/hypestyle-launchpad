'use client';

import ProductoClient from '@/app/producto/[slug]/ProductoClient';
import PrivateProductCard from './PrivateProductCard';
import type { Product } from '@/data/products';
import type { PrivateProduct } from '@/lib/private-access/normalize';
import { PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import { paTrack, rememberPrivateItem } from '@/lib/private-access/analytics';
import { useEffect } from 'react';

interface Props {
  product: Product;
  related: PrivateProduct[];
  collectionName: string;
  saleEndsLabel: string;
}

/**
 * Ficha de un producto de la preventa: la MISMA ficha de producto del sitio
 * (ProductoClient → Ficha) con la capa de Private Access encima. Lo único que
 * cambia es el badge, la línea de la preventa, las migas y que el stock se
 * consulta por la ruta privada. La compra es la de siempre.
 */
export default function PrivateFicha({ product, related, collectionName, saleEndsLabel }: Props) {
  useEffect(() => {
    paTrack('private_product_view', { item_id: product.slug, value: product.price, currency: 'ARS' });
  }, [product.slug, product.price]);

  return (
    <ProductoClient
      slug={product.slug}
      initialProduct={product}
      privateAccess={{
        badge: 'Mejores Amigos',
        note: `Preventa exclusiva hasta el ${saleEndsLabel}`,
        collectionName,
        backHref: PRIVATE_ACCESS_PATH,
        checkStock: async (slug, size) => {
          try {
            const res = await fetch(`/api/private-access/stock?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
            if (res.status === 401) { window.location.reload(); return 'out'; }
            if (!res.ok) return 'ok'; // ante la duda, el mu-plugin es la fuente de verdad al crear el pedido
            const { stock } = await res.json();
            return stock?.[size] ?? 'ok';
          } catch {
            return 'ok';
          }
        },
        onAdded: ({ slug, size, price }) => {
          rememberPrivateItem(slug);
          paTrack('private_add_to_cart', { item_id: slug, item_variant: size, value: price, currency: 'ARS' });
        },
        related: (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-[6px] gap-y-6 md:gap-x-3">
            {related.slice(0, 4).map(p => <PrivateProductCard key={p.slug} product={p} compact />)}
          </div>
        ),
      }}
    />
  );
}
