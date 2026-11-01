import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
vi.mock('next/image',()=>({default:({src,alt}:any)=>React.createElement('img',{src,alt}),getImageProps:()=>({props:{src:'/test.webp'}})}));
vi.mock('@/context/LocaleContext',()=>({useLocale:()=>({formatPrice:(p:number)=>String(p),t:(s:string)=>s})}));
vi.mock('@/context/CartContext',()=>({useCart:()=>({add:vi.fn(),setDrawerOpen:vi.fn()})}));
vi.mock('@/context/WishlistContext',()=>({useWishlist:()=>({toggle:vi.fn(),has:()=>false})}));
vi.mock('@/hooks/useCriticalPainted',()=>({useCriticalPainted:()=>true}));
import ProductCard from '@/components/ProductCard';
import { Precio } from '@/app/producto/[slug]/ficha/bloques';
const props={id:'worn-varsity-club-white-tee',name:'Worn Varsity White',category:'Tee',price:39900,originalPrice:65000,badge:'−39%',image:'/test.webp',sizes:['M'],stock:{M:'ok' as const}};
describe('una sola píldora de descuento por producto',()=>{
  it.each([false,true])('grilla general/Cyber dense=%s conserva una sola píldora',dense=>{
    const html=renderToStaticMarkup(React.createElement(ProductCard,{...props,dense}));
    expect(html.match(/−39%/g)).toHaveLength(1);
    expect(html.match(/bg-destructive/g)).toHaveLength(1);
    expect(html).toContain('65000');expect(html).toContain('39900');expect(html).toContain('line-through');
  });
  it('no esconde etiquetas editoriales cuando hay un descuento',()=>{
    const html=renderToStaticMarkup(React.createElement(ProductCard,{...props,badge:'New In'}));
    expect(html).toContain('New In');expect(html.match(/−39%/g)).toHaveLength(1);
  });
  it('no conserva un porcentaje recibido si no hay oferta efectiva confirmada',()=>{
    const html=renderToStaticMarkup(React.createElement(ProductCard,{...props,price:65000,originalPrice:undefined}));
    expect(html).not.toContain('−39%');
  });
  it('la ficha conserva el precio, el tachado y una píldora, sin el porcentaje redundante',()=>{
    const html=renderToStaticMarkup(React.createElement(Precio,{p:{mounted:true,displayPrice:39900,displayOriginal:65000} as any}));
    expect(html.match(/−39%/g)).toHaveLength(1);expect(html.match(/bg-destructive/g)).toHaveLength(1);
    const source=readFileSync(join(process.cwd(),'app/producto/[slug]/ficha/Ficha.tsx'),'utf8');
    expect(source).not.toContain('<Descuento ');expect(source.match(/<Precio /g)).toHaveLength(1);
  });
});
