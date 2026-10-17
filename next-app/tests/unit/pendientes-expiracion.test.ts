import { describe, it, expect } from 'vitest';
import { decidir, resumir, esperaDe, META_EXPIRADO } from '@/lib/pendientes-expiracion';

/**
 * Expiración de pendientes (auditoría 17/10). Lo crítico es lo que NO se
 * cancela: una transferencia que todavía puede acreditar, un pedido con
 * señales de pago, uno cargado a mano. Cancelar de más es cancelarle la
 * compra a alguien que pagó.
 */
const AHORA = Date.parse('2026-10-17T20:00:00Z');
const haceHoras = (h: number) => new Date(AHORA - h * 3600_000).toISOString().slice(0, 19);

const pendiente = (over: Record<string, unknown> = {}) => ({
  id: 3992, number: '3992', status: 'pending', created_via: 'rest-api',
  payment_method: 'tarjeta', date_created_gmt: haceHoras(100), date_paid_gmt: null,
  transaction_id: '', total: '73408.00', meta_data: [],
  ...over,
});

describe('esperaDe', () => {
  it('transferencia espera 7 días; tarjeta 48 h', () => {
    expect(esperaDe('transferencia')).toBe(168);
    expect(esperaDe('talo-pay-cvu-woo')).toBe(168);
    expect(esperaDe('tarjeta')).toBe(48);
    expect(esperaDe('gocuotas')).toBe(48);
  });

  it('un método desconocido usa la espera más larga', () => {
    expect(esperaDe('pasarela-nueva')).toBe(168);
    expect(esperaDe('')).toBe(168);
  });
});

describe('decidir', () => {
  it('tarjeta sin pagar hace 100 h se cancela', () => {
    const d = decidir(pendiente(), AHORA);
    expect(d.accion).toBe('cancelar');
  });

  it('tarjeta de hace 10 h no se toca', () => {
    const d = decidir(pendiente({ date_created_gmt: haceHoras(10) }), AHORA);
    expect(d.accion).toBe('conservar');
    expect(d.accion === 'conservar' && d.motivo).toContain('espera');
  });

  it('una transferencia de 100 h todavía puede acreditar: no se cancela', () => {
    const d = decidir(pendiente({ payment_method: 'transferencia', date_created_gmt: haceHoras(100) }), AHORA);
    expect(d.accion).toBe('conservar');
  });

  it('una transferencia de 8 días sí se cancela', () => {
    const d = decidir(pendiente({ payment_method: 'transferencia', date_created_gmt: haceHoras(8 * 24) }), AHORA);
    expect(d.accion).toBe('cancelar');
  });

  it('con fecha de pago o transaction_id nunca se cancela', () => {
    expect(decidir(pendiente({ date_paid_gmt: '2026-10-16T01:00:00' }), AHORA).accion).toBe('conservar');
    expect(decidir(pendiente({ transaction_id: 'mp-123' }), AHORA).accion).toBe('conservar');
  });

  it('un pago reportado por el cliente frena la cancelación', () => {
    const d = decidir(pendiente({ meta_data: [{ key: '_hs_pago_reportado', value: '2026-10-17' }] }), AHORA);
    expect(d.accion).toBe('conservar');
  });

  it('_talo_payment_id NO protege: es el CVU generado, no un pago', () => {
    // Si protegiera, ninguna transferencia expiraría nunca (49 casos en la
    // simulación del 17/10). Talo acredita solo y pasa el pedido a processing.
    const d = decidir(pendiente({
      payment_method: 'transferencia', date_created_gmt: haceHoras(30 * 24),
      meta_data: [{ key: '_talo_payment_id', value: 'tp_123' }],
    }), AHORA);
    expect(d.accion).toBe('cancelar');
  });

  it('la marca manual _hs_no_expirar lo protege', () => {
    const d = decidir(pendiente({ meta_data: [{ key: '_hs_no_expirar', value: '1' }] }), AHORA);
    expect(d.accion).toBe('conservar');
  });

  it.each(['processing', 'completed', 'cancelled', 'failed', 'on-hold'])(
    'un pedido %s no se toca (idempotencia)', (status) => {
      expect(decidir(pendiente({ status }), AHORA).accion).toBe('conservar');
    },
  );

  it('correr el barrido dos veces no reprocesa lo ya expirado', () => {
    const yaExpirado = pendiente({ meta_data: [{ key: META_EXPIRADO, value: '2026-10-17T19:00:00Z' }] });
    expect(decidir(yaExpirado, AHORA).accion).toBe('conservar');
  });

  it('pedidos de carga manual o mayorista no se tocan', () => {
    expect(decidir(pendiente({ created_via: 'admin-manual' }), AHORA).accion).toBe('conservar');
    expect(decidir(pendiente({ created_via: 'mayorista' }), AHORA).accion).toBe('conservar');
  });

  it('sin fecha de creación válida no se cancela', () => {
    expect(decidir(pendiente({ date_created_gmt: undefined }), AHORA).accion).toBe('conservar');
  });
});

describe('resumir', () => {
  it('cuenta por método y agrupa los motivos de conservar', () => {
    const decisiones = [
      decidir(pendiente({ id: 1 }), AHORA),
      decidir(pendiente({ id: 2, payment_method: 'gocuotas' }), AHORA),
      decidir(pendiente({ id: 3, date_created_gmt: haceHoras(2) }), AHORA),
      decidir(pendiente({ id: 4, status: 'processing' }), AHORA),
    ];
    const r = resumir(decisiones);
    expect(r.analizados).toBe(4);
    expect(r.aCancelar).toBe(2);
    expect(r.seConservan).toBe(2);
    expect(r.porMetodo).toEqual({ tarjeta: 1, gocuotas: 1 });
  });
});
