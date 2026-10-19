/**
 * Motor de análisis del skill `hype-content-intelligence`.
 *
 * El skill vive fuera de next-app (en .claude/skills/) y su motor está en JS
 * plano para poder correr sin build. Estos tests cubren su comportamiento y,
 * sobre todo, la PARIDAD con `lib/ig-insights/{analytics,ratios}.ts`: si
 * alguno de los dos cambia de criterio, el test falla.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as analisisModule from '../../../.claude/skills/hype-content-intelligence/lib/analisis.mjs';
import * as consultarModule from '../../../.claude/skills/hype-content-intelligence/lib/consultar.mjs';
import { median as medianTs, MIN_SAMPLE as MIN_TS, outlierBounds as boundsTs, quantile as quantileTs, summarize as summarizeTs } from '@/lib/ig-insights/analytics';
import { engagementOverReach as erTs, likesOverReach as likesTs, savedOverReach as savedTs } from '@/lib/ig-insights/ratios';
import type { IgPostRecord, IgSnapshotRecord } from '@/lib/ig-insights/types';

// El motor del skill es JS plano fuera del tsconfig: TS infiere sus firmas de
// los defaults del destructuring y queda más estrecho que el contrato real
// (documentado en JSDoc). Se consume sin tipos; el contrato lo fijan estos tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
const skill = analisisModule as unknown as Record<string, any>;
const skillCli = consultarModule as unknown as Record<string, any>;

const DEMO_PATH = resolve(
  __dirname,
  '../../../.claude/skills/hype-content-intelligence/fixtures/demo.json',
);
const demo = JSON.parse(readFileSync(DEMO_PATH, 'utf8')) as {
  fixture: boolean;
  _aviso: string;
  rows: IgPostRecord[];
};
const AHORA = '2026-10-17T18:00:00Z';

/** Publicación mínima para construir casos a mano. */
function post(p: Partial<IgPostRecord> & { igMediaId: string }): IgPostRecord {
  return {
    permalink: `https://www.instagram.com/p/${p.igMediaId}/`,
    publishedAt: '2026-10-01 12:00:00',
    mediaType: 'CAROUSEL_ALBUM',
    mediaProductType: 'FEED',
    caption: null,
    isSharedToFeed: null,
    mediaCount: 1,
    coverAttachmentId: null,
    coverUrl: null,
    children: null,
    likeCount: null,
    commentsCount: null,
    category: 'flatlay',
    coverType: 'producto-piso',
    visualStyle: 'luz-natural',
    objective: '',
    scenario: '',
    hasModels: '',
    aiUsage: 'none',
    classifiedBy: 'human',
    classifiedAt: null,
    reviewState: '',
    wasBoosted: false,
    boostRef: '',
    contentItemId: null,
    campaignId: null,
    creatorId: null,
    productIds: [],
    learnings: null,
    experimentId: null,
    updatedAt: '2026-10-17 18:00:00',
    latest: null,
    ...p,
  } as IgPostRecord;
}

function metrics(m: Partial<IgSnapshotRecord>): IgSnapshotRecord {
  return {
    takenAt: '2026-10-17 18:00:00',
    ageHours: 100,
    views: null,
    reach: null,
    likes: null,
    comments: null,
    saved: null,
    shares: null,
    reposts: null,
    totalInteractions: null,
    profileVisits: null,
    follows: null,
    avgWatchTimeMs: null,
    videoViewTotalTimeMs: null,
    ...m,
  };
}

/* ─── Paridad con el panel ──────────────────────────────────────────────── */

