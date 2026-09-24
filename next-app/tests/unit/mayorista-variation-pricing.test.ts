import { describe, it, expect } from 'vitest';
import { findVariation, findUnavailable, type ResolvedProduct } from '@/lib/mayorista-stock';
import { priceLines, regularPriceFor } from '@/lib/mayorista-pricing';

// Bug del 24/09/2026 en producción: ONLY GOD CAN JUDGE ME (Color informativo,
// variaciones solo por Talle) devolvía "no tiene precio cargado" al confirmar
// porque el carrito manda `color: "Blanca"` y la variación no lo tiene. Estos
// tests fijan cómo se resuelve la variación y de dónde sale el regular_price.
//
// Cómo carga Woo los precios (verificado el 24/09 por WC REST):
//  - variable: el padre tiene regular_price = "" SIEMPRE; el precio vive en
//    cada variación. Una variación sin precio no es comprable en Woo.
//  - simple: el precio está en el producto.

const ok = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 3 };

// ONLY GOD — Blanca: Color informativo (atributo sin variación), regular $58.000, sale $56.000.
const onlyGod: ResolvedProduct = {
  product_id: 1044, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null,
  variations: [
    { id: 1096, options: ['s'], stock: ok, regularPrice: 58000 },
    { id: 1097, options: ['m'], stock: ok, regularPrice: 58000 },
    { id: 1098, options: ['l'], stock: ok, regularPrice: 58000 },
    { id: 1099, options: ['xl'], stock: { ...ok, stockQuantity: 0, stockStatus: 'outofstock' }, regularPrice: 58000 },
  ],
};
// LADYTRIBAL: sin color, regular $67.000 con sale $45.000 (liquidación retail).
const ladytribal: ResolvedProduct = {
  product_id: 29, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null,
  variations: [{ id: 30, options: ['s'], stock: ok, regularPrice: 67000 }, { id: 32, options: ['l'], stock: ok, regularPrice: 67000 }],
};
// SLEEVELESS RANGLAN: Color como EJE (talle + color por variación).
const ranglan: ResolvedProduct = {
  product_id: 1046, stock: { ...ok, manageStock: false, stockQuantity: null }, regularPrice: null,
  variations: [
    { id: 1, options: ['m', 'negro'], stock: ok, regularPrice: 45000 },
    { id: 2, options: ['m', 'blanco'], stock: ok, regularPrice: 45000 },
    { id: 3, options: ['l', 'negro'], stock: ok, regularPrice: 47000 }, // precio distinto al resto
  ],
};
// Camo Cap: simple, precio en el producto.
const cap: ResolvedProduct = { product_id: 924, stock: ok, regularPrice: 43000, variations: [] };
const resolved = new Map<string, ResolvedProduct | null>([['only-god-blanca', onlyGod], ['ladytribal', ladytribal], ['sleeveless-ranglan', ranglan], ['camo-cap', cap]]);

describe('findVariation — color informativo vs color como eje', () => {
  it('ONLY GOD Blanca / Negra: el color del carrito no bloquea, se resuelve por talle', () => {
    expect(findVariation(onlyGod, { size: 'M', color: 'Blanca' })?.id).toBe(1097);
    expect(findVariation(onlyGod, { size: 'S', color: 'Negra' })?.id).toBe(1096);
    expect(findVariation(onlyGod, { size: 'XL', color: 'Blanca' })?.id).toBe(1099);
    expect(findVariation(onlyGod, { size: 'L' })?.id).toBe(1098);
  });

  it('talle inexistente sigue sin variación', () => {
    expect(findVariation(onlyGod, { size: 'XXL', color: 'Blanca' })).toBeUndefined();
  });

  it('con Color como eje se exige talle + color, y un color que no existe no cae a otro', () => {
    expect(findVariation(ranglan, { size: 'M', color: 'Negro' })?.id).toBe(1);
    expect(findVariation(ranglan, { size: 'M', color: 'Blanco' })?.id).toBe(2);
    expect(findVariation(ranglan, { size: 'L', color: 'Blanco' })).toBeUndefined();
    expect(findVariation(ranglan, { size: 'M', color: 'Rojo' })).toBeUndefined();
  });

  it('el stock también se mira en la variación correcta (XL agotada de ONLY GOD)', () => {
    const u = findUnavailable([{ slug: 'only-god-blanca', name: 'ONLY GOD', size: 'XL', color: 'Blanca', quantity: 1 }], resolved);
    expect(u).toEqual([expect.objectContaining({ reason: 'out-of-stock' })]);
    expect(findUnavailable([{ slug: 'only-god-blanca', name: 'ONLY GOD', size: 'M', color: 'Blanca', quantity: 1 }], resolved)).toEqual([]);
  });
});

describe('regular_price canónico por SKU', () => {
  it('variable con regular propio en la variación: se usa ese', () => {
    expect(regularPriceFor(ladytribal, ladytribal.variations[0])).toBe(67000);
  });

  it('variable con variación sin precio: no hereda del padre (Woo tampoco la vende)', () => {
    const sinPrecio: ResolvedProduct = { ...ladytribal, variations: [{ id: 99, options: ['m'], stock: ok, regularPrice: null }] };
    expect(regularPriceFor(sinPrecio, sinPrecio.variations[0])).toBeNull();
    const r = priceLines([{ slug: 'x', name: 'x', size: 'M', quantity: 1, price: 1 }], new Map([['x', sinPrecio]]));
    expect(r.unpriced).toHaveLength(1);
  });

  it('fallback al padre solo cuando el padre tiene precio (producto simple)', () => {
    expect(regularPriceFor(cap)).toBe(43000);
    expect(regularPriceFor({ ...cap, regularPrice: null })).toBeNull();
  });

  it('variación con precio distinto al resto: se cobra el de ESA variación', () => {
    const r = priceLines([{ slug: 'sleeveless-ranglan', name: 'R', size: 'L', color: 'Negro', quantity: 1, price: 22500 }], resolved);
    expect(r.lines[0]).toMatchObject({ variationId: 3, unitPrice: 23500 });
    expect(r.changes[0]).toMatchObject({ before: 22500, after: 23500 });
  });

  it('variation_id de otro producto en el request se ignora', () => {
    const r = priceLines([{ slug: 'ladytribal', name: 'L', size: 'S', quantity: 1, price: 33500, variationId: 1097, variation_id: 1097 } as any], resolved);
    expect(r.lines[0]).toMatchObject({ productId: 29, variationId: 30, unitPrice: 33500 });
  });

  it('sale_price presente: el mayorista se calcula SIEMPRE sobre el regular', () => {
    // Ladytribal: regular $67.000, sale $45.000 → mayorista $33.500 (no $22.500).
    const r = priceLines([{ slug: 'ladytribal', name: 'L', size: 'L', quantity: 2, price: 33500 }], resolved);
    expect(r.lines[0]).toMatchObject({ unitPrice: 33500, lineTotal: 67000, changed: false });
    // ONLY GOD: regular $58.000, sale $56.000 → $29.000, con color informativo.
    const o = priceLines([{ slug: 'only-god-blanca', name: 'OG', size: 'M', color: 'Blanca', quantity: 1, price: 29000 }], resolved);
    expect(o.unpriced).toEqual([]);
    expect(o.lines[0]).toMatchObject({ variationId: 1097, unitPrice: 29000, changed: false });
  });
});
