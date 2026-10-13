import { describe, it, expect } from 'vitest';
import { unavailableReason, unavailableMessage } from '@/lib/mayorista-availability';

const published = { status: 'publish', stockStatus: 'instock', manageStock: false, stockQuantity: null };
const managed = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 12 };

describe('unavailableReason', () => {
  it('deja pasar un producto publicado con stock cargado', () => {
    expect(unavailableReason(managed, null, 3)).toBeNull();
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: true, stockQuantity: 5 }, 3)).toBeNull();
  });

  // 13/10/2026: ocho modelos del drop SS27 estaban publicados sin gestión de
  // stock y el portal los ofrecía como ilimitados. Con requireConfirmedStock
  // (regla del portal mayorista, lib/mayorista-stock.ts) sin cantidad no hay venta.
  const strict = { requireConfirmedStock: true };
  it('mayorista: sin stock gestionado NO alcanza con instock, queda "sin confirmar"', () => {
    expect(unavailableReason({ status: 'publish', stockStatus: 'instock', manageStock: false }, null, 1, strict)).toEqual({ reason: 'unconfirmed' });
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: false, stockQuantity: null }, 1, strict)).toEqual({ reason: 'unconfirmed' });
    // Variación que delega en un padre que tampoco gestiona.
    expect(unavailableReason(published, { stockStatus: 'instock', manageStock: 'parent', stockQuantity: null }, 1, strict)).toEqual({ reason: 'unconfirmed' });
    // manage_stock true pero sin cantidad legible: tampoco.
    expect(unavailableReason({ ...managed, stockQuantity: null }, null, 1, strict)).toEqual({ reason: 'unconfirmed' });
    // Con cantidad cargada, igual que siempre.
    expect(unavailableReason(managed, null, 12, strict)).toBeNull();
    expect(unavailableReason(managed, null, 13, strict)).toEqual({ reason: 'insufficient', available: 12 });
  });

  it('mayorista: tag "proximamente" se ve pero no se vende, aunque tenga stock', () => {
    expect(unavailableReason({ ...managed, comingSoon: true }, null, 1, strict)).toEqual({ reason: 'coming-soon' });
    expect(unavailableReason({ ...published, comingSoon: true }, { stockStatus: 'instock', manageStock: true, stockQuantity: 7 }, 1, strict)).toEqual({ reason: 'coming-soon' });
    // Privado manda sobre próximamente.
    expect(unavailableReason({ ...managed, status: 'private', comingSoon: true }, null, 1, strict)).toEqual({ reason: 'not-published' });
  });

  it('minorista (repago, sin la opción): instock sin gestión alcanza y próximamente no frena', () => {
    expect(unavailableReason({ status: 'publish', stockStatus: 'instock', manageStock: false }, null, 40)).toBeNull();
    expect(unavailableReason({ ...managed, comingSoon: true }, null, 1)).toBeNull();
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

  it('mayorista: accesorio "Única" con cantidad cargada pasa; sin cantidad, no', () => {
    expect(unavailableReason({ status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 28 }, null, 20, strict)).toBeNull();
    expect(unavailableReason({ status: 'publish', stockStatus: 'instock', manageStock: false }, null, 40, strict)).toEqual({ reason: 'unconfirmed' });
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
    expect(unavailableMessage('UNIVERSITY TEE', 'M', { reason: 'unconfirmed' }))
      .toBe('UNIVERSITY TEE (talle M) no tiene stock confirmado todavía.');
    expect(unavailableMessage('EQUESTRIAN LONGSLEEVE', 'L', { reason: 'coming-soon' }))
      .toBe('EQUESTRIAN LONGSLEEVE (talle L) todavía no está a la venta.');
  });
});

import { findUnavailable, findVariation, type ResolvedProduct } from '@/lib/mayorista-stock';

describe('findUnavailable', () => {
  const hoodie: ResolvedProduct = {
    product_id: 2351, regularPrice: null,
    stock: { status: 'private', stockStatus: 'outofstock', manageStock: false, stockQuantity: null },
    variations: [
      { id: 2355, options: ['m', 'boxy'], stock: { stockStatus: 'outofstock', manageStock: true, stockQuantity: 0 }, regularPrice: null },
      { id: 2356, options: ['l', 'boxy'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 3 }, regularPrice: null },
    ],
  };
  const tee: ResolvedProduct = {
    product_id: 1, regularPrice: null,
    stock: { status: 'publish', stockStatus: 'instock', manageStock: false, stockQuantity: null },
    variations: [
      { id: 11, options: ['l', 'negra'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 2 }, regularPrice: null },
      { id: 12, options: ['l', 'blanca'], stock: { stockStatus: 'instock', manageStock: true, stockQuantity: 10 }, regularPrice: null },
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
