import { describe, expect, it } from 'vitest';
import { cyberCardPrice, cyberCatalogOrder, cyberCategoryMatches, CYBER_INITIAL_COUNT, CYBER_EXPANDED_COUNT } from '@/lib/cyber-catalog-view';
import type { NormalizedProduct } from '@/lib/products-normalize';
const product = (slug: string, stock: 'ok' | 'out' = 'ok'): NormalizedProduct => ({ slug, id: slug, name: slug, category: 'Tee', price: 25900, image: '/test.webp', images: ['/test.webp'], href: '/producto/' + slug, sizes: ['M'], tags: [], stock: { M: stock } });
describe('catálogo Cyber', () => {
  it('abre con 24 y agrega exactamente 12 sin perder ni duplicar productos', () => {
    const data = Array.from({length:50},(_,i)=>product(String(i)));
    const ordered = cyberCatalogOrder(data,['3','1','5']);
    expect(ordered.slice(0,CYBER_INITIAL_COUNT)).toHaveLength(24);
    expect(ordered.slice(0,CYBER_EXPANDED_COUNT)).toHaveLength(36);
    expect(ordered.slice(CYBER_INITIAL_COUNT,CYBER_EXPANDED_COUNT)).toHaveLength(12);
    expect(new Set(ordered.map(p=>p.slug)).size).toBe(50);
    expect(ordered.slice(0,3).map(p=>p.slug)).toEqual(['3','1','5']);
  });
  it('manda agotados al final sin esconderlos ni alterar el catálogo fuente', () => {
    const data=[product('a','out'),product('b'),product('c')];
    expect(cyberCatalogOrder(data,['a','c']).map(p=>p.slug)).toEqual(['c','b','a']);
    expect(data[0].slug).toBe('a');
  });
  it.each(['Pantalón','Jort','Short','Shorts','Bermuda','Bermudas','Pants'])('Bottoms incluye %s',category=>{
    expect(cyberCategoryMatches(category,{id:'bottoms',cats:[]})).toBe(true);
  });
  it('Bottoms excluye accesorios y tops',()=>{
    for(const category of ['Accesorio','Tee','Hoodie','Pack']) expect(cyberCategoryMatches(category,{id:'bottoms',cats:[]})).toBe(false);
  });
  it('antes de las 19 muestra preview sin convertirlo en el precio real',()=>{
    const real=28900;
    expect(cyberCardPrice(real,{price:25900,originalPrice:28900},true)).toEqual({price:25900,originalPrice:28900});
    expect(real).toBe(28900);
  });
  it('fuera de preview manda el precio Woo, nunca el precio programado del snapshot',()=>{
    const reference={price:25900,originalPrice:28900};
    expect(cyberCardPrice(24900,reference,false)).toEqual({price:24900,originalPrice:28900});
    expect(cyberCardPrice(28900,reference,false)).toBeUndefined();
    expect(cyberCardPrice(10000,undefined,false)).toBeUndefined();
  });
});
