import { describe, it, expect } from 'vitest';
import { METRICS, DEFAULT_KPIS, fmtMetric, fmtShort } from '@/lib/performance/registry';

describe('metric registry', () => {
  it('todos los KPIs por defecto existen en el registry', () => {
    for (const id of DEFAULT_KPIS) expect(METRICS[id], `falta ${id}`).toBeTruthy();
  });
  it('el grid trae 12–16 KPIs', () => {
    expect(DEFAULT_KPIS.length).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_KPIS.length).toBeLessThanOrEqual(16);
  });
  it('cada métrica declara format, category, comparison y source', () => {
    for (const m of Object.values(METRICS)) {
      expect(m.format).toBeTruthy(); expect(m.category).toBeTruthy();
      expect(['up-good', 'down-good', 'neutral']).toContain(m.comparison);
      expect(m.source).toBeTruthy();
    }
  });
  it('semántica de comparación: CAC/CPA/breakeven = down-good (no up=green)', () => {
    expect(METRICS.blendedCac.comparison).toBe('down-good');
    expect(METRICS.metaCpa.comparison).toBe('down-good');
    expect(METRICS.breakevenRoas.comparison).toBe('down-good');
    expect(METRICS.revenue.comparison).toBe('up-good');
    expect(METRICS.cogs.comparison).toBe('neutral'); // COGS ↑ no es automáticamente bueno ni malo
  });
});

describe('formato de números', () => {
  it('compacto en cards ($13,1M / $2,81M... k)', () => {
    expect(fmtShort(13_063_652)).toBe('$13,1M');
    expect(fmtShort(2_804_578)).toBe('$2,8M');
    expect(fmtShort(27_756)).toBe('$28k');
    expect(fmtShort(640)).toBe('$640');
  });
  it('fmtMetric por tipo; null → —', () => {
    expect(fmtMetric(1.387, 'x')).toBe('1,39×');
    expect(fmtMetric(0.217, 'pct')).toBe('21,7%');
    expect(fmtMetric(103, 'int')).toBe('103');
    expect(fmtMetric(13_063_652, 'ars', true)).toBe('$13,1M');
    expect(fmtMetric(13_063_652, 'ars', false)).toBe('$13.063.652');
    expect(fmtMetric(null, 'x')).toBe('—');
  });
});
