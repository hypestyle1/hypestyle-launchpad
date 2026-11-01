import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fromWPNode } from '@/lib/products-normalize';
import { normalizeProductDetail } from '@/lib/product-detail';
import { mysteryPortadas } from '@/lib/mystery';
describe('portadas Mystery sin imágenes Woo',()=>{
  it.each(['tees','longsleeves','hoodies'])('usa portadas oficiales en grilla y ficha: %s',id=>{
    const slug='mystery-'+id;
    const raw={id:'4187',slug,name:'Mystery',price:'25900',regularPrice:'25900',image:null,galleryImages:{nodes:[]},stockStatus:'IN_STOCK'};
    const expected=[`/mystery/portadas/${id}-a.webp`,`/mystery/portadas/${id}-b.webp`];
    expect(fromWPNode(raw).images).toEqual(expected);
    expect(normalizeProductDetail(raw).images).toEqual(expected);
    expect(fromWPNode(raw).image).toBe(expected[0]);
    for(const image of expected)expect(existsSync(join(process.cwd(),'public',image))).toBe(true);
    expect(fromWPNode(raw).price).toBe(25900);
  });
  it('respeta imágenes Woo existentes y no inventa imágenes para otros productos',()=>{
    expect(mysteryPortadas('otra-prenda')).toEqual([]);
    const raw={slug:'mystery-tees',name:'Mystery',price:'25900',regularPrice:'25900',image:{sourceUrl:'https://example.com/woo.webp'}};
    expect(fromWPNode(raw).images).toEqual(['https://example.com/woo.webp']);
    expect(normalizeProductDetail(raw).images).toEqual(['https://example.com/woo.webp']);
  });
});
