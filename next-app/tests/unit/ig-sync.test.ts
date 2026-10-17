/**
 * Content Intelligence — orquestación del sync/backfill y escritura a WP.
 * Todo con fetch mockeado: acá no se llama a Meta ni a WP de verdad.
 */
import { describe, expect, it } from 'vitest';

import {
  ageHoursOf,
  collectBatch,
  runBackfillPage,
  runRecentSync,
  shouldRefresh,
} from '@/lib/ig-insights/sync';
import { pushPosts, pushSnapshots, syncWriteEnabled, WpStoreError } from '@/lib/ig-insights/wp-store';
import type { IgApiMedia, IgPostInput } from '@/lib/ig-insights/types';

process.env.INSTAGRAM_ACCESS_TOKEN ||= 'token-de-test';

const NOW = new Date('2026-10-17T18:00:00Z');

function media(horasAtras: number, extra: Partial<IgApiMedia> = {}): IgApiMedia {
  const ts = new Date(NOW.getTime() - horasAtras * 3_600_000)
    .toISOString()
    .replace(/\.\d+Z$/, '+0000');
  return {
    id: String(18_000_000_000_000_000 + Math.round(horasAtras * 1000)),
    timestamp: ts,
    media_type: 'CAROUSEL_ALBUM',
    media_product_type: 'FEED',
    permalink: 'https://www.instagram.com/p/x/',
    like_count: 10,
    comments_count: 1,
    ...extra,
  };
}

const INSIGHTS_OK = {
  data: [
    { name: 'views', values: [{ value: 1000 }] },
    { name: 'reach', values: [{ value: 400 }] },
    { name: 'saved', values: [{ value: 5 }] },
    { name: 'shares', values: [{ value: 2 }] },
  ],
};

/** fetch de mentira ruteado por URL: /media → página, /insights → por id. */
function fetchFalso(opts: {
  page?: { data: IgApiMedia[]; paging?: unknown };
  insights?: (mediaId: string) => { status: number; body: unknown };
  registro?: string[];
}): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    const u = String(url);
    opts.registro?.push(u.split('?')[0]);
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

/* ─── ventanas de frescura ──────────────────────────────────────────────── */

describe('shouldRefresh', () => {
  it('posts de <72 h entran siempre', () => {
    expect(shouldRefresh(media(2), NOW, false)).toBe(true);
    expect(shouldRefresh(media(71), NOW, false)).toBe(true);
  });
  it('entre 72 h y 30 días sólo en la corrida daily', () => {
    expect(shouldRefresh(media(100), NOW, false)).toBe(false);
    expect(shouldRefresh(media(100), NOW, true)).toBe(true);
    expect(shouldRefresh(media(29 * 24), NOW, true)).toBe(true);
  });
  it('más de 30 días no se refresca ni en daily', () => {
    expect(shouldRefresh(media(31 * 24), NOW, true)).toBe(false);
  });
  it('stories sólo mientras viven (24 h); AD nunca', () => {
    expect(shouldRefresh(media(3, { media_product_type: 'STORY' }), NOW, false)).toBe(true);
    expect(shouldRefresh(media(30, { media_product_type: 'STORY' }), NOW, true)).toBe(false);
    expect(shouldRefresh(media(2, { media_product_type: 'AD' }), NOW, false)).toBe(false);
  });
  it('sin fecha no se puede decidir → false', () => {
    expect(ageHoursOf({ id: '1' } as IgApiMedia, NOW)).toBeNull();
    expect(shouldRefresh({ id: '1' } as IgApiMedia, NOW, true)).toBe(false);
  });
});

/* ─── collectBatch: aislamiento de errores ──────────────────────────────── */

describe('collectBatch', () => {
  it('un post con insights rotos queda en skipped y el resto sigue', async () => {
    const lista = [media(5), media(10), media(20)];
    const roto = lista[1].id;
    const batch = await collectBatch(lista, {
      now: NOW,
      wantInsights: () => true,
      throttleMs: 0,
      fetchImpl: fetchFalso({
        insights: (id) =>
          id === roto
            ? { status: 500, body: { error: { message: 'boom', code: 2 } } }
            : { status: 200, body: INSIGHTS_OK },
      }),
    });
    expect(batch.posts).toHaveLength(3); // el upsert del post va igual
    expect(batch.snapshots).toHaveLength(2);
    expect(batch.skipped).toHaveLength(1);
    expect(batch.skipped[0].id).toBe(roto);
  });

  it('token vencido (190) ABORTA la corrida: no se acumulan huecos falsos', async () => {
    await expect(
      collectBatch([media(5)], {
        now: NOW,
        wantInsights: () => true,
        throttleMs: 0,
        fetchImpl: fetchFalso({
          insights: () => ({
            status: 400,
            body: { error: { message: 'Invalid OAuth access token.', code: 190 } },
          }),
        }),
      }),
    ).rejects.toMatchObject({ code: 190 });
  });

  it('media sin fecha queda reportado como hueco', async () => {
    const batch = await collectBatch([{ id: '123456' } as IgApiMedia], {
      now: NOW,
      wantInsights: () => true,
      throttleMs: 0,
      fetchImpl: fetchFalso({}),
    });
    expect(batch.posts).toHaveLength(0);
    expect(batch.skipped[0].reason).toContain('incompleto');
  });
});

