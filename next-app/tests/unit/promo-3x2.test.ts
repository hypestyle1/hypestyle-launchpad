import { describe, it, expect } from 'vitest';
import {
  compute3x2Discount,
  count3x2FreeUnits,
  unitsToNext3x2,
} from '@/lib/promo-3x2';

/**
 * 3x2: por cada 3 unidades, la MÁS BARATA de todo el carrito va gratis. El
 * riesgo acá es regalar de más — que el descuento supere lo que corresponde.
 */

describe('compute3x2Discount', () => {
  it('no descuenta abajo de 3 unidades', () => {
    expect(compute3x2Discount([{ price: 50000, quantity: 1 }])).toBe(0);
    expect(compute3x2Discount([{ price: 50000, quantity: 2 }])).toBe(0);
  });

  it('con 3 unidades iguales regala una', () => {
    expect(compute3x2Discount([{ price: 50000, quantity: 3 }])).toBe(50000);
  });

  it('regala la más barata del carrito, no la más barata de un sub-grupo', () => {
    const carrito = [
      { price: 100000, quantity: 1 },
      { price: 80000, quantity: 1 },
      { price: 20000, quantity: 1 },
    ];
    expect(compute3x2Discount(carrito)).toBe(20000);
  });

  it('con 6 unidades regala las 2 más baratas', () => {
    const carrito = [
      { price: 100000, quantity: 2 },
      { price: 60000, quantity: 2 },
      { price: 30000, quantity: 2 },
    ];
    expect(compute3x2Discount(carrito)).toBe(60000); // 30000 × 2
  });

  it('ignora el sobrante que no completa un grupo de 3', () => {
    // 5 unidades → 1 gratis, no 2.
    const carrito = [
      { price: 100000, quantity: 3 },
      { price: 10000, quantity: 2 },
    ];
    expect(compute3x2Discount(carrito)).toBe(10000);
  });

  it('cuenta las unidades de una línea, no la línea', () => {
    const porLinea = compute3x2Discount([{ price: 50000, quantity: 3 }]);
    const porUnidad = compute3x2Discount([
      { price: 50000, quantity: 1 },
      { price: 50000, quantity: 1 },
      { price: 50000, quantity: 1 },
    ]);
    expect(porLinea).toBe(porUnidad);
  });

  it('nunca descuenta más que el total del carrito', () => {
    const carrito = [
      { price: 40000, quantity: 4 },
      { price: 25000, quantity: 5 },
    ];
    const total = 40000 * 4 + 25000 * 5;
    const desc = compute3x2Discount(carrito);
    expect(desc).toBeGreaterThan(0);
    expect(desc).toBeLessThan(total);
  });

  it('devuelve un entero (los precios se cobran sin centavos)', () => {
    const desc = compute3x2Discount([{ price: 33333.33, quantity: 3 }]);
    expect(Number.isInteger(desc)).toBe(true);
  });

  it('un carrito vacío no descuenta', () => {
    expect(compute3x2Discount([])).toBe(0);
  });
});

describe('count3x2FreeUnits', () => {
  it('cuenta un gratis cada 3 unidades', () => {
    expect(count3x2FreeUnits([{ price: 1, quantity: 2 }])).toBe(0);
    expect(count3x2FreeUnits([{ price: 1, quantity: 3 }])).toBe(1);
    expect(count3x2FreeUnits([{ price: 1, quantity: 8 }])).toBe(2);
  });
});

describe('unitsToNext3x2', () => {
  it('indica cuánto falta para el próximo gratis', () => {
    expect(unitsToNext3x2([{ price: 1, quantity: 1 }])).toBe(2);
    expect(unitsToNext3x2([{ price: 1, quantity: 2 }])).toBe(1);
    expect(unitsToNext3x2([{ price: 1, quantity: 4 }])).toBe(2);
  });

  it('con un grupo justo pide 3 más, no 0', () => {
    // Si devolviera 0 el aviso del carrito diría "te falta 0" y quedaría trabado.
    expect(unitsToNext3x2([{ price: 1, quantity: 3 }])).toBe(3);
    expect(unitsToNext3x2([])).toBe(3);
  });
});
