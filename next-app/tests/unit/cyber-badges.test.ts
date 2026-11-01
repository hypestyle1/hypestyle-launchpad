import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { porcentajeDescuento } from '@/lib/descuento';
import { fromWPNode } from '@/lib/products-normalize';
import { normalizeProductDetail } from '@/lib/product-detail';

const node=(price:string,regularPrice:string,salePrice?:string)=>({id:'123',slug:'worn-varsity-club-white-tee',name:'Worn Varsity',price,regularPrice,salePrice,stockStatus:'IN_STOCK',stockQuantity:10});
describe('badge Cyber con precios efectivos Woo',()=>{
  it.each([[39900,65000,39],[34900,48000,27],[31950,63900,50],[25900,28900,10]])('redondea %s contra %s a %s%% solo para mostrar', (price,original,pct)=>{
    expect(porcentajeDescuento(price,original)).toBe(pct);
  });
  it('no muestra descuento sin referencia válida ni debajo de 5%',()=>{
    expect(porcentajeDescuento(39900)).toBeNull();
    expect(porcentajeDescuento(65000,65000)).toBeNull();
    expect(porcentajeDescuento(0,65000)).toBeNull();
    expect(porcentajeDescuento(9550,10000)).toBeNull();
  });
  it('grilla y ficha reciben el mismo precio y tachado efectivos',()=>{
    const grid=fromWPNode(node('39900','65000'));
    const detail=normalizeProductDetail(node('39900','65000'));
    expect(grid.price).toBe(39900);expect(detail.price).toBe(39900);
    expect(grid.originalPrice).toBe(65000);expect(detail.originalPrice).toBe(65000);
    expect(porcentajeDescuento(grid.price,grid.originalPrice)).toBe(39);
    expect(porcentajeDescuento(detail.price,detail.originalPrice)).toBe(39);
  });
  it('una salePrice programada no confirma una oferta efectiva',()=>{
    const raw=node('65000','65000','39900');
    expect(fromWPNode(raw).originalPrice).toBeUndefined();
    expect(normalizeProductDetail(raw).originalPrice).toBeUndefined();
  });
  it('el catálogo habilita la píldora existente y no usa referencias de preview en vivo',()=>{
    const src=readFileSync(join(process.cwd(),'components/cyber/CyberCatalogoEvento.tsx'),'utf8');
    expect(src).not.toMatch(/\s+mutedPrice\s/);
    expect(src).toContain('originalPrice={live.preview ? undefined : p.originalPrice}');
    expect(src).toContain('showDiscountBadge={!live.preview}');
    expect(src).toContain('pricePresentation={live.preview ?');
  });
});
