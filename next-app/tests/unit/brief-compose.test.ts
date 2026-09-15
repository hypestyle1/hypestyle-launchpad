import { describe, it, expect } from 'vitest';
import { compose, scoreOf, floorFor, CONFIDENCE_WEIGHT } from '@/lib/brief/score';
import { DEFAULT_CONFIG } from '@/lib/brief/config';
import type { BriefSignal } from '@/lib/brief/types';

const NOW = '2026-09-15T12:00:00.000Z';

function sig(over: Partial<BriefSignal> & { id: string; amount: number }): BriefSignal {
  const { amount, ...rest } = over;
  return {
    domain: 'ops', rule: 'r', situation: 's', evidence: 'e', action: 'a',
    href: '/admin/pedidos', hrefLabel: 'Ver', impact: { amount, currency: 'ARS', kind: 'retained' },
    urgency: 1, confidence: 'exact', tone: 'warning', observedAt: NOW, sourceRefs: [],
    ...rest,
  };
}

describe('score', () => {
  it('impacto × urgencia × confianza, redondeado', () => {
    expect(scoreOf(sig({ id: 'a', amount: 100_000 }))).toBe(100_000);
    expect(scoreOf(sig({ id: 'a', amount: 100_000, urgency: 2 }))).toBe(200_000);
    expect(scoreOf(sig({ id: 'a', amount: 100_000, confidence: 'rule' }))).toBe(70_000);
    expect(scoreOf(sig({ id: 'a', amount: 100_000, confidence: 'estimated', urgency: 1.5 }))).toBe(75_000);
  });
  it('urgencia se acota a [1, 2] y el impacto negativo vale 0', () => {
    expect(scoreOf(sig({ id: 'a', amount: 10_000, urgency: 5 }))).toBe(20_000);
    expect(scoreOf(sig({ id: 'a', amount: 10_000, urgency: 0.2 }))).toBe(10_000);
    expect(scoreOf(sig({ id: 'a', amount: -5 }))).toBe(0);
  });
  it('pesos de confianza', () => {
    expect(CONFIDENCE_WEIGHT).toEqual({ exact: 1, rule: 0.7, estimated: 0.5 });
  });
});

describe('piso', () => {
  it('es el mayor entre el mínimo fijo y el % del revenue', () => {
    expect(floorFor(DEFAULT_CONFIG, null)).toBe(50_000);
    expect(floorFor(DEFAULT_CONFIG, 1_000_000)).toBe(50_000);
    expect(floorFor(DEFAULT_CONFIG, 13_000_000)).toBe(130_000);
  });
});

describe('compose', () => {
  const opts = { floorARS: 100_000, maxItems: 5, maxPerDomain: 2 };

  it('ordena por score y suprime lo que no pasa el piso', () => {
    const r = compose([
      sig({ id: 'chico', amount: 20_000 }),
      sig({ id: 'medio', amount: 150_000 }),
      sig({ id: 'grande', amount: 300_000, confidence: 'estimated', domain: 'stock' }), // 150.000
      sig({ id: 'urgente', amount: 200_000, urgency: 2 }),             // 400.000
    ], opts);
    expect(r.items.map((s) => s.id)).toEqual(['urgente', 'medio', 'grande']);
    expect(r.suppressed).toBe(1);
    expect(r.all).toHaveLength(4);
  });

  it('floorExempt entra sin llegar al piso pero se ordena por su score real', () => {
    const r = compose([
      sig({ id: 'grande', amount: 300_000 }),
      sig({ id: 'ads', domain: 'ads', amount: 26_000, confidence: 'rule', urgency: 2, floorExempt: { reason: 'gasto real sin compras' } }),
      sig({ id: 'chico', amount: 40_000 }),
    ], opts);
    expect(r.items.map((s) => s.id)).toEqual(['grande', 'ads']);
    expect(r.items[1].score).toBe(36_400);
  });

  it('crítico entra aunque no llegue al piso', () => {
    const r = compose([sig({ id: 'crit', amount: 10_000, tone: 'critical' })], opts);
    expect(r.items.map((s) => s.id)).toEqual(['crit']);
  });

  it('máximo 2 por dominio y máximo 5 en total', () => {
    const many = [
      ...[1, 2, 3, 4].map((i) => sig({ id: `stock-${i}`, domain: 'stock', amount: 900_000 - i })),
      ...[1, 2, 3].map((i) => sig({ id: `ops-${i}`, domain: 'ops', amount: 500_000 - i })),
      ...[1, 2].map((i) => sig({ id: `ads-${i}`, domain: 'ads', amount: 400_000 - i })),
    ];
    const r = compose(many, opts);
    expect(r.items).toHaveLength(5);
    expect(r.items.map((s) => s.id)).toEqual(['stock-1', 'stock-2', 'ops-1', 'ops-2', 'ads-1']);
  });

  it('deduplica por id conservando el score mayor', () => {
    const r = compose([
      sig({ id: 'x', amount: 120_000 }),
      sig({ id: 'x', amount: 200_000 }),
    ], opts);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].impact.amount).toBe(200_000);
  });

  it('desempate: link interno primero, después el más viejo', () => {
    const r = compose([
      sig({ id: 'ext', amount: 200_000, href: 'https://wp/edit', domain: 'stock' }),
      sig({ id: 'int-nuevo', amount: 200_000, observedAt: '2026-09-15T12:00:00.000Z' }),
      sig({ id: 'int-viejo', amount: 200_000, observedAt: '2026-09-14T12:00:00.000Z' }),
    ], opts);
    expect(r.items.map((s) => s.id)).toEqual(['int-viejo', 'int-nuevo', 'ext']);
  });

  it('sin señales: lista vacía y nada suprimido', () => {
    expect(compose([], opts)).toEqual({ items: [], suppressed: 0, all: [] });
  });
});
