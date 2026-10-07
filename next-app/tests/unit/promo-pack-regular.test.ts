import { describe, it, expect } from 'vitest';
import {
  computePackRegularDiscount,
  packRegularFaltan,
  precioPackRegular,
} from '@/lib/promo-pack-regular';

/**
 * Pack libre: 3 Regular Tees individuales de cualquier color = precio del
 * 3-PACK. El riesgo es descontar de más (contar packs o productos que no son
 * Regular) o quedar más caro que el pack fijo.
 */
const PACK = 59160;
const black = (q: number) => ({ id: 'regular-tee-black', price: 23400, quantity: q });
const white = (q: number) => ({ id: 'regular-tee-white', price: 23400, quantity: q });

describe('computePackRegularDiscount', () => {
  it('2 negras + 1 blanca pagan lo mismo que el pack', () => {
    expect(computePackRegularDiscount([black(2), white(1)], PACK)).toBe(23400 * 3 - PACK);
  });

  it('menos de 3 no descuenta', () => {
    expect(computePackRegularDiscount([black(1), white(1)], PACK)).toBe(0);
  });

  it('6 son 2 packs; 4 son 1 pack + 1 suelta', () => {
    expect(computePackRegularDiscount([black(4), white(2)], PACK)).toBe((23400 * 3 - PACK) * 2);
    expect(computePackRegularDiscount([black(4)], PACK)).toBe(23400 * 3 - PACK);
  });

  it('solo cuentan las Regular individuales, no los packs ni otros productos', () => {
    const otros = [
      { id: 'regular-tees-3-pack-black', price: PACK, quantity: 1 },
      { id: 'boxy-tee', price: 23400, quantity: 2 },
      black(1),
    ];
    expect(computePackRegularDiscount(otros, PACK)).toBe(0);
  });

  it('sin precio de pack en el catálogo no hay descuento', () => {
    expect(computePackRegularDiscount([black(3)], null)).toBe(0);
  });

  it('nunca negativo si las individuales están más baratas que el pack', () => {
    expect(computePackRegularDiscount([{ id: 'regular-tee-navy', price: 15000, quantity: 3 }], PACK)).toBe(0);
  });
});

describe('packRegularFaltan', () => {
  it('cuenta cuántas faltan para cerrar el próximo pack', () => {
    expect(packRegularFaltan([])).toBe(0);
    expect(packRegularFaltan([black(1)])).toBe(2);
    expect(packRegularFaltan([black(1), white(1)])).toBe(1);
    expect(packRegularFaltan([black(3)])).toBe(0);
    expect(packRegularFaltan([black(4)])).toBe(2);
  });
});

describe('precioPackRegular', () => {
  it('lee el 3-PACK Black de un Map o de una lista de productos', () => {
    expect(precioPackRegular(new Map([['regular-tees-3-pack-black', PACK]]))).toBe(PACK);
    expect(precioPackRegular([{ slug: 'regular-tees-3-pack-black', price: PACK }])).toBe(PACK);
    expect(precioPackRegular([])).toBeNull();
  });
});
