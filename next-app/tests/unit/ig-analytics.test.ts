/**
 * Content Intelligence — estadística de segmentos, formateo y dataset demo.
 * Lo que se prueba acá es la metodología del doc 03: medianas (no promedios),
 * n mínimo visible, atípicos por IQR y comparación de períodos.
 */
import { describe, expect, it } from 'vitest';

import {
  factorVsMedian,
  groupStats,
  inRange,
  median,
  MIN_SAMPLE,
  outlierBounds,
  periodDelta,
  previousRange,
  quantile,
  summarize,
} from '@/lib/ig-insights/analytics';
import { fixtureDetail, fixtureList, fixturePosts } from '@/lib/ig-insights/fixtures';
import { fmtFactor, fmtFecha, fmtInt, fmtPct, fmtSegundos } from '@/lib/ig-insights/format';
import { engagementOverReach } from '@/lib/ig-insights/ratios';

describe('quantile / median', () => {
  it('mediana con cantidad impar y par', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('p25 y p75 interpolan', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([1, 2, 3, 4, 5], 0.75)).toBe(4);
  });
  it('sin datos → null', () => {
    expect(median([])).toBeNull();
    expect(quantile([], 0.5)).toBeNull();
  });
  it('la mediana aguanta un viral que destrozaría el promedio', () => {
    const conViral = [10, 11, 12, 13, 5000];
    expect(median(conViral)).toBe(12);
    const promedio = conViral.reduce((a, b) => a + b, 0) / conViral.length;
    expect(promedio).toBeGreaterThan(1000); // por esto no usamos promedios
  });
});

describe('summarize', () => {
  it('los null no cuentan para n', () => {
    const s = summarize('flatlay', [1, null, 2, undefined, 3]);
    expect(s.n).toBe(3);
    expect(s.median).toBe(2);
  });
  it('marca muestra chica por debajo de MIN_SAMPLE', () => {
    expect(summarize('x', [1, 2, 3]).smallSample).toBe(true);
    expect(summarize('x', Array.from({ length: MIN_SAMPLE }, (_, i) => i)).smallSample).toBe(false);
  });
});

describe('groupStats', () => {
  const items = [
    { k: 'flatlay', v: 0.05 },
    { k: 'flatlay', v: 0.07 },
    { k: 'editorial', v: 0.01 },
    { k: '', v: 0.99 },
    { k: null as string | null, v: 0.99 },
  ];

  it('agrupa, calcula y descarta las claves vacías (sin clasificar)', () => {
    const stats = groupStats(items, (i) => i.k || null, (i) => i.v);
    expect(stats.map((s) => s.key)).toEqual(['flatlay', 'editorial']);
    expect(stats[0].median).toBeCloseTo(0.06, 6);
  });

  it('un segmento sin ninguna métrica (n=0) no se lista', () => {
    const stats = groupStats(
      [
        { k: 'con', v: 0.05 as number | null },
        { k: 'sin', v: null },
      ],
      (i) => i.k,
      (i) => i.v,
    );
    expect(stats.map((s) => s.key)).toEqual(['con']);
  });

  it('los de muestra chica van al final aunque tengan mediana más alta', () => {
    const muchos = Array.from({ length: 10 }, () => ({ k: 'grande', v: 0.02 }));
    const stats = groupStats(
      [...muchos, { k: 'chico', v: 0.9 }],
      (i) => i.k,
      (i) => i.v,
    );
    expect(stats[0].key).toBe('grande');
    expect(stats[1].key).toBe('chico');
    expect(stats[1].smallSample).toBe(true);
  });
});

describe('outlierBounds', () => {
  it('con menos de MIN_SAMPLE no se declara ningún atípico', () => {
    expect(outlierBounds([1, 2, 3])).toBeNull();
  });
  it('detecta el valor que se escapa por 1,5×IQR', () => {
    const b = outlierBounds([10, 11, 12, 13, 14, 15, 16, 17, 100])!;
    expect(100).toBeGreaterThan(b.high);
    expect(14).toBeLessThan(b.high);
  });
});

describe('factorVsMedian y periodDelta', () => {
  it('×mediana', () => {
    expect(factorVsMedian(0.06, 0.03)).toBe(2);
    expect(factorVsMedian(0.06, null)).toBeNull();
    expect(factorVsMedian(null, 0.03)).toBeNull();
    expect(factorVsMedian(0.06, 0)).toBeNull();
  });
  it('delta con el shape que espera DeltaBadge', () => {
    expect(periodDelta(0.12, 0.1)).toEqual({ absolute: expect.closeTo(0.02, 6), pct: expect.closeTo(0.2, 6) });
    expect(periodDelta(0.12, 0)).toMatchObject({ pct: null });
    expect(periodDelta(null, 0.1)).toBeNull();
  });
});

