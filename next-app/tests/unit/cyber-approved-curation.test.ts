import { describe, it, expect } from 'vitest';
import { CYBER_DESTACADOS_SLUGS } from '@/lib/cyber-cartelera';
import { CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import { fromWPNode } from '@/lib/products-normalize';
import { SLUGS_INTERNOS } from '@/lib/catalog';

/* Curaduría del 3/11, pedida por Valentín para el rediseño del PR #655:
   "abrir con best sellers reales, priorizando ventas y stock disponible".
   La primera fila sale de los pedidos pagados de Woo (30 días al 3/11,
   unidades sumando talles); el resto conserva la curaduría aprobada el 1/11.
   Reemplaza al candado anterior (orden del 1/11), que este mismo archivo
   protegía: si esta lista cambia, cambió una decisión comercial — que falle
   y se mire. */

describe('curaduría comercial del 3/11 — best sellers reales primero', () => {
  it('conserva los 24 del orden aprobado y las 12 siguientes sin duplicados', () => {
    expect(CYBER_DESTACADOS_SLUGS.slice(0, CYBER_INITIAL_COUNT)).toEqual([
      'half-zip-polo-melange', // 6/11: abre la sección (mucho stock)
      'regular-tees-3-pack-black-navy-white', // 18 u/30d — lo más vendido
      'no-service-for-the-faithless-white', // 5/11: pedido de Valentín, 30% OFF
      'grey-camo-cap', // 11 u/30d
      'faith-over-everything-camo-hoodie', // 9 u/30d — 3ª fila mobile desde el 6/11 (poco stock)
      'sweatpant-black-hstars', // 5 u/30d
      'athletic-dept-blue-longsleeve', // 5 u/30d
      'pack-x3-medias-hype', // 10 u/30d
      'sweatpant-grey-hstars', // 4 u/30d
      'find-jesus-longsleeve-black',
      'sleeveless-ranglan-black',
      'half-zip-polo-navy', // 6/11
      'napoli-tee-azul',
      'zolotye-kupola-washed-graphite-hoodie',
      'camo-cap',
      'lettering-black-longsleeve',
      'splatter-hoodie-washed-grey',
      'napoli-tee-blanca',
      'half-zip-polo-black', // 6/11
      'hype-creative-goods-green-raglan-longsleeve', // 7/11
      'sweatpant-pink',
      'longsleeve-waffle-horses',
      'hype-distressed-grey-hoodie',
      'department-of-culture-washed-black-waffle-longsleeve', // 7/11
    ]);

    expect(CYBER_DESTACADOS_SLUGS).toHaveLength(CYBER_EXPANDED_COUNT);
    expect(new Set(CYBER_DESTACADOS_SLUGS).size).toBe(36);
    expect(CYBER_DESTACADOS_SLUGS.slice(0, 24).filter((s) => /^regular-tee-/.test(s))).toEqual([]);
  });
  it('el pack de medias es una ficha simple vendible, no la media interna de regalo', () => {
    const product = fromWPNode({ id: '2261', slug: 'pack-x3-medias-hype', name: 'Pack x3 Medias Hype', price: '28000', regularPrice: '28000', stockStatus: 'IN_STOCK', stockQuantity: 66, productCategories: { nodes: [{ name: 'accesorio' }] } });
    expect(SLUGS_INTERNOS.has(product.slug)).toBe(false);
    expect(product.price).toBe(28000);
    expect(product.sizes).toEqual(['Única']);
    expect(product.stock['Única']).toBe('ok');
    expect(CYBER_DESTACADOS_SLUGS[7]).toBe(product.slug);
  });
});
