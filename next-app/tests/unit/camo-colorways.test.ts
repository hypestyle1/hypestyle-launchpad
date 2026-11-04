import { describe, it, expect } from 'vitest';
import { getColorwaysForSlug } from '@/lib/product-detail';

describe('colorways Camo Drop (04/11)', () => {
  it('Zip Hoodie: Camo Alga (olive, rosa) y Camo Chocolate (#916, naranja), sin la Pink', () => {
    for (const slug of ['zip-hoodie-camo', 'zip-hoodie-camo-olive']) {
      const c = getColorwaysForSlug(slug)!;
      expect(c.map((x) => [x.label, x.slug, x.value])).toEqual([
        ['Camo Alga', 'zip-hoodie-camo-olive', '#e58ab8'],
        ['Camo Chocolate', 'zip-hoodie-camo', '#f08a1c'],
      ]);
    }
    // La Pink no tiene stock: ni ella linkea al camo ni el camo a ella.
    expect(getColorwaysForSlug('zip-hoodie-pink')).toBeNull();
  });
  it('Jort: el mismo par de nombres y píldoras', () => {
    for (const slug of ['jort-camo-olive', 'jort-camo-brown']) {
      expect(getColorwaysForSlug(slug)!.map((x) => x.label)).toEqual(['Camo Alga', 'Camo Chocolate']);
    }
  });
});
