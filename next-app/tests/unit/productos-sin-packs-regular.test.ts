import { describe, it, expect } from 'vitest';
import { getCategoryConfig, productsForCategory } from '@/lib/category-config';

/* 6/11, pedido de Valentín: los 3 PACK de Regular no van en "Todos los
   productos" (tapaban la grilla). Siguen en /sets. */
const p = (slug: string, category: string) => ({ slug, category, tags: [] as string[] });
const catalogo = [
  p('regular-tees-3-pack-red-black-navy', 'Pack'),
  p('regular-tees-3-pack-white', 'Pack'),
  p('regular-tee-red', 'Remera'),
  p('half-zip-polo-melange', 'Polo'),
  p('camo-set', 'Set'),
];

describe('/productos sin los 3 PACK de Regular', () => {
  it('saca todos los colorways de pack, incluso los que se sumen después', () => {
    const slugs = productsForCategory(catalogo, getCategoryConfig('/productos')!).map((x) => x.slug);
    expect(slugs).toEqual(['regular-tee-red', 'half-zip-polo-melange', 'camo-set']);
  });
  it('los packs siguen en /sets', () => {
    const slugs = productsForCategory(catalogo, getCategoryConfig('/sets')!).map((x) => x.slug);
    expect(slugs).toContain('regular-tees-3-pack-red-black-navy');
    expect(slugs).toContain('regular-tees-3-pack-white');
  });
});