/* ─── corridas ──────────────────────────────────────────────────────────── */

describe('runRecentSync', () => {
  it('upsertea todos los posts pero lee insights sólo de los que están en ventana', async () => {
    const registro: string[] = [];
    const batch = await runRecentSync({
      now: NOW,
      throttleMs: 0,
      fetchImpl: fetchFalso({
        page: { data: [media(5), media(100), media(40 * 24)] },
        registro,
      }),
    });
    expect(batch.posts).toHaveLength(3);
    expect(batch.snapshots).toHaveLength(1); // sólo el de 5 h (daily=false)
    expect(registro.filter((u) => u.includes('/insights'))).toHaveLength(1);
  });

  it('daily=true suma los de <30 días', async () => {
    const batch = await runRecentSync({
      now: NOW,
      daily: true,
      throttleMs: 0,
      fetchImpl: fetchFalso({ page: { data: [media(5), media(100), media(40 * 24)] } }),
    });
    expect(batch.snapshots).toHaveLength(2);
  });
});

describe('runBackfillPage', () => {
  it('pagina con cursor, lee FEED/REELS y reporta stories vencidas como hueco', async () => {
    const batch = await runBackfillPage({
      now: NOW,
      throttleMs: 0,
      fetchImpl: fetchFalso({
        page: {
          data: [
            media(400 * 24),
            media(401 * 24, { media_product_type: 'REELS', media_type: 'VIDEO' }),
            media(402 * 24, { media_product_type: 'STORY' }),
          ],
          paging: { cursors: { after: 'SIGUIENTE' }, next: 'https://…' },
        },
      }),
    });
    expect(batch.posts).toHaveLength(3);
    expect(batch.snapshots).toHaveLength(2); // story vieja: sin insights
    expect(batch.nextAfter).toBe('SIGUIENTE');
    expect(batch.skipped.some((s) => s.reason.includes('story vencida'))).toBe(true);
  });

  it('última página → nextAfter null (condición de corte del runner)', async () => {
    const batch = await runBackfillPage({
      now: NOW,
      throttleMs: 0,
      fetchImpl: fetchFalso({ page: { data: [media(500 * 24)] } }),
    });
    expect(batch.nextAfter).toBeNull();
  });
});

/* ─── wp-store ──────────────────────────────────────────────────────────── */

describe('wp-store', () => {
  const post = (id: string): IgPostInput => ({
    igMediaId: id,
    publishedAt: '2026-10-13 22:35:01',
    mediaType: 'CAROUSEL_ALBUM',
    mediaProductType: 'FEED',
    permalink: '',
    caption: null,
    isSharedToFeed: null,
    mediaCount: 1,
    likeCount: null,
    commentsCount: null,
    children: null,
  });

  it('syncWriteEnabled está APAGADO por defecto (gate B2)', () => {
    expect(process.env.IG_SYNC_WRITE).not.toBe('1');
    expect(syncWriteEnabled()).toBe(false);
  });

  it('troza en lotes de 100 y acumula resultados', async () => {
    const tamanios: number[] = [];
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { items: unknown[] };
      tamanios.push(body.items.length);
      return new Response(
        JSON.stringify({ ok: true, created: body.items.length, updated: 0, rejected: [] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const items = Array.from({ length: 230 }, (_, i) => post(String(18_000_000_000_000_000 + i)));
    const r = await pushPosts(items, fetchImpl);
    expect(tamanios).toEqual([100, 100, 30]);
    expect(r.created).toBe(230);
  });

  it('404 de WP = mu-plugin sin desplegar → error claro con gate B1', async () => {
    const fetchImpl = (async () => new Response('not found', { status: 404 })) as unknown as typeof fetch;
    await expect(pushSnapshots([], fetchImpl)).resolves.toEqual({
      inserted: 0,
      skipped: 0,
      rejected: [],
    }); // sin items no llama
    await expect(pushPosts([post('180000000000000001')], fetchImpl)).rejects.toMatchObject({
      notDeployed: true,
    });
    await expect(pushPosts([post('180000000000000001')], fetchImpl)).rejects.toBeInstanceOf(
      WpStoreError,
    );
  });
});
