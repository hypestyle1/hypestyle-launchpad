import { describe, it, expect } from 'vitest';
import { isValidIdempotencyKey, ordersWithKey, replayOf, resolveDuplicate, newIdempotencyKey, IDEMPOTENCY_META } from '@/lib/mayorista-idempotency';

const KEY = '0f3c9a2e-5b7d-4e81-9c6a-1d2b3c4d5e6f';
const order = (id: number, over: Record<string, unknown> = {}) => ({
  id, number: String(id), status: 'on-hold', total: '100000.00',
  meta_data: [{ key: '_es_mayorista', value: 'true' }, { key: IDEMPOTENCY_META, value: KEY }],
  ...over,
});

describe('isValidIdempotencyKey', () => {
  it('acepta un UUID y rechaza basura', () => {
    expect(isValidIdempotencyKey(KEY)).toBe(true);
    expect(isValidIdempotencyKey(newIdempotencyKey())).toBe(true);
    expect(isValidIdempotencyKey('abc')).toBe(false);
    expect(isValidIdempotencyKey('x'.repeat(65))).toBe(false);
    expect(isValidIdempotencyKey('con espacios 1234567890')).toBe(false);
    expect(isValidIdempotencyKey(123)).toBe(false);
    expect(isValidIdempotencyKey(undefined)).toBe(false);
  });
});

describe('ordersWithKey', () => {
  it('solo las vivas con esa clave, de la más vieja a la más nueva', () => {
    const list = [order(5002), order(5001), order(4000, { status: 'cancelled' }), order(4001, { meta_data: [] }), order(4002, { meta_data: [{ key: IDEMPOTENCY_META, value: 'otra-clave-0123456789' }] })];
    expect(ordersWithKey(list, KEY).map(o => o.id)).toEqual([5001, 5002]);
    expect(ordersWithKey([], KEY)).toEqual([]);
  });
});

describe('replayOf', () => {
  it('devuelve número y total bruto (total de Woo + saldo a favor aplicado)', () => {
    expect(replayOf(order(7000))).toEqual({ id: 7000, number: '7000', total: 100000, creditUsed: 0 });
    const conCredito = order(7001, { total: '80000.00', meta_data: [{ key: IDEMPOTENCY_META, value: KEY }, { key: '_mayorista_credito_aplicado', value: '20000' }] });
    expect(replayOf(conCredito)).toEqual({ id: 7001, number: '7001', total: 100000, creditUsed: 20000 });
  });
});

describe('resolveDuplicate', () => {
  it('sin otra orden con la clave: nada que hacer', () => {
    expect(resolveDuplicate([order(5001)], KEY, 5001)).toEqual({ keep: expect.objectContaining({ id: 5001 }), cancel: null });
    expect(resolveDuplicate([], KEY, 5001)).toBeNull();
  });

  it('la nuestra es la más nueva: se cancela y se conserva la vieja', () => {
    const r = resolveDuplicate([order(5001), order(4999)], KEY, 5001);
    expect(r?.keep.id).toBe(4999);
    expect(r?.cancel?.id).toBe(5001);
  });

  it('la nuestra es la más vieja: se conserva (la otra se cancelará sola en su propio request)', () => {
    const r = resolveDuplicate([order(5001), order(5002)], KEY, 5001);
    expect(r?.keep.id).toBe(5001);
    expect(r?.cancel).toBeNull();
  });

  it('una duplicada ya cancelada no cuenta', () => {
    const r = resolveDuplicate([order(5001), order(4999, { status: 'cancelled' })], KEY, 5001);
    expect(r?.cancel).toBeNull();
  });
});
