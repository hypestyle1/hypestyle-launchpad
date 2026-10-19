/**
 * `GET /api/admin/ig-sync` — contrato de la ruta después de las correcciones
 * C1 y C2.
 *
 * Lo que fija:
 *  - `maxDuration = 60` (sin esto la función muere en el default de Vercel y
 *    una página de backfill queda escrita a medias);
 *  - sigue cerrada sin autorización y el modo write sigue detrás de
 *    IG_SYNC_WRITE (gate B2);
 *  - la respuesta dry informa `complete`, `resume` y `pendientes`, que es lo
 *    que mira quien corre el backfill para saber si puede avanzar el cursor;
 *  - un rate limit sale como 429 con su clase de error, no como una corrida
 *    exitosa con huecos.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IgApiMedia } from '@/lib/ig-insights/types';

let autorizado = true;
vi.mock('@/lib/admin-auth', () => ({
  authorizeAdmin: async () => (autorizado ? { seccion: 'creadores' } : null),
}));

const NOW = Date.now();

function media(i: number, extra: Partial<IgApiMedia> = {}): IgApiMedia {
  return {
    id: `183${String(i).padStart(14, '0')}`,
    timestamp: new Date(NOW - (400 + i) * 24 * 3_600_000).toISOString().replace(/\.\d+Z$/, '+0000'),
    media_type: 'IMAGE',
    media_product_type: 'FEED',
    permalink: `https://www.instagram.com/p/r${i}/`,
    like_count: 10,
    comments_count: 1,
    ...extra,
  };
}

const INSIGHTS_OK = {
  data: [
    { name: 'views', values: [{ value: 900 }] },
    { name: 'reach', values: [{ value: 500 }] },
    { name: 'saved', values: [{ value: 4 }] },
    { name: 'shares', values: [{ value: 1 }] },
    { name: 'total_interactions', values: [{ value: 60 }] },
    { name: 'profile_visits', values: [{ value: 8 }] },
    { name: 'follows', values: [{ value: 1 }] },
  ],
};

function stubMeta(insights: () => { status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes('/media?')) {
        return new Response(
          JSON.stringify({
            data: [media(1), media(2)],
            paging: { cursors: { after: 'SIGUIENTE' }, next: 'https://…' },
          }),
          { status: 200 },
        );
      }
      const { status, body } = insights();
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

const llamar = async (qs: string) => {
  const { GET } = await import('@/app/api/admin/ig-sync/route');
  return GET(new NextRequest(`http://localhost/api/admin/ig-sync${qs}`));
};

beforeEach(() => {
  autorizado = true;
  process.env.INSTAGRAM_ACCESS_TOKEN ||= 'token-de-test';
  delete process.env.IG_SYNC_WRITE;
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/admin/ig-sync', () => {
  it('declara maxDuration = 60 (corrección C1)', async () => {
    const mod = await import('@/app/api/admin/ig-sync/route');
    expect(mod.maxDuration).toBe(60);
    expect(mod.dynamic).toBe('force-dynamic');
  });

  it('sin autorización responde 401 y no habla con Meta', async () => {
    autorizado = false;
    const pedidos: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (u: unknown) => {
      pedidos.push(String(u));
      return new Response('{}', { status: 200 });
    }));
    const res = await llamar('?scope=backfill');
    expect(res.status).toBe(401);
    expect(pedidos).toEqual([]);
  });

  it('modo write sigue cerrado sin IG_SYNC_WRITE (gate B2)', async () => {
    const res = await llamar('?scope=backfill&mode=write');
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('IG_SYNC_WRITE');
  });

  it('dry informa completitud, cursor y cómo retomar', async () => {
    stubMeta(() => ({ status: 200, body: INSIGHTS_OK }));
    const res = await llamar('?scope=backfill&limit=2');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe('dry');
    expect(body.complete).toBe(true);
    expect(body.nextAfter).toBe('SIGUIENTE');
    expect(body.resume).toEqual({ after: 'SIGUIENTE', until: null });
    expect(body.counts).toMatchObject({ posts: 2, snapshots: 2, pendientes: 0 });
    expect(body.stats.insightCalls).toBeGreaterThan(0);
  });

  it('un rate limit sale como 429 clasificado, no como corrida con huecos', async () => {
    stubMeta(() => ({
      status: 400,
      body: { error: { message: 'Application request limit reached', code: 4 } },
    }));
    const res = await llamar('?scope=backfill&limit=2&after=CURSOR');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.igErrorKind).toBe('rate-limit');
    expect(body.igErrorCode).toBe(4);
    expect(body.aborted).toBe(true);
    expect(body.resume.after).toBe('CURSOR');
    expect(body.retryAfterHint).toContain('hora');
  });

  it('un token vencido sale como 502 con su clase', async () => {
    stubMeta(() => ({
      status: 400,
      body: { error: { message: 'Invalid OAuth access token.', code: 190 } },
    }));
    const res = await llamar('?scope=backfill&limit=2');
    expect(res.status).toBe(502);
    expect((await res.json()).igErrorKind).toBe('token');
  });
});
