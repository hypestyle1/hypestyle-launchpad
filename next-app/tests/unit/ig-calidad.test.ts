/**
 * Control de calidad de las métricas históricas.
 *
 * Los casos no son inventados: son las **37 lecturas reales** que se midieron
 * contra la cuenta el 19/10/2026 (muestreo de 2 por semestre desde 2021, más
 * 13 publicaciones entre junio y diciembre de 2024 para encontrar el borde).
 *
 * Lo que fijan estos tests:
 *  - la regla reproduce el corte observado (19/10/2024) **sin mirar la fecha**;
 *  - el veredicto es por métrica: una lectura con alcance roto conserva sus
 *    likes;
 *  - `views = 0` con interacciones no es un cero medido;
 *  - el snapshot original nunca se modifica.
 */
import { describe, expect, it } from 'vitest';

import {
  CORTE_OBSERVADO,
  evaluarCalidad,
  metricasUsables,
  REGLA_CALIDAD_VERSION,
  resumenDeCalidad,
  avisoDeCalidad,
} from '@/lib/ig-insights/calidad';
import { likesOverReach } from '@/lib/ig-insights/ratios';
import type { IgPostRecord, IgSnapshotRecord } from '@/lib/ig-insights/types';

/** [fecha, tipo, reach, views, likes] tal como los devolvió la Graph API. */
type Caso = [string, 'FEED' | 'REELS', number, number, number];

/** Anteriores al corte: todas tienen que quedar afuera. */
const ROTAS: Caso[] = [
  ['2021-01-22', 'REELS', 7, 4232, 163],
  ['2021-01-29', 'FEED', 154, 0, 235],
  ['2021-10-17', 'FEED', 155, 0, 129],
  ['2021-11-16', 'REELS', 68, 14961, 132],
  ['2022-06-30', 'FEED', 123, 0, 915],
  ['2022-11-01', 'FEED', 51, 0, 250],
  ['2022-12-20', 'REELS', 1036, 22495, 659],
  ['2023-03-16', 'REELS', 176, 32577, 1091],
  ['2023-06-28', 'FEED', 224, 0, 626],
  ['2023-10-13', 'FEED', 143, 0, 246],
  ['2023-12-26', 'REELS', 176, 20417, 126],
  ['2024-05-01', 'FEED', 361, 0, 305],
  ['2024-06-05', 'FEED', 631, 0, 296],
  ['2024-06-09', 'REELS', 706, 15136, 131],
  ['2024-06-20', 'FEED', 631, 0, 131],
  ['2024-06-23', 'FEED', 769, 0, 113],
  ['2024-07-03', 'FEED', 2437, 30123, 536],
  ['2024-09-18', 'REELS', 1562, 27096, 554],
  ['2024-10-03', 'FEED', 1438, 14433, 164],
  ['2024-10-10', 'FEED', 964, 11470, 122],
];

/** Desde el corte: todas tienen que entrar. */
const SANAS: Caso[] = [
  ['2024-10-19', 'REELS', 3010, 15636, 141],
  ['2024-10-23', 'REELS', 6659, 22472, 149],
  ['2024-10-31', 'REELS', 2623, 7210, 68],
  ['2024-11-28', 'REELS', 5226, 9276, 63],
  ['2024-12-17', 'FEED', 11552, 24347, 691],
  ['2024-12-23', 'REELS', 4340, 8171, 65],
  ['2024-12-29', 'FEED', 6705, 15514, 146],
  ['2025-04-13', 'FEED', 5893, 16739, 131],
  ['2025-06-30', 'FEED', 13853, 81519, 236],
  ['2025-09-23', 'REELS', 6502, 8730, 117],
  ['2025-12-29', 'FEED', 9487, 29004, 460],
  ['2026-03-29', 'FEED', 39199, 82973, 2210],
  ['2026-06-29', 'FEED', 32947, 85476, 465],
  ['2026-08-23', 'FEED', 5894, 19214, 100],
  ['2026-10-18', 'REELS', 6813, 12605, 156],
];

function snap(reach: number, views: number, likes: number): IgSnapshotRecord {
  return {
    takenAt: '2026-10-19 18:00:00',
    ageHours: 1000,
    views, reach, likes,
    comments: 3, saved: 10, shares: 4,
    reposts: null, totalInteractions: null, profileVisits: null, follows: null,
    avgWatchTimeMs: null, videoViewTotalTimeMs: null,
  };
}

function post([fecha, tipo, reach, views, likes]: Caso, i = 0): IgPostRecord {
  return {
    igMediaId: `19${String(i).padStart(14, '0')}`,
    permalink: `https://www.instagram.com/p/q${i}/`,
    publishedAt: `${fecha} 12:00:00`,
    mediaType: tipo === 'REELS' ? 'VIDEO' : 'CAROUSEL_ALBUM',
    mediaProductType: tipo,
    caption: null, isSharedToFeed: null, mediaCount: 1,
    coverAttachmentId: null, coverUrl: null, children: null,
    likeCount: likes, commentsCount: 3,
    category: 'producto', coverType: '', visualStyle: '', objective: '',
    scenario: '', hasModels: '', aiUsage: 'none', classifiedBy: '',
    classifiedAt: null, reviewState: '', wasBoosted: false, boostRef: '',
    contentItemId: null, campaignId: null, creatorId: null, productIds: [],
    learnings: null, experimentId: null, updatedAt: '2026-10-19 18:00:00',
    latest: snap(reach, views, likes),
  };
}

