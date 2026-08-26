import { describe, it, expect } from 'vitest';
import {
  resolvePreset, previousRange, granularityFor, bucketKey, emptyBuckets, toARParts,
} from '@/lib/dashboard/periods';

// Referencia: 26 ago 2026, 13:42 hora argentina = 16:42 UTC.
const NOW = new Date('2026-08-26T16:42:00Z');

describe('periods — timezone AR (UTC−03)', () => {
  it('toARParts corre el instante 3h atrás', () => {
    const p = toARParts(NOW);
    expect(p).toMatchObject({ y: 2026, m: 7, d: 26, hh: 13 }); // m=7 => agosto
  });

  it('"Hoy" empieza a las 00:00 AR = 03:00 UTC', () => {
    const r = resolvePreset('today', NOW);
    expect(r.startUTC).toBe('2026-08-26T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-08-27T03:00:00.000Z');
  });

  it('"Ayer" es el día AR anterior completo', () => {
    const r = resolvePreset('yesterday', NOW);
    expect(r.startUTC).toBe('2026-08-25T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-08-26T03:00:00.000Z');
  });

  it('"Últimos 7 días" incluye hoy (7 días hasta mañana 00:00 AR)', () => {
    const r = resolvePreset('last7', NOW);
    expect(r.startUTC).toBe('2026-08-20T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-08-27T03:00:00.000Z');
  });

  it('"Este mes" va del 1 al fin de mes AR', () => {
    const r = resolvePreset('thisMonth', NOW);
    expect(r.startUTC).toBe('2026-08-01T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-09-01T03:00:00.000Z');
  });

  it('"Mes anterior" es julio', () => {
    const r = resolvePreset('prevMonth', NOW);
    expect(r.startUTC).toBe('2026-07-01T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-08-01T03:00:00.000Z');
  });

  it('custom respeta límites inclusivos AR', () => {
    const r = resolvePreset('custom', NOW, { start: '2026-08-10', end: '2026-08-12' });
    expect(r.startUTC).toBe('2026-08-10T03:00:00.000Z');
    expect(r.endUTC).toBe('2026-08-13T03:00:00.000Z'); // fin exclusivo = día siguiente
  });
});

describe('periods — comparación y granularidad', () => {
  it('previousRange es el mismo largo, inmediatamente antes', () => {
    const r = resolvePreset('last7', NOW);
    const p = previousRange(r);
    expect(p.endUTC).toBe(r.startUTC);
    expect(p.startUTC).toBe('2026-08-13T03:00:00.000Z');
  });

  it('granularidad: hora para 1 día, día para un mes', () => {
    expect(granularityFor(resolvePreset('today', NOW))).toBe('hour');
    expect(granularityFor(resolvePreset('thisMonth', NOW))).toBe('day');
    expect(granularityFor(resolvePreset('thisYear', NOW))).toBe('week');
  });
});

describe('periods — buckets', () => {
  it('bucketKey por día usa la fecha AR', () => {
    // 2026-08-27T02:00Z = 2026-08-26 23:00 AR → cae en el día 26
    expect(bucketKey('2026-08-27T02:00:00Z', 'day')).toBe('2026-08-26');
  });

  it('emptyBuckets de "Hoy" genera 24 horas', () => {
    const r = resolvePreset('today', NOW);
    expect(emptyBuckets(r, 'hour')).toHaveLength(24);
  });

  it('emptyBuckets de "Últimos 7 días" genera 7 días', () => {
    const r = resolvePreset('last7', NOW);
    expect(emptyBuckets(r, 'day')).toHaveLength(7);
  });
});