describe('paridad con lib/ig-insights', () => {
  const m = { reach: 24507, views: 62089, likes: 4153, comments: 21, saved: 97, shares: 110 };

  it('los ratios dan exactamente lo mismo', () => {
    expect(skill.likesOverReach(m)).toBe(likesTs(m));
    expect(skill.savedOverReach(m)).toBe(savedTs(m));
    expect(skill.engagementOverReach(m)).toBe(erTs(m));
  });

  it('engagement exige las cuatro interacciones en ambos', () => {
    const incompleto = { ...m, saved: null };
    expect(skill.engagementOverReach(incompleto)).toBeNull();
    expect(erTs(incompleto)).toBeNull();
  });

  it('mediana, cuantiles, resumen y umbral de atípicos coinciden', () => {
    const vals = [0.01, 0.02, 0.03, 0.05, 0.08, 0.13, 0.21, 0.34, 0.9];
    expect(skill.median(vals)).toBe(medianTs(vals));
    expect(skill.quantile(vals, 0.25)).toBe(quantileTs(vals, 0.25));
    expect(skill.summarize('x', vals)).toEqual(summarizeTs('x', vals));
    expect(skill.outlierBounds(vals)).toEqual(boundsTs(vals));
    expect(skill.MIN_SAMPLE).toBe(MIN_TS);
  });
});

/* ─── Filtrado ──────────────────────────────────────────────────────────── */

describe('filtrar', () => {
  const posts = [
    post({ igMediaId: '1', latest: metrics({ reach: 100, likes: 10 }) }),
    post({ igMediaId: '2', wasBoosted: true, latest: metrics({ reach: 100, likes: 50 }) }),
    post({ igMediaId: '3', latest: null }),
    post({ igMediaId: '4', publishedAt: '2024-01-01 12:00:00', latest: metrics({ reach: 100, likes: 10 }) }),
  ];

  it('excluye pauteadas por defecto: orgánico y pago no se mezclan', () => {
    const r = skill.filtrar(posts, { dias: null, ahora: AHORA });
    expect(r.map((p: IgPostRecord) => p.igMediaId)).toEqual(['1', '4']);
  });

  it('distribucion=pago deja solo las pauteadas; todo deja ambas', () => {
    expect(skill.filtrar(posts, { dias: null, distribucion: 'pago', ahora: AHORA })).toHaveLength(1);
    expect(skill.filtrar(posts, { dias: null, distribucion: 'todo', ahora: AHORA })).toHaveLength(3);
  });

  it('las publicaciones sin métricas quedan afuera del análisis', () => {
    const r = skill.filtrar(posts, { dias: null, ahora: AHORA });
    expect(r.find((p: IgPostRecord) => p.igMediaId === '3')).toBeUndefined();
  });

  it('la ventana temporal recorta por fecha de publicación', () => {
    const r = skill.filtrar(posts, { dias: 90, ahora: AHORA });
    expect(r.map((p: IgPostRecord) => p.igMediaId)).toEqual(['1']);
  });

  it('producto matchea por id de Woo o por texto del copy', () => {
    const conProducto = [
      post({ igMediaId: '10', productIds: [881], latest: metrics({ reach: 100, likes: 5 }) }),
      post({ igMediaId: '11', caption: 'Camo Cap Grey', latest: metrics({ reach: 100, likes: 5 }) }),
      post({ igMediaId: '12', caption: 'otra cosa', latest: metrics({ reach: 100, likes: 5 }) }),
    ];
    expect(skill.filtrar(conProducto, { dias: null, producto: 881, ahora: AHORA })).toHaveLength(1);
    expect(skill.filtrar(conProducto, { dias: null, producto: 'camo', ahora: AHORA })).toHaveLength(1);
  });

  it('huecos reporta lo que no entra en el análisis', () => {
    expect(skill.huecos(posts)).toEqual({
      total: 4,
      sinMetricas: 1,
      sinClasificar: 0,
      pauteadas: 1,
      // Las 3 no pauteadas tampoco están verificadas: nadie las cruzó con Ads.
      sinVerificar: 3,
    });
  });
});

/* ─── Ranking ───────────────────────────────────────────────────────────── */