describe('calidad: las 37 lecturas reales medidas el 19/10/2026', () => {
  it.each(ROTAS)('%s %s reach=%i views=%i → alcance NO confiable', (fecha, tipo, reach, views, likes) => {
    const c = evaluarCalidad(post([fecha, tipo, reach, views, likes]), snap(reach, views, likes));
    expect(c.estado).toBe('parcial');
    expect(c.metricas.reach?.estado).toBe('no-confiable');
    expect(c.metricas.reach?.motivo).toBeTruthy();
  });

  it.each(SANAS)('%s %s reach=%i views=%i → analizable', (fecha, tipo, reach, views, likes) => {
    const c = evaluarCalidad(post([fecha, tipo, reach, views, likes]), snap(reach, views, likes));
    expect(c.estado).toBe('ok');
    expect(c.metricas.reach?.estado).toBe('ok');
  });

  it('la regla reproduce el corte observado sin usarlo', () => {
    const todas = [...ROTAS, ...SANAS].map((c, i) => post(c, i));
    const r = resumenDeCalidad(todas);
    expect(r.analizables).toBe(SANAS.length);
    expect(r.excluidas).toBe(ROTAS.length);
    // Todas las excluidas son anteriores al corte y ninguna posterior se cayó.
    expect(r.excluidasAnterioresAlCorte).toBe(ROTAS.length);
    expect(r.anterioresAlCorteQuePasan).toBe(0);
    expect(r.corteObservado).toBe(CORTE_OBSERVADO);
    expect(r.regla).toBe(REGLA_CALIDAD_VERSION);
  });
});

describe('calidad: el veredicto no depende de la fecha', () => {
  it('una lectura coherente fechada en 2021 se analiza igual', () => {
    const p = post(['2021-03-03', 'FEED', 6705, 15514, 146]);
    const c = evaluarCalidad(p, p.latest);
    expect(c.epocaDegradada).toBe(true); // informativo
    expect(c.metricas.reach?.estado).toBe('ok'); // pero no la excluye
  });

  it('una lectura rota fechada ayer queda afuera igual', () => {
    const p = post(['2026-10-18', 'FEED', 51, 0, 250]);
    const c = evaluarCalidad(p, p.latest);
    expect(c.epocaDegradada).toBe(false);
    expect(c.metricas.reach?.estado).toBe('no-confiable');
  });
});

describe('calidad: veredicto por métrica', () => {
  const p = post(['2022-11-01', 'FEED', 51, 0, 250]);

  it('views en cero con interacciones no es un cero medido', () => {
    const c = evaluarCalidad(p, p.latest);
    expect(c.metricas.views?.estado).toBe('no-confiable');
    expect(c.metricas.views?.motivo).toContain('no estaba disponible');
  });

  it('los likes sobreviven aunque el alcance no sirva', () => {
    const c = evaluarCalidad(p, p.latest);
    expect(c.metricas.likes?.estado).toBe('ok');
    expect(metricasUsables(p, p.latest).likes).toBe(250);
  });

  it('lo ausente sigue siendo ausente, no "no confiable"', () => {
    const c = evaluarCalidad(p, p.latest);
    expect(c.metricas.reposts?.estado).toBe('ausente');
    expect(c.metricas.follows?.estado).toBe('ausente');
  });

  it('el snapshot original no se toca', () => {
    const copia = JSON.parse(JSON.stringify(p.latest));
    metricasUsables(p, p.latest);
    evaluarCalidad(p, p.latest);
    expect(p.latest).toEqual(copia);
  });

  it('con el alcance descartado, todo ratio sobre alcance da null', () => {
    expect(likesOverReach(p.latest!)).toBeCloseTo(250 / 51); // el crudo miente
    expect(likesOverReach(metricasUsables(p, p.latest))).toBeNull(); // el usable no
  });
});

describe('calidad: resumen y aviso', () => {
  it('cuenta el universo analizado, el excluido y por qué', () => {
    const todas = [...ROTAS, ...SANAS].map((c, i) => post(c, i));
    const sinInsights = post(SANAS[0], 99);
    sinInsights.latest = null;
    const r = resumenDeCalidad([...todas, sinInsights]);

    expect(r.total).toBe(36);
    expect(r.sinMetricas).toBe(1);
    expect(r.analizables + r.excluidas + r.sinMetricas).toBe(r.total);
    expect(Object.keys(r.porMotivo).length).toBeGreaterThan(1);
    expect(Object.values(r.porMotivo).some((n) => n > 1)).toBe(true);

    const aviso = avisoDeCalidad(r)!;
    expect(aviso).toContain('Universo analizado: 15 de 36');
    expect(aviso).toContain('no confiables');
    expect(aviso).toContain('sin insights');
  });

  it('sin problemas no hay aviso', () => {
    expect(avisoDeCalidad(resumenDeCalidad(SANAS.map((c, i) => post(c, i))))).toBeNull();
  });
});
