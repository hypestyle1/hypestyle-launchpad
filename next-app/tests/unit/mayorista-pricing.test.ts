import { describe, it, expect } from 'vitest';
import { priceLines, wholesalePrice, regularPriceFor } from '@/lib/mayorista-pricing';
import type { ResolvedProduct } from '@/lib/mayorista-stock';

// Regla comercial: mayorista = 50% del PVP real (regular_price de Woo). El
// precio que manda el carrito nunca decide lo que se cobra.

const stock = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 10 };

// FAITH OVER EVERYTHING camo hoodie: PVP $96.000 → mayorista $48.000.
const hoodie: ResolvedProduct = {
  product_id: 2033, stock, regularPrice: null,
  variations: [
    { id: 2058, options: ['m'], stock, regularPrice: 96000 },
    { id: 2059, options: ['l'], stock, regularPrice: 96000 },
  ],
};
// Camo Cap (simple): PVP $43.000 → $21.500.
const cap: ResolvedProduct = { product_id: 924, stock, regularPrice: 43000, variations: [] };
// Producto variable con precio solo en el padre.
const parentPriced: ResolvedProduct = {
  product_id: 726, stock, regularPrice: 45000,
  variations: [{ id: 7261, options: ['m'], stock, regularPrice: null }],
};

const resolved = new Map<string, ResolvedProduct | null>([
  ['faith-over-everything-camo-hoodie', hoodie],
  ['camo-cap', cap],
  ['aerogrey-tees', parentPriced],
  ['producto-borrado', null],
]);

describe('wholesalePrice', () => {
  it('es el 50% del PVP real, redondeado', () => {
    expect(wholesalePrice(96000)).toBe(48000);
    expect(wholesalePrice(45000)).toBe(22500);
    expect(wholesalePrice(28001)).toBe(14001);
  });
});

describe('regularPriceFor', () => {
  it('prefiere el regular_price de la variación y cae al del producto', () => {
    expect(regularPriceFor(hoodie, hoodie.variations[1])).toBe(96000);
    expect(regularPriceFor(parentPriced, parentPriced.variations[0])).toBe(45000);
    expect(regularPriceFor(cap)).toBe(43000);
  });
  it('sin regular_price no hay precio (nunca 0)', () => {
    expect(regularPriceFor({ ...cap, regularPrice: 0 })).toBeNull();
    expect(regularPriceFor({ ...cap, regularPrice: null })).toBeNull();
  });
});

describe('priceLines — el servidor manda', () => {
  const line = (over: Record<string, unknown> = {}) => ({
    slug: 'faith-over-everything-camo-hoodie', name: 'FAITH OVER EVERYTHING - CAMO HOODIE', size: 'L', quantity: 2, price: 48000, ...over,
  });

  it('con el precio vigente en el carrito no hay cambios', () => {
    const r = priceLines([line()], resolved);
    expect(r.changes).toEqual([]);
    expect(r.lines[0]).toMatchObject({ productId: 2033, variationId: 2059, unitPrice: 48000, lineTotal: 96000, changed: false });
    expect(r.total).toBe(96000);
  });

  it('precio $1 en el request: se cobra $48.000 igual y se marca el cambio', () => {
    const r = priceLines([line({ price: 1 })], resolved);
    expect(r.lines[0].unitPrice).toBe(48000);
    expect(r.lines[0].lineTotal).toBe(96000);
    expect(r.changes).toEqual([expect.objectContaining({ before: 1, after: 48000, quantity: 2 })]);
  });

  it('precio viejo de un carrito anterior (PVP subió): se cobra el vigente', () => {
    // El hoodie se vendía a $44.500 cuando el PVP era $89.000.
    const r = priceLines([line({ price: 44500 })], resolved);
    expect(r.lines[0].unitPrice).toBe(48000);
    expect(r.changes[0]).toMatchObject({ before: 44500, after: 48000 });
  });

  it('precio mayor al vigente: tampoco se acepta (no se cobra de más)', () => {
    const r = priceLines([line({ price: 57500 })], resolved);
    expect(r.lines[0].unitPrice).toBe(48000);
    expect(r.total).toBe(96000);
    expect(r.changes[0]).toMatchObject({ before: 57500, after: 48000 });
  });

  it('precio no numérico o ausente cuenta como cambio', () => {
    expect(priceLines([line({ price: 'gratis' })], resolved).changes[0].before).toBeNull();
    expect(priceLines([line({ price: undefined })], resolved).changes[0].before).toBeNull();
    expect(priceLines([line({ price: -5 })], resolved).lines[0].unitPrice).toBe(48000);
  });

  it('producto inexistente: queda en unpriced, no en la orden', () => {
    const r = priceLines([line({ slug: 'producto-borrado' })], resolved);
    expect(r.lines).toEqual([]);
    expect(r.unpriced).toEqual([expect.objectContaining({ slug: 'producto-borrado' })]);
    expect(r.total).toBe(0);
  });

  it('variation_id de otro producto en el request: se ignora, la variación sale de talle + color', () => {
    // El navegador manda la variación del Camo Cap junto con el slug del hoodie.
    const r = priceLines([line({ variationId: 924, variation_id: 924 }) as any], resolved);
    expect(r.lines[0].variationId).toBe(2059);
    expect(r.lines[0].productId).toBe(2033);
    expect(r.lines[0].unitPrice).toBe(48000);
  });

  it('talle inexistente: sin variación, precio del padre si lo hay; si no, unpriced', () => {
    const conPadre = priceLines([{ slug: 'aerogrey-tees', name: 'AEROGREY', size: 'M', quantity: 1, price: 22500 }], resolved);
    expect(conPadre.lines[0]).toMatchObject({ variationId: 7261, unitPrice: 22500, changed: false });
    const sinPrecio = priceLines([line({ size: 'XXXL' })], resolved);
    expect(sinPrecio.lines).toEqual([]);
    expect(sinPrecio.unpriced).toHaveLength(1);
  });

  it('cantidad se normaliza a entero ≥ 1', () => {
    expect(priceLines([line({ quantity: 0 })], resolved).lines[0].quantity).toBe(1);
    expect(priceLines([line({ quantity: 2.7 })], resolved).lines[0].quantity).toBe(2);
    expect(priceLines([line({ quantity: 'x' })], resolved).lines[0].lineTotal).toBe(48000);
  });

  it('el total es la suma de líneas a precio de servidor, aunque el carrito diga otra cosa', () => {
    const r = priceLines([line({ price: 1 }), { slug: 'camo-cap', name: 'Camo Cap', size: 'Única', quantity: 3, price: 999999 }], resolved);
    expect(r.total).toBe(48000 * 2 + 21500 * 3);
    expect(r.changes).toHaveLength(2);
  });
});
