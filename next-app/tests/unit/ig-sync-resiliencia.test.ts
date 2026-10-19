/**
 * Correcciones C1 y C2 de la auditoría de preproducción.
 *
 * Lo que fijan estos tests:
 *  - un rate limit de Meta CORTA la corrida en lugar de convertirse en
 *    "publicaciones sin insights" (C2);
 *  - cada clase de error se distingue (métrica / temporal / rate limit /
 *    permiso / token / publicación borrada);
 *  - el presupuesto de tiempo corta antes del límite de Vercel y lo que no se
 *    leyó queda PENDIENTE, sin escribirse (C1);
 *  - la página incompleta NO avanza el cursor y dice cómo retomar;
 *  - el backfill redondea `taken_at` a la hora, así el reintento de una página
 *    es idempotente contra la clave única (ig_media_id, taken_at) del
 *    mu-plugin.
 *
 * Todo con fetch mockeado: no se llama a Meta ni a WP.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { resetMetricSupport } from '@/lib/ig-insights/client';
import { classifyIgFailure } from '@/lib/ig-insights/errors';
import { collectBatch, runBackfillPage } from '@/lib/ig-insights/sync';
import type { IgApiMedia } from '@/lib/ig-insights/types';

process.env.INSTAGRAM_ACCESS_TOKEN ||= 'token-de-test';

const NOW = new Date('2026-10-17T18:42:31Z');

function media(i: number, extra: Partial<IgApiMedia> = {}): IgApiMedia {
  const ts = new Date(NOW.getTime() - (400 + i) * 24 * 3_600_000)
    .toISOString()
    .replace(/\.\d+Z$/, '+0000');
  return {
    id: String(18_100_000_000_000_000 + i),
    timestamp: ts,
    media_type: 'CAROUSEL_ALBUM',
    media_product_type: 'FEED',
    permalink: `https://www.instagram.com/p/x${i}/`,
    like_count: 100 + i,
    comments_count: i,
    ...extra,
  };
}

const INSIGHTS_OK = {
  data: [
    { name: 'views', values: [{ value: 1000 }] },
    { name: 'reach', values: [{ value: 400 }] },
    { name: 'saved', values: [{ value: 5 }] },
    { name: 'shares', values: [{ value: 2 }] },
    { name: 'total_interactions', values: [{ value: 120 }] },
    { name: 'profile_visits', values: [{ value: 10 }] },
    { name: 'follows', values: [{ value: 1 }] },
  ],
};

function fetchFalso(opts: {
  page?: { data: IgApiMedia[]; paging?: unknown };
  insights?: (mediaId: string) => { status: number; body: unknown };
}): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes('/media?')) {
      return new Response(JSON.stringify(opts.page ?? { data: [] }), { status: 200 });
    }
    const match = u.match(/\/(\d+)\/insights/);
    if (match && opts.insights) {
      const { status, body } = opts.insights(match[1]);
      return new Response(JSON.stringify(body), { status });
    }
    return new Response(JSON.stringify(INSIGHTS_OK), { status: 200 });
  }) as unknown as typeof fetch;
}

const errorConCodigo = (code: number, message = 'x', status = 400) => ({
  status,
  body: { error: { message, code } },
});

beforeEach(() => resetMetricSupport());

/* ─── clasificación ─────────────────────────────────────────────────────── */

describe('classifyIgFailure', () => {
  it('distingue las cinco situaciones que pide la auditoría', () => {
    expect(classifyIgFailure({ code: 190, httpStatus: 400 })).toMatchObject({
      kind: 'token',
      abort: true,
    });
    expect(classifyIgFailure({ code: 10, httpStatus: 403 })).toMatchObject({
      kind: 'permiso',
      abort: true,
    });
    for (const code of [4, 17, 32, 613]) {
      expect(classifyIgFailure({ code, httpStatus: 400 }), `código ${code}`).toMatchObject({
        kind: 'rate-limit',
        abort: true,
        retry: false,
      });
    }
    expect(classifyIgFailure({ code: null, httpStatus: 429 })).toMatchObject({
      kind: 'rate-limit',
      abort: true,
    });
    expect(classifyIgFailure({ code: 100, message: 'metric no soportada' })).toMatchObject({
      kind: 'metrica',
      abort: false,
      durable: true,
    });
    expect(
      classifyIgFailure({ code: 100, message: 'Object with ID does not exist' }),
    ).toMatchObject({ kind: 'inexistente', durable: true });
    expect(classifyIgFailure({ code: 2, httpStatus: 500 })).toMatchObject({
      kind: 'temporal',
      retry: true,
      durable: false,
    });
    expect(classifyIgFailure(new TypeError('fetch failed'))).toMatchObject({ kind: 'temporal' });
  });
});

/* ─── C2: rate limits ───────────────────────────────────────────────────── */

