import { describe, it, expect } from 'vitest';
import { fulfillmentStage, splitProcessing, normalizeProcessingOrder, hasMeta } from '@/lib/orders-fulfillment';
import { estaPorEmpaquetar } from '@/lib/pod';

const meta = (obj: Record<string, unknown>) => Object.entries(obj).map(([key, value]) => ({ key, value }));

describe('fulfillmentStage', () => {
  it('guía real gana sobre rótulo', () => {
    expect(fulfillmentStage(meta({ _order_andreani_numero_interno: 'X1', _tracking_number: '360000123' }))).toBe('con_guia');
  });
  it('rótulo sin guía', () => {
    expect(fulfillmentStage(meta({ _order_andreani_pedido_id: '99' }))).toBe('con_rotulo');
    expect(fulfillmentStage(meta({ _andreani_tracking_number: 'ABC' }))).toBe('con_rotulo');
  });
  it('sin nada, o con valores vacíos, es sin rótulo', () => {
    expect(fulfillmentStage(undefined)).toBe('sin_rotulo');
    expect(fulfillmentStage(meta({ _tracking_number: '  ', _order_andreani_pedido_id: '' }))).toBe('sin_rotulo');
  });
  it('hasMeta ignora claves ajenas', () => {
    expect(hasMeta(meta({ otra: 'x' }), ['_tracking_number'])).toBe(false);
  });
});

describe('splitProcessing', () => {
  it('cuenta por etapa con el mismo contrato que /orders/counts', () => {
    const orders = [
      { stage: 'sin_rotulo' as const }, { stage: 'sin_rotulo' as const },
      { stage: 'con_rotulo' as const },
      { stage: 'con_guia' as const }, { stage: 'con_guia' as const }, { stage: 'con_guia' as const },
    ];
    expect(splitProcessing(orders)).toEqual({ sinEmpaquetar: 2, empaquetados: 1, enviados: 3 });
  });
});

describe('normalizeProcessingOrder', () => {
  it('parsea total, fecha GMT y etapa', () => {
    const o = normalizeProcessingOrder({ id: 3170, number: '3170', total: '120000.00', date_created_gmt: '2026-09-11T11:00:00', meta_data: meta({}), shipping_lines: [{ method_title: 'Andreani (estándar)' }] });
    expect(o).toEqual({ id: 3170, number: '3170', total: 120000, dateGmt: '2026-09-11T11:00:00.000Z', stage: 'sin_rotulo', shippingMethod: 'Andreani (estándar)' });
    expect(normalizeProcessingOrder({ id: 2, total: '0' }).shippingMethod).toBe('');
  });
  it('fecha inválida queda vacía en vez de romper', () => {
    expect(normalizeProcessingOrder({ id: 1, total: 'x' }).dateGmt).toBe('');
  });
});

describe('pod.estaPorEmpaquetar delega en la misma clasificación', () => {
  it('coincide con fulfillmentStage', () => {
    expect(estaPorEmpaquetar({ id: 1, number: 1, meta_data: meta({}) })).toBe(true);
    expect(estaPorEmpaquetar({ id: 1, number: 1, meta_data: meta({ _order_andreani_pedido_id: '7' }) })).toBe(false);
    expect(estaPorEmpaquetar({ id: 1, number: 1, meta_data: meta({ _tracking_number: '360' }) })).toBe(false);
  });
});
