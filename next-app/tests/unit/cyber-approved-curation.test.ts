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
      'half-zip-polo-melange',
      'regular-tees-3-pack-black-navy-white',
      'no-service-for-the-faithless-white',
      'grey-camo-cap',
      'faith-over-everything-camo-hoodie',
      'sweatpant-black-hstars',
      'athletic-dept-blue-longsleeve',
      'regular-tee-black',
      'pack-x3-medias-hype',
      'find-jesus-longsleeve-black',
      'sleeveless-ranglan-black',
      'half-zip-polo-navy',
      'napoli-tee-azul',
      'lamb-of-god-pink-tee',
      'zolotye-kupola-washed-graphite-hoodie',
      'lettering-black-longsleeve',
      'splatter-hoodie-washed-grey',
      'athletic-dept-white-grey-print-tee',
      'half-zip-polo-black',
      'sweatpant-pink',
      'longsleeve-waffle-horses',
      'hype-distressed-grey-hoodie',
      'department-of-culture-washed-black-waffle-longsleeve',
      'ladytribal-black-longsleeve',
    ]);


    expect(CYBER_DESTACADOS_SLUGS).toHaveLength(CYBER_EXPANDED_COUNT);
    expect(new Set(CYBER_DESTACADOS_SLUGS).size).toBe(36);
    // 7/11: Valentín sube las Regular; en los 24 va una sola (variedad).
    expect(CYBER_DESTACADOS_SLUGS.slice(0, 24).filter((s) => /^regular-tee-/.test(s))).toEqual(['regular-tee-black']);
  });
  it('el pack de medias es una ficha simple vendible, no la media interna de regalo', () => {
    const product = fromWPNode({ id: '2261', slug: 'pack-x3-medias-hype', name: 'Pack x3 Medias Hype', price: '28000', regularPrice: '28000', stockStatus: 'IN_STOCK', stockQuantity: 66, productCategories: { nodes: [{ name: 'accesorio' }] } });
    expect(SLUGS_INTERNOS.has(product.slug)).toBe(false);
    expect(product.price).toBe(28000);
    expect(product.sizes).toEqual(['Única']);
    expect(product.stock['Única']).toBe('ok');
    expect(CYBER_DESTACADOS_SLUGS[8]).toBe(product.slug);
  });
});