describe('rate limits (C2)', () => {
  for (const code of [4, 17, 32, 613]) {
    it(`el código ${code} aborta la corrida y no deja huecos`, async () => {
      const lista = [media(1), media(2), media(3)];
      await expect(
        collectBatch(lista, {
          now: NOW,
          wantInsights: () => true,
          throttleMs: 0,
          backoffMs: [0],
          fetchImpl: fetchFalso({
            insights: (id) =>
              id === lista[1].id
                ? errorConCodigo(code, 'rate limit')
                : { status: 200, body: INSIGHTS_OK },
          }),
        }),
      ).rejects.toMatchObject({ code });
    });
  }

  it('un HTTP 429 sin código también aborta', async () => {
    await expect(
      collectBatch([media(1)], {
        now: NOW,
        wantInsights: () => true,
        throttleMs: 0,
        fetchImpl: fetchFalso({ insights: () => ({ status: 429, body: { error: {} } }) }),
      }),
    ).rejects.toThrow();
  });

  it('un error temporal se reintenta antes de darlo por pendiente', async () => {
    let intentos = 0;
    const batch = await collectBatch([media(1)], {
      now: NOW,
      wantInsights: () => true,
      throttleMs: 0,
      backoffMs: [0, 0],
      fetchImpl: fetchFalso({
        insights: () => {
          intentos++;
          return intentos < 3
            ? errorConCodigo(2, 'temporarily unavailable', 500)
            : { status: 200, body: INSIGHTS_OK };
        },
      }),
    });
    expect(intentos).toBe(3);
    expect(batch.snapshots).toHaveLength(1);
    expect(batch.pendientes).toHaveLength(0);
  });

  it('una publicación borrada en Meta es hueco definitivo y no se guarda', async () => {
    const batch = await collectBatch([media(1)], {
      now: NOW,
      wantInsights: () => true,
      throttleMs: 0,
      fetchImpl: fetchFalso({
        insights: () =>
          errorConCodigo(100, 'Unsupported get request. Object with ID does not exist'),
      }),
    });
    expect(batch.posts).toHaveLength(0);
    expect(batch.skipped[0]).toMatchObject({ kind: 'inexistente' });
  });
});

/* ─── C1: presupuesto de tiempo y reanudación ───────────────────────────── */

describe('presupuesto de tiempo (C1)', () => {
  it('lo que no entra en el presupuesto queda pendiente, no escrito', async () => {
    const lista = [media(1), media(2), media(3), media(4)];
    // Presupuesto ya agotado: ninguna lectura entra (el costo estimado por
    // publicación es 1,2 s).
    const batch = await collectBatch(lista, {
      now: NOW,
      wantInsights: () => true,
      throttleMs: 0,
      deadlineAt: Date.now() + 100,
      fetchImpl: fetchFalso({}),
    });
    expect(batch.posts).toHaveLength(0);
    expect(batch.snapshots).toHaveLength(0);
    expect(batch.pendientes).toHaveLength(4);
    expect(batch.pendientes.every((p) => p.kind === 'presupuesto')).toBe(true);
    expect(batch.stoppedEarly).toBe(true);
  });

  it('las publicaciones que no esperan métricas se guardan igual', async () => {
    const batch = await collectBatch([media(1), media(2)], {
      now: NOW,
      wantInsights: () => false,
      throttleMs: 0,
      deadlineAt: Date.now() + 100,
      fetchImpl: fetchFalso({}),
    });
    expect(batch.posts).toHaveLength(2);
    expect(batch.pendientes).toHaveLength(0);
    expect(batch.stoppedEarly).toBe(false);
  });

  it('página incompleta: NO avanza el cursor y dice cómo retomar', async () => {
    const lista = [media(1), media(2)];
    const batch = await runBackfillPage({
      now: NOW,
      throttleMs: 0,
      deadlineAt: Date.now() + 100,
      after: 'CURSOR-ACTUAL',
      fetchImpl: fetchFalso({
        page: { data: lista, paging: { cursors: { after: 'SIGUIENTE' }, next: 'https://…' } },
      }),
    });
    expect(batch.complete).toBe(false);
    expect(batch.nextAfter).toBeNull(); // el runner no debe avanzar
    expect(batch.resume.after).toBe('CURSOR-ACTUAL');
  });

  it('página completa: avanza el cursor y queda completa', async () => {
    const batch = await runBackfillPage({
      now: NOW,
      throttleMs: 0,
      deadlineAt: Date.now() + 600_000,
      fetchImpl: fetchFalso({
        page: {
          data: [media(1), media(2)],
          paging: { cursors: { after: 'SIGUIENTE' }, next: 'https://…' },
        },
      }),
    });
    expect(batch.complete).toBe(true);
    expect(batch.nextAfter).toBe('SIGUIENTE');
    expect(batch.resume).toEqual({ after: 'SIGUIENTE', until: null });
    expect(batch.stats.insightCalls).toBeGreaterThan(0);
  });

  it('retomar por fecha: `until` apunta a la publicación más vieja resuelta', async () => {
    const lista = [media(1), media(2), media(3)];
    const batch = await runBackfillPage({
      now: NOW,
      throttleMs: 0,
      fetchImpl: fetchFalso({
        page: { data: lista, paging: { cursors: { after: 'SIGUIENTE' }, next: 'https://…' } },
        insights: (id) =>
          id === lista[2].id
            ? errorConCodigo(2, 'temporarily unavailable', 500)
            : { status: 200, body: INSIGHTS_OK },
      }),
      backoffMs: [0],
    });
    expect(batch.complete).toBe(false);
    expect(batch.pendientes).toHaveLength(1);
    const esperado = Math.floor(new Date(lista[1].timestamp as string).getTime() / 1000);
    expect(batch.resume.until).toBe(String(esperado));
  });
});

/* ─── idempotencia del reintento ────────────────────────────────────────── */

describe('idempotencia del backfill', () => {
  it('dos corridas de la misma página en la misma hora dan el mismo takenAt', async () => {
    const page = {
      data: [media(1), media(2)],
      paging: { cursors: { after: 'S' }, next: 'https://…' },
    };
    const a = await runBackfillPage({
      now: new Date('2026-10-17T18:03:11Z'),
      throttleMs: 0,
      fetchImpl: fetchFalso({ page }),
    });
    const b = await runBackfillPage({
      now: new Date('2026-10-17T18:57:49Z'),
      throttleMs: 0,
      fetchImpl: fetchFalso({ page }),
    });
    expect(a.snapshots.map((s) => s.takenAt)).toEqual(b.snapshots.map((s) => s.takenAt));
    expect(a.snapshots[0].takenAt).toBe('2026-10-17 18:00:00');
  });
});
