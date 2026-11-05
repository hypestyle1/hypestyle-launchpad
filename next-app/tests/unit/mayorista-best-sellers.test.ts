import { describe, it, expect } from 'vitest';
import { unitsByProduct } from '@/lib/mayorista-best-sellers';
import { sortCatalog } from '@/lib/mayorista-catalog-sort';

describe('más vendidos', () => {
  it('suma unidades pagadas y descarta regalos a $0', () => {
    const m = unitsByProduct([
      { line_items: [{ product_id: 1, quantity: 2, total: '50000' }, { product_id: 9, quantity: 1, total: '0.00' }] },
      { line_items: [{ product_id: 1, quantity: 1, total: '25000' }, { product_id: 2, quantity: 1, total: '30000' }] },
    ]);
    expect(m.get(1)).toBe(3);
    expect(m.get(2)).toBe(1);
    expect(m.has(9)).toBe(false);
  });

  it('ordena por ventas y deja lo no pedible al final', () => {
    const mk = (id: number, sales: number, stock: boolean): any => ({ id: String(id), productId: id, sales, sizes: ['M'], stock: { M: stock ? 'ok' : 'out' }, colors: [], colorAxis: false });
    const out = sortCatalog([mk(1, 1, true), mk(2, 9, false), mk(3, 5, true)], 'mas-vendidos');
    expect(out[0].productId).toBe(3);
  });
});
