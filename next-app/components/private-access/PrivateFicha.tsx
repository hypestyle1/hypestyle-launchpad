'use client';

import { useEffect } from 'react';
import ProductoClient from '@/app/producto/[slug]/ProductoClient';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/data/products';
import type { PrivateProduct } from '@/lib/private-access/normalize';
import { PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import { paTrack } from '@/lib/private-access/analytics';
import { checkPrivateStock, onPrivateAddedToCart, toRetailCardProps } from '@/lib/private-access/retail';

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
 * consulta por la ruta privada. Los relacionados son la grilla retail
 * (ProductCard) con productos de la colección. La compra es la de siempre.
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
        checkStock: checkPrivateStock,
        onAdded: ({ slug, size, price }) => onPrivateAddedToCart({ id: slug, size, price }),
        // Mismo markup que los relacionados de la ficha retail (ProductoClient).
        related: (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {related.slice(0, 4).map(p => (
              <ProductCard key={p.slug} {...toRetailCardProps(p)} checkStockFn={checkPrivateStock} onAddedToCart={onPrivateAddedToCart} />
            ))}
          </div>
        ),
      }}
    />
  );
}