describe('rankear', () => {
  const posts = [0.09, 0.05, 0.04, 0.03].map((tasa, i) =>
    post({ igMediaId: `r${i}`, latest: metrics({ reach: 1000, likes: tasa * 1000 }) }),
  );

  it('ordena de mayor a menor y expresa cada uno contra la mediana', () => {
    const r = skill.rankear(posts, { metrica: 'likesReach' });
    expect(r.items[0].valor).toBeCloseTo(0.09, 6);
    expect(r.items[0].vsMediana).toBeCloseTo(0.09 / 0.045, 4);
    expect(r.items[0].permalink).toContain('instagram.com');
  });

  it('avisa cuando la muestra es chica', () => {
    expect(skill.rankear(posts, { metrica: 'likesReach' }).muestraChica).toBe(true);
    expect(skill.rankear(posts, { metrica: 'likesReach' }).n).toBe(4);
  });

  it('las publicaciones sin esa métrica no entran al ranking', () => {
    const conFaltante = [...posts, post({ igMediaId: 'sin', latest: metrics({ reach: 1000 }) })];
    expect(skill.rankear(conFaltante, { metrica: 'likesReach' }).n).toBe(4);
  });

  it('likes/views se marca como secundaria y lleva su aviso', () => {
    const r = skill.rankear(posts, { metrica: 'likesViews' });
    expect(r.secundaria).toBe(true);
    expect(r.aviso).toContain('repeticiones');
  });

  it('una métrica inexistente falla con las opciones a la vista', () => {
    expect(() => skill.rankear(posts, { metrica: 'inventada' })).toThrow(/Métrica desconocida/);
  });
});

/* ─── Segmentos y contraste ─────────────────────────────────────────────── */

describe('compararSegmentos', () => {
  const hacer = (cat: string, n: number, tasa: number) =>
    Array.from({ length: n }, (_, i) =>
      post({ igMediaId: `${cat}${i}`, category: cat, latest: metrics({ reach: 1000, likes: tasa * 1000 }) }),
    );

  it('sin dos segmentos de n suficiente, declara que no alcanza', () => {
    const r = skill.compararSegmentos([...hacer('flatlay', 3, 0.08), ...hacer('editorial', 4, 0.03)], {});
    expect(r.evidenciaSuficiente).toBe(false);
    expect(r.segmentos.every((s: { smallSample: boolean }) => s.smallSample)).toBe(true);
  });

  it('con dos segmentos de n≥8 habilita la comparación', () => {
    const r = skill.compararSegmentos([...hacer('flatlay', 10, 0.08), ...hacer('editorial', 9, 0.03)], {});
    expect(r.evidenciaSuficiente).toBe(true);
    expect(r.segmentos[0].key).toBe('flatlay');
  });

  it('las publicaciones sin clasificar no forman un segmento fantasma', () => {
    const r = skill.compararSegmentos(
      [...hacer('flatlay', 2, 0.08), post({ igMediaId: 'x', category: '', latest: metrics({ reach: 1000, likes: 500 }) })],
      {},
    );
    expect(r.segmentos.map((s: { key: string }) => s.key)).toEqual(['flatlay']);
  });

  it('una dimensión inexistente falla con las opciones a la vista', () => {
    expect(() => skill.compararSegmentos([], { dimension: 'color' })).toThrow(/Dimensión desconocida/);
  });
});

describe('contrastar', () => {
  const hacer = (cat: string, tasas: number[]) =>
    tasas.map((t, i) =>
      post({ igMediaId: `${cat}${i}`, category: cat, latest: metrics({ reach: 1000, likes: t * 1000 }) }),
    );

  it('con muestras chicas el veredicto es insuficiente, por grande que sea la diferencia', () => {
    const r = skill.contrastar([...hacer('flatlay', [0.09, 0.08, 0.1]), ...hacer('editorial', [0.02, 0.03])], {
      a: 'flatlay',
      b: 'editorial',
    });
    expect(r.factor).toBeGreaterThan(3);
    expect(r.veredicto).toBe('insuficiente');
    expect(r.limitaciones.join(' ')).toContain('menos de 8');
  });

  it('con n suficiente y rangos separados, el veredicto es señal', () => {
    const r = skill.contrastar(
      [
        ...hacer('flatlay', [0.08, 0.085, 0.09, 0.082, 0.088, 0.091, 0.079, 0.086]),
        ...hacer('editorial', [0.02, 0.021, 0.019, 0.022, 0.018, 0.023, 0.02, 0.021]),
      ],
      { a: 'flatlay', b: 'editorial' },
    );
    expect(r.veredicto).toBe('señal');
    expect(r.solapan).toBe(false);
  });

  it('con n suficiente pero rangos solapados, baja a indicio', () => {
    const r = skill.contrastar(
      [
        ...hacer('flatlay', [0.05, 0.06, 0.04, 0.07, 0.03, 0.08, 0.05, 0.06]),
        ...hacer('editorial', [0.045, 0.055, 0.035, 0.065, 0.025, 0.075, 0.045, 0.055]),
      ],
      { a: 'flatlay', b: 'editorial' },
    );
    expect(r.solapan).toBe(true);
    expect(r.veredicto).toBe('indicio');
  });

  it('siempre recuerda que no es causalidad', () => {
    const r = skill.contrastar(hacer('flatlay', [0.05]), { a: 'flatlay', b: 'editorial' });
    expect(r.limitaciones.join(' ')).toContain('no una causa');
  });

  it('un segmento inexistente no rompe: queda en n=0', () => {
    const r = skill.contrastar(hacer('flatlay', [0.05]), { a: 'flatlay', b: 'no-existe' });
    expect(r.b.n).toBe(0);
    expect(r.veredicto).toBe('insuficiente');
  });
});