describe('rangos de período', () => {
  it('el anterior es contiguo y de igual duración', () => {
    const desde = new Date('2026-09-17T00:00:00Z');
    const hasta = new Date('2026-10-17T00:00:00Z');
    const prev = previousRange(desde, hasta);
    expect(prev.hasta.getTime()).toBe(desde.getTime());
    expect(hasta.getTime() - desde.getTime()).toBe(prev.hasta.getTime() - prev.desde.getTime());
  });
  it('inRange trata el publishedAt como UTC', () => {
    const desde = new Date('2026-10-01T00:00:00Z');
    const hasta = new Date('2026-10-17T00:00:00Z');
    expect(inRange('2026-10-13 22:35:01', desde, hasta)).toBe(true);
    expect(inRange('2026-09-30 23:00:00', desde, hasta)).toBe(false);
    expect(inRange('fecha rota', desde, hasta)).toBe(false);
  });
});

describe('formateo', () => {
  it('enteros y porcentajes en es-AR; null es — y nunca 0', () => {
    expect(fmtInt(24507)).toBe('24.507');
    expect(fmtInt(null)).toBe('—');
    expect(fmtInt(0)).toBe('0');
    expect(fmtPct(0.0432)).toBe('4,3%');
    expect(fmtPct(null)).toBe('—');
    expect(fmtFactor(2.14)).toBe('2,1×');
    expect(fmtSegundos(7638)).toBe('7,6 s');
    expect(fmtFecha(null)).toBe('—');
    expect(fmtFecha('2026-10-13 22:35:01')).toMatch(/13/);
  });
});

describe('fixtures (datos de prueba)', () => {
  const ahora = new Date('2026-10-17T18:00:00Z');

  it('son deterministas: dos corridas dan lo mismo', () => {
    const a = fixturePosts(ahora);
    const b = fixturePosts(ahora);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('están marcados como demo: IDs 999… y permalinks DEMO', () => {
    for (const p of fixturePosts(ahora)) {
      expect(p.igMediaId.startsWith('999')).toBe(true);
      expect(p.permalink).toContain('/p/DEMO');
    }
  });

  it('incluyen los estados que la UI tiene que saber mostrar', () => {
    const posts = fixturePosts(ahora);
    expect(posts.some((p) => !p.latest)).toBe(true); // sin insights
    expect(posts.some((p) => p.category === '')).toBe(true); // sin clasificar
    expect(posts.some((p) => p.contentItemId == null)).toBe(true); // sin vincular
    expect(posts.some((p) => p.wasBoosted)).toBe(true); // pauteado
    expect(posts.some((p) => p.mediaProductType === 'REELS')).toBe(true);
  });

  it('las magnitudes son verosímiles y los ratios calculables', () => {
    const conMetricas = fixturePosts(ahora).filter((p) => p.latest);
    for (const p of conMetricas) {
      expect(p.latest!.reach!).toBeGreaterThan(500);
      expect(p.latest!.views!).toBeGreaterThan(p.latest!.reach!); // views ≥ reach
      const er = engagementOverReach(p.latest!)!;
      expect(er).toBeGreaterThan(0);
      expect(er).toBeLessThan(0.6);
    }
    // reposts queda null, igual que en la API real (métrica no verificada).
    expect(conMetricas.every((p) => p.latest!.reposts === null)).toBe(true);
  });

  it('fixtureList aplica los mismos filtros que el endpoint', () => {
    const soloReels = fixtureList({ productType: 'REELS' }, ahora);
    expect(soloReels.rows.every((r) => r.mediaProductType === 'REELS')).toBe(true);
    expect(fixtureList({ boosted: '0' }, ahora).rows.every((r) => !r.wasBoosted)).toBe(true);
    expect(fixtureList({ classified: 'no' }, ahora).rows.every((r) => r.category === '')).toBe(true);
    const buscado = fixtureList({ search: 'camo' }, ahora);
    expect(buscado.rows.length).toBeGreaterThan(0);
    expect(buscado.rows.every((r) => (r.caption ?? '').toLowerCase().includes('camo'))).toBe(true);
  });

  it('fixtureList pagina y reporta el total sin paginar', () => {
    const p1 = fixtureList({ limit: 5, offset: 0 }, ahora);
    const p2 = fixtureList({ limit: 5, offset: 5 }, ahora);
    expect(p1.rows).toHaveLength(5);
    expect(p1.total).toBeGreaterThan(10);
    expect(p1.total).toBe(p2.total);
    expect(p1.rows[0].igMediaId).not.toBe(p2.rows[0].igMediaId);
  });

  it('la ficha demo trae una curva creciente que termina en la última lectura', () => {
    const viejo = fixturePosts(ahora).find((p) => p.latest && (p.latest.ageHours ?? 0) > 800)!;
    const detalle = fixtureDetail(viejo.igMediaId, ahora)!;
    expect(detalle.snapshots.length).toBeGreaterThan(2);
    const reach = detalle.snapshots.map((s) => s.reach!);
    expect(reach).toEqual([...reach].sort((a, b) => a - b)); // monótona
    expect(detalle.snapshots.at(-1)!.reach).toBe(viejo.latest!.reach);
  });

  it('un id inexistente no devuelve ficha', () => {
    expect(fixtureDetail('17981913684090341', ahora)).toBeNull();
  });
});
