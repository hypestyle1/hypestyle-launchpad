import { describe, it, expect } from 'vitest';
import { suggestForCart, designWords, groupOf } from '@/lib/cart-suggestions';
import type { NormalizedProduct } from '@/lib/products-normalize';

function product(slug: string, category: string, extra: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    id: slug, slug, name: slug, category, price: 50000,
    image: '', images: [''], href: `/producto/${slug}/`,
    sizes: ['S', 'M'], stock: { S: 'ok', M: 'ok' }, tags: [],
    ...extra,
  };
}

const CATALOG: NormalizedProduct[] = [
  product('hoodie-grey-hstars', 'Hoodie', { tags: ['fw26', 'new-in'] }),
  product('sweatpant-grey-hstars', 'Pantalón', { tags: ['new-in'] }),
  product('hoodie-black-hstars', 'Hoodie', { tags: ['fw26', 'new-in'] }),
  product('sweatpant-black-hstars', 'Pantalón', { tags: ['fw26', 'new-in'] }),
  product('zip-hoodie-camo', 'Hoodie', { tags: ['camo-set-drop', 'new-in'] }),
  product('sweatpant-camo', 'Pantalón', { tags: ['camo-set-drop', 'new-in'] }),
  product('camo-cap', 'Accesorio', { tags: ['camo-set-drop', 'new-in'], sizes: ['Única'], stock: { 'Única': 'ok' } }),
  product('camo-full-set-combo', 'Set', { tags: ['camo-set-drop', 'fw26', 'new-in'] }),
  product('honda-black-tee', 'Remera', { tags: ['best-seller'] }),
  product('skyline-tee', 'Remera', { tags: ['best-seller'] }),
  product('pack-x3-medias-hype', 'Accesorio', { sizes: ['Única'], stock: { 'Única': 'ok' } }),
];

// Desempate fijo: respeta el orden del catálogo.
const fixed = () => 0;
const slugs = (ps: NormalizedProduct[]) => ps.map(p => p.slug);

describe('designWords', () => {
  it('saca prenda y color y deja el diseño', () => {
    expect(designWords('hoodie-grey-hstars')).toEqual(['hstars']);
    expect(designWords('sweatpant-grey-hstars')).toEqual(['hstars']);
    expect(designWords('zip-hoodie-camo')).toEqual(['camo']);
  });

  it('un producto que solo tiene prenda y color no tiene diseño', () => {
    expect(designWords('hoodie-pink')).toEqual([]);
    expect(designWords('regular-tee-black')).toEqual([]);
  });
});

describe('groupOf', () => {
  it('lee las categorías como vienen de Woo, con cualquier mayúscula', () => {
    expect(groupOf({ category: 'JORT' })).toBe('bottom');
    expect(groupOf({ category: 'Pantalón' })).toBe('bottom');
    expect(groupOf({ category: 'Remera' })).toBe('top');
    expect(groupOf({ category: 'SWEATER' })).toBe('top');
    expect(groupOf({ category: '' })).toBe('other');
  });
});

describe('suggestForCart', () => {
  it('primero la otra mitad del conjunto, en el mismo color', () => {
    const out = suggestForCart([{ id: 'sweatpant-grey-hstars' }], CATALOG, 4, fixed);
    expect(out[0].slug).toBe('hoodie-grey-hstars');
    // Después el mismo diseño en el otro color.
    expect(out[1].slug).toBe('hoodie-black-hstars');
  });

  it('no ofrece la misma prenda en otro color antes que algo que complemente', () => {
    const out = slugs(suggestForCart([{ id: 'sweatpant-grey-hstars' }], CATALOG, 4, fixed));
    expect(out).not.toContain('sweatpant-grey-hstars');
    expect(out.indexOf('sweatpant-black-hstars')).toBe(-1);
  });

  it('no ofrece el combo que incluye lo que ya está en el carrito', () => {
    const out = slugs(suggestForCart([{ id: 'zip-hoodie-camo' }], CATALOG, 10, fixed));
    expect(out).not.toContain('camo-full-set-combo');
    expect(out[0]).toBe('sweatpant-camo');
    expect(out[1]).toBe('camo-cap');
  });

  it('en los lisos el conjunto lo arma el color', () => {
    const catalog = [
      ...CATALOG,
      product('hoodie-pink', 'Hoodie'),
      product('sweatpant-pink', 'Pantalón'),
      product('regular-tee-black', 'Remera'),
    ];
    const out = slugs(suggestForCart([{ id: 'sweatpant-pink' }], catalog, 4, fixed));
    expect(out[0]).toBe('hoodie-pink');
  });

  it('la misma prenda en otro color no suma por ser del mismo drop', () => {
    const catalog = [
      ...CATALOG,
      product('napoli-tee-azul', 'Remera', { tags: ['napoli'] }),
      product('napoli-tee-blanca', 'Remera', { tags: ['napoli'] }),
    ];
    const out = slugs(suggestForCart([{ id: 'napoli-tee-azul' }], catalog, 4, fixed));
    expect(out).not.toContain('napoli-tee-blanca');
  });

  it('nunca ofrece algo sin talles disponibles', () => {
    const catalog = CATALOG.map(p =>
      p.slug === 'hoodie-grey-hstars' ? { ...p, stock: { S: 'out' as const, M: 'out' as const } } : p,
    );
    const out = slugs(suggestForCart([{ id: 'sweatpant-grey-hstars' }], catalog, 10, fixed));
    expect(out).not.toContain('hoodie-grey-hstars');
  });

  it('con varias prendas en el carrito, no repite ninguna', () => {
    const cart = [{ id: 'hoodie-grey-hstars' }, { id: 'sweatpant-grey-hstars' }];
    const out = slugs(suggestForCart(cart, CATALOG, 10, fixed));
    expect(out).not.toContain('hoodie-grey-hstars');
    expect(out).not.toContain('sweatpant-grey-hstars');
  });

  it('el regalo por compra no cuenta como prenda del carrito', () => {
    const cart = [{ id: 'camo-cap', isGift: true }];
    const out = slugs(suggestForCart(cart, CATALOG, 4, fixed));
    // Sin nada contra qué comparar, gana el best seller; y el regalo no se repite.
    expect(out[0]).toBe('honda-black-tee');
    expect(out).not.toContain('camo-cap');
  });

  it('con un producto que no está en el catálogo (gift card), rellena con best sellers', () => {
    const out = slugs(suggestForCart([{ id: 'gift-card' }], CATALOG, 2, fixed));
    expect(out).toEqual(['honda-black-tee', 'skyline-tee']);
  });

  it('respeta el límite', () => {
    expect(suggestForCart([{ id: 'zip-hoodie-camo' }], CATALOG, 3, fixed)).toHaveLength(3);
  });
});