/* ─── Mezcla editorial ──────────────────────────────────────────────────── */

describe('detectarRepeticion', () => {
  it('marca sobre y sub representación contra la mezcla objetivo', () => {
    const posts = [
      ...Array.from({ length: 8 }, (_, i) => post({ igMediaId: `f${i}`, category: 'flatlay' })),
      ...Array.from({ length: 2 }, (_, i) => post({ igMediaId: `e${i}`, category: 'editorial' })),
    ];
    const r = skill.detectarRepeticion(posts, { ahora: AHORA });
    expect(r.total).toBe(10);
    expect(r.sobrerrepresentadas[0].categoria).toBe('flatlay'); // 80% vs 25% objetivo
    expect(r.subrepresentadas.map((f: { categoria: string }) => f.categoria)).toContain('reel-visual');
  });

  it('detecta la racha de la misma categoría seguida', () => {
    const posts = ['a', 'b', 'c', 'd'].map((id, i) =>
      post({ igMediaId: id, category: 'flatlay', publishedAt: `2026-10-0${i + 1} 12:00:00` }),
    );
    expect(skill.detectarRepeticion(posts, { ahora: AHORA }).rachaMaxima).toEqual({
      categoria: 'flatlay',
      largo: 4,
    });
  });

  it('informa los días desde la última de cada categoría', () => {
    const r = skill.detectarRepeticion(
      [post({ igMediaId: 'x', category: 'ugc', publishedAt: '2026-09-17 18:00:00' })],
      { ahora: AHORA },
    );
    expect(r.filas.find((f: { categoria: string }) => f.categoria === 'ugc').diasDesdeLaUltima).toBe(30);
    expect(r.filas.find((f: { categoria: string }) => f.categoria === 'bts').diasDesdeLaUltima).toBeNull();
  });

  it('con pocas publicaciones clasificadas aclara que la mezcla no dice mucho', () => {
    const r = skill.detectarRepeticion([post({ igMediaId: 'x', category: 'flatlay' })], { ahora: AHORA });
    expect(r.nota).toContain('todavía no dice mucho');
  });
});

/* ─── Confianza ─────────────────────────────────────────────────────────── */

