import { describe, it, expect } from 'vitest';
import { unavailableReason, unavailableMessage } from '@/lib/mayorista-availability';

const published = { status: 'publish', stockStatus: 'instock', manageStock: false, stockQuantity: null };

describe('unavailableReason', () => {
  it('deja pasar un producto publicado con stock', () => {
    expect(unavailableReason(published, null, 3)).toBeNull();
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: true, stockQuantity: 5 }, 3)).toBeNull();
  });

  it('rechaza un producto privado aunque la variación diga instock', () => {
    const priv = { ...published, status: 'private' };
    expect(unavailableReason(priv, { stockStatus: 'instock', manageStock: true, stockQuantity: 9 }, 1))
      .toEqual({ reason: 'not-published' });
    expect(unavailableReason({ ...published, status: 'trash' }, null, 1)).toEqual({ reason: 'not-published' });
  });

  it('caso 07/09: SHOOT FOR THE STARS talle M — privado, outofstock, stock 0', () => {
    const product = { status: 'private', stockStatus: 'outofstock', manageStock: false, stockQuantity: null };
    const m = { stockStatus: 'outofstock', manageStock: true, stockQuantity: 0 };
    expect(unavailableReason(product, m, 1)).not.toBeNull();
    // Y aunque estuviera publicado, el talle sin stock tampoco pasa.
    expect(unavailableReason({ ...product, status: 'publish' }, m, 1)).toEqual({ reason: 'out-of-stock' });
  });

  it('rechaza por stock de la variación cuando la maneja ella', () => {
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: true, stockQuantity: 0 }, 1))
      .toEqual({ reason: 'out-of-stock' });
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: true, stockQuantity: 2 }, 5))
      .toEqual({ reason: 'insufficient', available: 2 });
  });

  it('usa el stock del padre cuando la variación delega ("parent")', () => {
    const parent = { ...published, manageStock: true, stockQuantity: 1 };
    const v = { stockStatus: 'instock', manageStock: 'parent', stockQuantity: null };
    expect(unavailableReason(parent, v, 1)).toBeNull();
    expect(unavailableReason(parent, v, 2)).toEqual({ reason: 'insufficient', available: 1 });
  });

  it('outofstock de la variación manda aunque el padre esté instock', () => {
    expect(unavailableReason(published, { stockStatus: 'outofstock', manageStock: 'parent', stockQuantity: null }, 1))
      .toEqual({ reason: 'out-of-stock' });
  });

  it('sin stock gestionado, instock alcanza (accesorios, "Única")', () => {
    expect(unavailableReason({ status: 'publish', stockStatus: 'instock', manageStock: false }, null, 40)).toBeNull();
  });
});

describe('unavailableMessage', () => {
  it('nombra el talle salvo que sea Única', () => {
    expect(unavailableMessage('SHOOT FOR THE STARS - HOODIE', 'M', { reason: 'out-of-stock' }))
      .toBe('SHOOT FOR THE STARS - HOODIE (talle M) se quedó sin stock.');
    expect(unavailableMessage('Chain Hype', 'Única', { reason: 'not-published' }))
      .toBe('Chain Hype ya no está disponible en el catálogo.');
    expect(unavailableMessage('Camo Cap', 'única', { reason: 'insufficient', available: 2 }))
      .toBe('Camo Cap: quedan 2 unidades.');
  });
});

import { findUnavailable, findVariation, type ResolvedProduct } from '@/lib/mayorista-stock';

describe('findUnavailable', () => {
  const hoodie: ResolvedProduct = {
    product_id: 2351,
    stock: { status: 'private', stockStatus: 'outofstock', manageStock: false, stockQuantity: null },
    variations: [
      { id: 2355, options: ['m', 'boxy'], stock: { stockStatus: 'outofstock', manageStock: true, stockQuantity: 0 } },
      { id: 2356, options: ['l', 'boxy'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 3 } },
    ],
  };
  const tee: ResolvedProduct = {
    product_id: 1,
    stock: { status: 'publish', stockStatus: 'instock', manageStock: false, stockQuantity: null },
    variations: [
      { id: 11, options: ['l', 'negra'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 2 } },
      { id: 12, options: ['l', 'blanca'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 10 } },
    ],
  };
  const resolved = new Map<string, ResolvedProduct | null>([['shoot-for-the-stars', hoodie], ['tee', tee], ['borrado', null]]);

  it('marca el hoodie privado, el talle sin stock, el borrado y la cantidad excedida', () => {
    const out = findUnavailable([
      { slug: 'shoot-for-the-stars', name: 'SHOOT FOR THE STARS - HOODIE', size: 'M', quantity: 1 },
      { slug: 'tee', name: 'TEE', size: 'L', color: 'Negra', quantity: 5 },
      { slug: 'tee', name: 'TEE', size: 'L', color: 'Blanca', quantity: 5 },
      { slug: 'borrado', name: 'VIEJO', size: 'S', quantity: 1 },
    ], resolved);
    expect(out.map(u => [u.slug, u.color ?? '', u.reason, u.available ?? null])).toEqual([
      ['shoot-for-the-stars', '', 'not-published', null],
      ['tee', 'Negra', 'insufficient', 2],
      ['borrado', '', 'not-published', null],
    ]);
    expect(out[1].message).toBe('TEE (talle L): quedan 2 unidades.');
  });

  it('findVariation exige talle Y color', () => {
    expect(findVariation(tee, { size: 'L', color: 'Blanca' })?.id).toBe(12);
    expect(findVariation(tee, { size: 'L' })?.id).toBe(11);
    expect(findVariation(hoodie, { size: 'XL' })).toBeUndefined();
  });
});
