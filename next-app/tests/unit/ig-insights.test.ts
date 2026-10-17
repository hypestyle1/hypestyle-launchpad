/**
 * Content Intelligence — cliente de la Graph API, normalización y ratios.
 * Los fixtures reproducen respuestas REALES de la cuenta (17/10/2026),
 * recortadas: un carrusel con insights completos y un reel con watch time.
 */
import { describe, expect, it } from 'vitest';

import {
  fetchMediaInsights,
  fetchMediaPage,
  IgApiError,
  INSIGHT_METRICS,
} from '@/lib/ig-insights/client';
import { mediaToPostInput, toMysqlUtc, toSnapshotInput } from '@/lib/ig-insights/normalize';
import {
  engagementOverReach,
  likesOverReach,
  likesOverViews,
  ratio,
  savedOverReach,
  viewsPerReach,
} from '@/lib/ig-insights/ratios';
import type { IgApiMedia } from '@/lib/ig-insights/types';

process.env.INSTAGRAM_ACCESS_TOKEN ||= 'token-de-test';

/* ─── Fixtures (shape real de la API, 17/10/2026) ───────────────────────── */

const CARRUSEL: IgApiMedia = {
  id: '17981913684090341',
  media_type: 'CAROUSEL_ALBUM',
  media_product_type: 'FEED',
  timestamp: '2026-10-13T22:35:01+0000',
  like_count: 4153,
  comments_count: 21,
  permalink: 'https://www.instagram.com/p/Dec5RO5EcvU/',
  caption: 'CAMO SET en la prueba de sonido',
  children: {
    data: [
      { id: '18026661395872343', media_type: 'IMAGE', media_url: 'https://cdn.example/1.jpg' },
      { id: '18570376000079998', media_type: 'IMAGE', media_url: 'https://cdn.example/2.jpg' },
    ],
  },
};

/** Respuesta de /insights del carrusel: shape {data:[{name, values:[{value}]}]}. */
const INSIGHTS_CARRUSEL = {
  data: [
    { name: 'views', period: 'lifetime', values: [{ value: 62089 }] },
    { name: 'reach', period: 'lifetime', values: [{ value: 24507 }] },
    { name: 'saved', period: 'lifetime', values: [{ value: 97 }] },
    { name: 'shares', period: 'lifetime', values: [{ value: 110 }] },
    { name: 'total_interactions', period: 'lifetime', values: [{ value: 4694 }] },
    { name: 'profile_visits', period: 'lifetime', values: [{ value: 310 }] },
    { name: 'follows', period: 'lifetime', values: [{ value: 24 }] },
  ],
};