describe('nivelDeConfianza', () => {
  it('n chico ⇒ baja', () => {
    expect(skill.nivelDeConfianza({ n: 3, comparables: 2 }).nivel).toBe('baja');
  });
  it('n justo por encima del mínimo ⇒ media', () => {
    expect(skill.nivelDeConfianza({ n: 10, comparables: 2 }).nivel).toBe('media');
  });
  it('muestra amplia y segmentos separados ⇒ alta', () => {
    const c = skill.nivelDeConfianza({ n: 40, comparables: 3, solapan: false });
    expect(c.nivel).toBe('alta');
    expect(c.razones[0]).toContain('suficiente');
  });
  it('una pauteada dentro de una muestra orgánica tira la confianza al piso', () => {
    const c = skill.nivelDeConfianza({ n: 40, comparables: 3, solapan: false, pauteadasEnMuestra: 1 });
    expect(c.nivel).toBe('baja');
    expect(c.razones.join(' ')).toContain('pauteadas');
  });
  it('rangos solapados bajan la confianza', () => {
    expect(skill.nivelDeConfianza({ n: 40, comparables: 3, solapan: true }).nivel).toBe('media');
  });
  it('distribución sin verificar impide hablar de confianza alta (hallazgo A-a)', () => {
    const c = skill.nivelDeConfianza({
      n: 40,
      comparables: 3,
      solapan: false,
      sinVerificarEnMuestra: 12,
    });
    expect(c.nivel).toBe('media');
    expect(c.razones.join(' ')).toContain('sin verificar');
  });
});

/* ─── Distribución orgánico / pago (sección 5 del encargo) ──────────────── */

describe('distribución sin verificar', () => {
  const conMetricas = (id: string, likes: number, extra: Partial<IgPostRecord> = {}) =>
    post({ igMediaId: id, latest: metrics({ reach: 1000, likes }), ...extra });

  it('verificada sólo si está marcada como pauteada o tiene boostRef', () => {
    expect(skill.distribucionVerificada(post({ igMediaId: '1' }))).toBe(false);
    expect(skill.distribucionVerificada(post({ igMediaId: '2', wasBoosted: true }))).toBe(true);
    expect(
      skill.distribucionVerificada(post({ igMediaId: '3', boostRef: 'ads:2026-10-20:no' })),
    ).toBe(true);
  });

  it('huecos cuenta las que nadie cruzó con Meta Ads', () => {
    const h = skill.huecos([
      conMetricas('1', 50),
      conMetricas('2', 60, { boostRef: 'ads:2026-10-20:no' }),
      conMetricas('3', 70, { wasBoosted: true }),
    ]);
    expect(h.sinVerificar).toBe(1);
  });

  it('contrastar avisa que la diferencia puede ser plata y no contenido', () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) =>
        conMetricas(`a${i}`, 100 + i, { category: 'flatlay' }),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        conMetricas(`b${i}`, 20 + i, { category: 'editorial' }),
      ),
    ];
    const r = skill.contrastar(rows, { dimension: 'categoria', a: 'flatlay', b: 'editorial' });
    expect(r.sinVerificar).toBe(20);
    expect(r.limitaciones.join(' ')).toContain('SIN VERIFICAR');
    // Y sigue sin afirmar causalidad, con señal o sin ella.
    expect(r.limitaciones.join(' ')).toContain('no una causa');
  });
});

/* ─── porProducto respeta el filtro de la consulta (M1) ─────────────────── */

describe('porProducto', () => {
  const rows = [
    post({
      igMediaId: '11',
      caption: 'camo cap nueva',
      latest: metrics({ reach: 1000, likes: 50, saved: 10 }),
    }),
    post({
      igMediaId: '12',
      caption: 'camo cap con pauta',
      wasBoosted: true,
      latest: metrics({ reach: 1000, likes: 300, saved: 90 }),
    }),
  ];

  it('sin opciones mantiene el default orgánico', () => {
    const r = skill.porProducto(rows, { producto: 'camo cap' });
    expect(r.n).toBe(1);
    expect(r.ranking.items[0].pauteada).toBe(false);
  });

  /**
   * El bug M1: `porProducto` ignoraba las opciones de la consulta, así que
   * `--distribucion pago` devolvía igual el universo orgánico.
   */
  it('con --distribucion pago devuelve las pauteadas', () => {
    const r = skill.porProducto(rows, {
      producto: 'camo cap',
      opciones: { distribucion: 'pago' },
    });
    expect(r.n).toBe(1);
    expect(r.ranking.items[0].pauteada).toBe(true);
  });

  it('respeta también el corte por formato', () => {
    const conReel = [
      ...rows,
      post({
        igMediaId: '13',
        caption: 'camo cap en reel',
        mediaProductType: 'REELS',
        mediaType: 'VIDEO',
        latest: metrics({ reach: 1000, likes: 70 }),
      }),
    ];
    expect(
      skill.porProducto(conReel, { producto: 'camo cap', opciones: { formato: 'REELS' } }).n,
    ).toBe(1);
  });
});

