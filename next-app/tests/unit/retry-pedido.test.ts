import { describe, it, expect } from 'vitest';
import { puedeReusarPedido, firmaCarrito } from '@/lib/retry-pedido';

/**
 * Reutilización de pedidos en reintentos (auditoría 17/10). El contrato es
 * conservador a propósito: ante cualquier duda, pedido nuevo. Lo que NO se
 * puede reusar nunca (pagado, cancelado, otra sesión, otro carrito, otro
 * total) importa más que lo que sí.
 */
const base = {
  id: 3992,
  number: '3992',
  status: 'pending',
  created_via: 'rest-api',
  order_key: 'wc_order_abc123',
  date_created_gmt: new Date().toISOString().slice(0, 19),
  billing: { email: 'juan@gmail.com' },
  line_items: [{ product_id: 10, variation_id: 55, quantity: 1, total: '67000.00' }],
  total: '73408.00',
};

const args = {
  pedido: base,
  orderKey: 'wc_order_abc123',
  email: 'juan@gmail.com',
  lineasNuevas: [{ product_id: 10, variation_id: 55, quantity: 1, total: '67000' }],
  totalNuevo: 73408,
  conCupon: false,
};

describe('puedeReusarPedido', () => {
  it('mismo carrito, mismo total, misma sesión → se reusa', () => {
    expect(puedeReusarPedido(args).reusar).toBe(true);
  });

  it('el email se compara sin distinguir mayúsculas', () => {
    expect(puedeReusarPedido({ ...args, email: 'Juan@Gmail.com' }).reusar).toBe(true);
  });

  it.each(['processing', 'completed', 'cancelled', 'failed', 'refunded', 'on-hold'])(
    'un pedido %s nunca se reusa',
    (status) => {
      expect(puedeReusarPedido({ ...args, pedido: { ...base, status } }).reusar).toBe(false);
    },
  );

  it('order_key de otra sesión no se reusa', () => {
    expect(puedeReusarPedido({ ...args, orderKey: 'wc_order_otra' }).reusar).toBe(false);
    expect(puedeReusarPedido({ ...args, orderKey: '' }).reusar).toBe(false);
  });

  it('email distinto no se reusa (aunque sepan el id y la key)', () => {
    expect(puedeReusarPedido({ ...args, email: 'otro@gmail.com' }).reusar).toBe(false);
  });

  it('si cambió el carrito, pedido nuevo', () => {
    const otraCantidad = [{ product_id: 10, variation_id: 55, quantity: 2, total: '134000' }];
    expect(puedeReusarPedido({ ...args, lineasNuevas: otraCantidad, totalNuevo: 140408 }).reusar).toBe(false);
    const otroTalle = [{ product_id: 10, variation_id: 56, quantity: 1, total: '67000' }];
    expect(puedeReusarPedido({ ...args, lineasNuevas: otroTalle }).reusar).toBe(false);
  });

  it('si cambió el total (otro envío o el 10% de transferencia), pedido nuevo', () => {
    expect(puedeReusarPedido({ ...args, totalNuevo: 66700 }).reusar).toBe(false);
  });

  it('con cupón no se reusa: el cupo lo resuelve Woo al crear', () => {
    expect(puedeReusarPedido({ ...args, conCupon: true }).reusar).toBe(false);
  });

  it('un pedido de hace más de 24 h no se reusa', () => {
    const viejo = { ...base, date_created_gmt: new Date(Date.now() - 30 * 3600_000).toISOString().slice(0, 19) };
    expect(puedeReusarPedido({ ...args, pedido: viejo }).reusar).toBe(false);
  });

  it('un pedido que no creó el checkout (carga manual, mayorista) no se reusa', () => {
    expect(puedeReusarPedido({ ...args, pedido: { ...base, created_via: 'admin-manual' } }).reusar).toBe(false);
  });

  it('el motivo explica por qué no se reusó', () => {
    expect(puedeReusarPedido({ ...args, pedido: { ...base, status: 'processing' } }).motivo).toContain('processing');
  });
});

describe('firmaCarrito', () => {
  it('el orden de las líneas no cambia la firma', () => {
    const a = [{ product_id: 1, quantity: 1, total: '100' }, { product_id: 2, quantity: 1, total: '200' }];
    const b = [{ product_id: 2, quantity: 1, total: '200' }, { product_id: 1, quantity: 1, total: '100' }];
    expect(firmaCarrito(a)).toBe(firmaCarrito(b));
  });

  it('las líneas de regalo ($0) no cuentan: las agrega WordPress después', () => {
    const conRegalo = [{ product_id: 1, quantity: 1, total: '100' }, { product_id: 99, quantity: 1, total: '0.00' }];
    const sinRegalo = [{ product_id: 1, quantity: 1, total: '100' }];
    expect(firmaCarrito(conRegalo)).toBe(firmaCarrito(sinRegalo));
  });

  it('los centavos de Woo no rompen la comparación', () => {
    expect(firmaCarrito([{ product_id: 1, quantity: 1, total: '67000.00' }]))
      .toBe(firmaCarrito([{ product_id: 1, quantity: 1, total: 67000 }]));
  });
});