function fetchDevolviendo(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

/* ─── normalize ─────────────────────────────────────────────────────────── */

describe('toMysqlUtc', () => {
  it('convierte el formato de la Graph API a MySQL/UTC', () => {
    expect(toMysqlUtc('2026-10-13T22:35:01+0000')).toBe('2026-10-13 22:35:01');
  });
  it('respeta el offset no-UTC', () => {
    expect(toMysqlUtc('2026-10-13T19:35:01-0300')).toBe('2026-10-13 22:35:01');
  });
  it('basura o vacío → null', () => {
    expect(toMysqlUtc('ayer')).toBeNull();
    expect(toMysqlUtc(undefined)).toBeNull();
  });
});

describe('mediaToPostInput', () => {
  it('mapea un carrusel real completo', () => {
    const post = mediaToPostInput(CARRUSEL);
    expect(post).not.toBeNull();
    expect(post!.igMediaId).toBe('17981913684090341');
    expect(post!.publishedAt).toBe('2026-10-13 22:35:01');
    expect(post!.mediaCount).toBe(2);
    expect(post!.likeCount).toBe(4153);
    expect(post!.children).toEqual([
      { id: '18026661395872343', mediaType: 'IMAGE' },
      { id: '18570376000079998', mediaType: 'IMAGE' },
    ]);
    // media_url NO se persiste: las URLs del CDN de Meta expiran.
    expect(JSON.stringify(post)).not.toContain('cdn.example');
  });

  it('isSharedToFeed ausente queda null (no false): sólo los reels lo traen', () => {
    expect(mediaToPostInput(CARRUSEL)!.isSharedToFeed).toBeNull();
    const reel = { ...CARRUSEL, media_product_type: 'REELS', is_shared_to_feed: false };
    expect(mediaToPostInput(reel)!.isSharedToFeed).toBe(false);
  });

  it('sin fecha o sin tipo → null (se saltea, no se guarda cojo)', () => {
    expect(mediaToPostInput({ ...CARRUSEL, timestamp: undefined })).toBeNull();
    expect(mediaToPostInput({ ...CARRUSEL, media_type: undefined })).toBeNull();
  });
});

describe('toSnapshotInput', () => {
  const takenAt = new Date('2026-10-17T18:00:00Z');

  it('mezcla media (likes/comments) con insights (el resto)', () => {
    const snap = toSnapshotInput(
      CARRUSEL,
      { views: 62089, reach: 24507, saved: 97, shares: 110, total_interactions: 4694, profile_visits: 310, follows: 24 },
      takenAt,
    );
    expect(snap.takenAt).toBe('2026-10-17 18:00:00');
    expect(snap.metrics.views).toBe(62089);
    expect(snap.metrics.likes).toBe(4153); // del media, no de insights
    expect(snap.metrics.follows).toBe(24);
    // publicado 13/10 22:35 UTC → 17/10 18:00 UTC = 91 h y pico
    expect(snap.ageHours).toBe(91);
  });

  it('métrica ausente = null, NUNCA 0', () => {
    const snap = toSnapshotInput(CARRUSEL, { views: 62089 }, takenAt);
    expect(snap.metrics.reach).toBeNull();
    expect(snap.metrics.saved).toBeNull();
    expect(snap.metrics.avgWatchTimeMs).toBeNull();
    expect(snap.metrics.views).toBe(62089);
  });

  it('0 medido se conserva como 0', () => {
    const snap = toSnapshotInput(CARRUSEL, { shares: 0 }, takenAt);
    expect(snap.metrics.shares).toBe(0);
  });
});

/* ─── ratios ────────────────────────────────────────────────────────────── */

describe('ratios', () => {
  const m = { views: 62089, reach: 24507, likes: 4153, comments: 21, saved: 97, shares: 110 };

  it('likes/reach es el KPI principal; likes/views la secundaria — y difieren', () => {
    expect(likesOverReach(m)).toBeCloseTo(4153 / 24507, 6);
    expect(likesOverViews(m)).toBeCloseTo(4153 / 62089, 6);
    // El denominador views (repeticiones) achica el ratio ~2,5× en este post real:
    // por esto views no sirve para comparar posts entre sí.
    expect(likesOverViews(m)!).toBeLessThan(likesOverReach(m)! / 2);
  });

  it('ER/reach suma las cuatro interacciones', () => {
    expect(engagementOverReach(m)).toBeCloseTo((4153 + 21 + 97 + 110) / 24507, 6);
  });

  it('con una interacción ausente, ER es null (no se subestima)', () => {
    expect(engagementOverReach({ ...m, saved: null })).toBeNull();
  });

  it('insumo ausente o denominador 0 → null', () => {
    expect(ratio(10, null)).toBeNull();
    expect(ratio(null, 100)).toBeNull();
    expect(ratio(10, 0)).toBeNull();
    expect(savedOverReach({})).toBeNull();
  });

  it('views/reach mide profundidad (repeticiones promedio)', () => {
    expect(viewsPerReach(m)).toBeCloseTo(62089 / 24507, 4);
  });
});

/* ─── client ────────────────────────────────────────────────────────────── */

describe('fetchMediaPage', () => {
  it('parsea items y cursor cuando hay página siguiente', async () => {
    const body = {
      data: [CARRUSEL],
      paging: { cursors: { after: 'CURSOR' }, next: 'https://graph.facebook.com/...' },
    };
    const page = await fetchMediaPage({ fetchImpl: fetchDevolviendo(200, body) });
    expect(page.items).toHaveLength(1);
    expect(page.after).toBe('CURSOR');
  });

  it('última página: cursor presente pero sin next → after null', async () => {
    const body = { data: [CARRUSEL], paging: { cursors: { after: 'CURSOR' } } };
    const page = await fetchMediaPage({ fetchImpl: fetchDevolviendo(200, body) });
    expect(page.after).toBeNull();
  });

  it('error de la API se tira con código (no se disfraza de página vacía)', async () => {
    const body = { error: { message: 'Invalid OAuth access token.', code: 190 } };
    await expect(fetchMediaPage({ fetchImpl: fetchDevolviendo(400, body) })).rejects.toThrow(
      IgApiError,
    );
    await expect(
      fetchMediaPage({ fetchImpl: fetchDevolviendo(400, body) }),
    ).rejects.toMatchObject({ code: 190 });
  });
});

describe('fetchMediaInsights', () => {
  it('mapea la respuesta real a métrica → valor', async () => {
    const values = await fetchMediaInsights(
      '17981913684090341',
      'FEED',
      fetchDevolviendo(200, INSIGHTS_CARRUSEL),
    );
    expect(values.views).toBe(62089);
    expect(values.follows).toBe(24);
    expect(values.reposts).toBeUndefined(); // no vino → no aparece (null aguas abajo)
  });

  it('si una métrica optional da (#100), reintenta sólo con las verificadas', async () => {
    const llamadas: string[] = [];
    const fetchImpl = (async (url: RequestInfo | URL) => {
      const metric = new URL(String(url)).searchParams.get('metric') ?? '';
      llamadas.push(metric);
      if (metric.includes('reposts')) {
        return new Response(
          JSON.stringify({ error: { message: 'metric[7] must be one of…', code: 100 } }),
          { status: 400 },
        );
      }
      return new Response(JSON.stringify(INSIGHTS_CARRUSEL), { status: 200 });
    }) as unknown as typeof fetch;

    const values = await fetchMediaInsights('17981913684090341', 'FEED', fetchImpl);
    expect(llamadas).toHaveLength(2);
    expect(llamadas[1]).toBe(INSIGHT_METRICS.FEED.base.join(','));
    expect(values.views).toBe(62089);
  });

  it('un error de token NO se degrada a base: se tira', async () => {
    const body = { error: { message: 'Invalid OAuth access token.', code: 190 } };
    await expect(
      fetchMediaInsights('17981913684090341', 'FEED', fetchDevolviendo(400, body)),
    ).rejects.toMatchObject({ code: 190 });
  });

  it('tipo sin insights orgánicos (AD) → mapa vacío sin llamar a la API', async () => {
    const values = await fetchMediaInsights('1', 'AD', (() => {
      throw new Error('no debería llamarse');
    }) as unknown as typeof fetch);
    expect(values).toEqual({});
  });
});