/* ─── CLI: paginación completa (corrección C3) ──────────────────────────── */

describe('CLI del skill: cargarReal', () => {
  const TOTAL = 450;
  const TODAS = Array.from({ length: TOTAL }, (_, i) =>
    post({ igMediaId: `184${String(i).padStart(14, '0')}`, latest: metrics({ reach: 1000, likes: 50 + i }) }),
  );

  /** Backend de mentira: respeta limit/offset y devuelve `total`, como el PHP. */
  const backend = (): typeof fetch =>
    (async (url: RequestInfo | URL) => {
      const u = new URL(String(url), 'http://panel.test');
      const limit = Math.min(200, Number(u.searchParams.get('limit')) || 50);
      const offset = Number(u.searchParams.get('offset')) || 0;
      return new Response(
        JSON.stringify({ rows: TODAS.slice(offset, offset + limit), total: TOTAL, fixture: false }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

  it('trae las 450 publicaciones, no sólo la primera página de 200', async () => {
    expect(skillCli.TAMANIO_PAGINA).toBe(200);
    const datos = await skillCli.cargarReal({
      base: 'http://panel.test',
      key: 'clave',
      fetchImpl: backend(),
    });
    expect(datos.rows).toHaveLength(TOTAL);
    expect(datos.total).toBe(TOTAL);
    expect(datos.paginas).toBe(3);
    expect(datos.completo).toBe(true);
    expect(datos.fuente).toBe('REAL');
    expect(datos.sintetico).toBe(false);
  });

  it('con el tope alcanzado avisa que NO es el histórico completo', async () => {
    const datos = await skillCli.cargarReal({
      base: 'http://panel.test',
      key: 'clave',
      fetchImpl: backend(),
      maxPaginas: 1,
    });
    expect(datos.completo).toBe(false);
    expect(datos.aviso).toContain('200 de 450');
    expect(datos.aviso).toContain('NO cubre el histórico completo');
  });

  it('un 403 explica qué falta en lugar de devolver un universo vacío', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    await expect(
      skillCli.cargarReal({ base: 'http://panel.test', key: '', fetchImpl }),
    ).rejects.toThrow(/HYPE_ADMIN_KEY/);
  });
});

/* ─── Dataset demo ──────────────────────────────────────────────────────── */

describe('fixtures del skill', () => {
  it('vienen marcados como sintéticos de forma inequívoca', () => {
    expect(demo.fixture).toBe(true);
    expect(demo._aviso).toContain('SINTÉTICOS');
    expect(demo.rows.every((p) => p.igMediaId.startsWith('999'))).toBe(true);
    expect(demo.rows.every((p) => p.permalink.includes('/p/DEMO'))).toBe(true);
  });

  it('el motor los procesa de punta a punta', () => {
    const universo = skill.filtrar(demo.rows, { dias: null, ahora: AHORA });
    expect(universo.length).toBeGreaterThan(20);
    const r = skill.rankear(universo, { metrica: 'savedReach', limite: 5 });
    expect(r.items).toHaveLength(5);
    expect(r.items[0].valor).toBeGreaterThan(0);
    const seg = skill.compararSegmentos(universo, { dimension: 'portada' });
    expect(seg.segmentos.length).toBeGreaterThan(1);
  });

  it('ninguna pauteada se cuela en el universo orgánico', () => {
    const universo = skill.filtrar(demo.rows, { dias: null, ahora: AHORA });
    expect(universo.some((p: IgPostRecord) => p.wasBoosted)).toBe(false);
  });

  it('porProducto responde con sus límites cuando hay pocas publicaciones', () => {
    const r = skill.porProducto(demo.rows, { producto: 'bermuda-que-no-existe' });
    expect(r.n).toBe(0);
    expect(r.muestraChica).toBe(true);
    expect(r.ranking.items).toHaveLength(0);
  });
});
