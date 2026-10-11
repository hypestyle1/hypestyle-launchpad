import { describe, expect, it } from 'vitest';
import { repriceCart } from '@/lib/cart-reprice';
import type { CartItem } from '@/context/CartContext';

const linea = (over: Partial<CartItem>): CartItem => ({
  id: 'find-jesus-longsleeve',
  name: 'FIND JESUS LONGSLEEVE',
  price: 45000,
  image: '',
  size: 'XL',
  quantity: 1,
  ...over,
});

describe('repriceCart', () => {
  it('pisa el precio guardado con el del catálogo y lo informa (caso 10/10)', () => {
    const { items, cambios } = repriceCart([linea({})], new Map([['find-jesus-longsleeve', 67000]]));
    expect(items[0].price).toBe(67000);
    expect(cambios).toEqual([{ id: 'find-jesus-longsleeve', name: 'FIND JESUS LONGSLEEVE', size: 'XL', antes: 45000, ahora: 67000 }]);
  });

  it('también baja el precio si el catálogo bajó', () => {
    const { items, cambios } = repriceCart([linea({ price: 67000 })], new Map([['find-jesus-longsleeve', 45000]]));
    expect(items[0].price).toBe(45000);
    expect(cambios).toHaveLength(1);
  });

  it('sin cambios devuelve el mismo array (no re-renderiza ni re-guarda)', () => {
    const cart = [linea({ price: 67000 })];
    const res = repriceCart(cart, new Map([['find-jesus-longsleeve', 67000]]));
    expect(res.items).toBe(cart);
    expect(res.cambios).toEqual([]);
  });

  it('no toca el regalo, la gift card ni La Nuestra', () => {
    const cart = [
      linea({ id: 'purchase-gift:120', price: 0, isGift: true, locked: true }),
      linea({ id: 'gift-card', price: 50000 }),
      linea({ id: 'la-nuestra-jersey-mundial-26', price: 64000 }),
    ];
    const catalogo = new Map([
      ['purchase-gift:120', 9000],
      ['gift-card', 10000],
      ['la-nuestra-jersey-mundial-26', 95000],
    ]);
    const res = repriceCart(cart, catalogo);
    expect(res.items).toBe(cart);
    expect(res.cambios).toEqual([]);
  });

  it('deja como está lo que no está en el catálogo o tiene precio inválido', () => {
    const cart = [linea({ id: 'no-esta' }), linea({ id: 'cero' })];
    const res = repriceCart(cart, new Map([['cero', 0]]));
    expect(res.items).toBe(cart);
  });

  it('mantiene talle, cantidad y personalización de cada línea', () => {
    const cart = [linea({ quantity: 3, customization: { playerName: 'MESSI', number: '10' } })];
    const { items } = repriceCart(cart, new Map([['find-jesus-longsleeve', 67000]]));
    expect(items[0]).toMatchObject({ size: 'XL', quantity: 3, customization: { playerName: 'MESSI', number: '10' }, price: 67000 });
  });
});
