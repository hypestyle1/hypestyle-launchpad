import { describe, it, expect } from 'vitest';
import { CYBER_DESTACADOS_SLUGS } from '@/lib/cyber-cartelera';
import { CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import { fromWPNode } from '@/lib/products-normalize';
import { SLUGS_INTERNOS } from '@/lib/catalog';

describe('curaduría comercial aprobada del 1/11', () => {
  it('conserva los 24 aprobados en su orden y las 12 siguientes sin duplicados', () => {
    expect(CYBER_DESTACADOS_SLUGS.slice(0,CYBER_INITIAL_COUNT)).toEqual([
      'faith-over-everything-camo-hoodie',
      'find-jesus-longsleeve-black',
      'grey-camo-cap',
      'sleeveless-ranglan-black',
      'napoli-tee-azul',
      'sweatpant-grey-hstars',
      'zolotye-kupola-washed-graphite-hoodie',
      'camo-cap',
      'lettering-black-longsleeve',
      'regular-tees-3-pack-black-navy-white',
      'splatter-hoodie-washed-grey',
      'napoli-tee-blanca',
      'sleeveless-ranglan-white',
      'sweatpant-pink',
      'longsleeve-waffle-horses',
      'pack-x3-medias-hype',
      'hype-distressed-grey-hoodie',
      'honda-white-tee',
      'ladytribal-black-longsleeve',
      'sweatpant-black-hstars',
      'athletic-dept-pink-longsleeve',
      'trucker-cap-no-faith-no-glory',
      'hype-washed-black-waffle-longsleeve',
      'regular-tees-3-pack-white',
    ]);
    expect(CYBER_DESTACADOS_SLUGS).toHaveLength(CYBER_EXPANDED_COUNT);
    expect(new Set(CYBER_DESTACADOS_SLUGS).size).toBe(36);
    expect(CYBER_DESTACADOS_SLUGS.slice(0,24).filter(s=>/^regular-tee-/.test(s))).toEqual([]);
  });
  it('el pack de medias es una ficha simple vendible, no la media interna de regalo', () => {
    const product=fromWPNode({id:'2261',slug:'pack-x3-medias-hype',name:'Pack x3 Medias Hype',price:'28000',regularPrice:'28000',stockStatus:'IN_STOCK',stockQuantity:66,productCategories:{nodes:[{name:'accesorio'}]}});
    expect(SLUGS_INTERNOS.has(product.slug)).toBe(false);
    expect(product.price).toBe(28000);
    expect(product.sizes).toEqual(['Única']);
    expect(product.stock['Única']).toBe('ok');
    expect(CYBER_DESTACADOS_SLUGS[15]).toBe(product.slug);
  });
});
