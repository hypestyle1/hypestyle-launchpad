/**
 * Corrección C3 de la auditoría: paginación completa de las publicaciones.
 *
 * El backend topea `limit` en 200. Antes la Biblioteca, el Overview y el CLI
 * del skill pedían una sola página de 200 y nadie leía `total`: con el
 * histórico proyectado (~338 publicaciones) eso descartaba en silencio cerca
 * del 40% y la pantalla igual decía "el período".
 *
 * Estos tests usan un backend de mentira con 450 publicaciones — más del
 * doble del tope — y verifican que:
 *  - se traen todas, en varias páginas;
 *  - las medianas cambian cuando se usa el conjunto completo (o sea: el
 *    recorte NO era inofensivo);
 *  - un error en cualquier página TIRA el error, no devuelve un parcial;
 *  - si se alcanza el tope de seguridad, el resultado viene marcado.
 */
import { describe, expect, it } from 'vitest';

import { median } from '@/lib/ig-insights/analytics';
import { avisoDeCobertura, fetchAllIgPosts, PAGE_SIZE } from '@/lib/ig-insights/fetch-all';
import { likesOverReach } from '@/lib/ig-insights/ratios';
import type { IgPostRecord } from '@/lib/ig-insights/types';

const TOTAL = 450;

/**
 * Publicación i. Los likes crecen con el índice, así que la mediana de las
 * primeras 200 es distinta de la mediana de las 450: es el punto del test.
 */
function postFalso(i: number): IgPostRecord {
  return {
    // Como string: un id de media de IG tiene 17-18 dígitos y no entra en el
    // entero seguro de JS (sumarle i perdería precisión y repetiría ids).
    igMediaId: `182${String(i).padStart(14, '0')}`,
    permalink: `https://www.instagram.com/p/p${i}/`,
    publishedAt: `2026-01-01 12:00:00`,
    mediaType: 'IMAGE',
    mediaProductType: 'FEED',
    caption: null,
    isSharedToFeed: null,
    mediaCount: 1,
    coverAttachmentId: null,
    coverUrl: null,
    children: null,
    likeCount: 100 + i,
    commentsCount: 1,
    category: 'flatlay',
    coverType: '',
    visualStyle: '',
    objective: '',
    scenario: '',
    hasModels: '',
    aiUsage: 'none',
    classifiedBy: '',
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
    updatedAt: '2026-01-02 00:00:00',
    latest: {
      takenAt: '2026-01-02 00:00:00',
      ageHours: 36,
      views: 10_000,
      reach: 5_000,
      likes: 100 + i,
      comments: 1,
      saved: 10,
      shares: 2,
      reposts: null,
      totalInteractions: 113 + i,
      profileVisits: 20,
      follows: 2,
      avgWatchTimeMs: null,
      videoViewTotalTimeMs: null,
    },
  };
}

const TODAS = Array.from({ length: TOTAL }, (_, i) => postFalso(i));

/** Backend de mentira: respeta limit/offset y devuelve `total`, como el PHP. */
function backend(opts: { fallarEnPagina?: number; registro?: string[] } = {}): typeof fetch {
  let pedidos = 0;
  return (async (url: RequestInfo | URL) => {
    const u = new URL(String(url), 'http://panel.test');
    opts.registro?.push(u.search);
    pedidos++;
    if (opts.fallarEnPagina === pedidos) {
      return new Response(JSON.stringify({ error: 'WP respondió 502' }), { status: 502 });
    }
    const limit = Math.min(200, Number(u.searchParams.get('limit')) || 50);
    const offset = Number(u.searchParams.get('offset')) || 0;
    return new Response(
      JSON.stringify({ rows: TODAS.slice(offset, offset + limit), total: TOTAL, fixture: false }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
}

describe('fetchAllIgPosts (panel)', () => {
  it('trae las 450 publicaciones en páginas de 200', async () => {
    const registro: string[] = [];
    const r = await fetchAllIgPosts({ since: '2026-01-01 00:00:00' }, {
      fetchImpl: backend({ registro }),
    });
    expect(r.rows).toHaveLength(TOTAL);
    expect(r.total).toBe(TOTAL);
    expect(r.pages).toBe(3);
    expect(r.complete).toBe(true);
    expect(avisoDeCobertura(r)).toBeNull();
    // Los filtros viajan en todas las páginas, con su offset.
    expect(registro).toHaveLength(3);
    expect(registro.every((s) => s.includes('since='))).toBe(true);
    expect(registro[2]).toContain('offset=400');
  });

  it('el recorte a 200 NO era inofensivo: la mediana cambia', async () => {
    const completo = await fetchAllIgPosts({}, { fetchImpl: backend() });
    const recortado = TODAS.slice(0, PAGE_SIZE);
    const medianaDe = (rows: IgPostRecord[]) =>
      median(rows.map((p) => likesOverReach(p.latest ?? {})).filter((v): v is number => v != null));
    expect(medianaDe(completo.rows)).not.toBe(medianaDe(recortado));
  });

  it('un error en la segunda página se TIRA: nunca un parcial disfrazado', async () => {
    await expect(
      fetchAllIgPosts({}, { fetchImpl: backend({ fallarEnPagina: 2 }) }),
    ).rejects.toThrow(/página 2/);
  });

  it('el tope de seguridad deja el resultado marcado como incompleto', async () => {
    const r = await fetchAllIgPosts({}, { fetchImpl: backend(), maxPages: 2 });
    expect(r.rows).toHaveLength(400);
    expect(r.complete).toBe(false);
    expect(r.cappedAt).toBe(400);
    expect(avisoDeCobertura(r)).toContain('400 de 450');
  });

  it('una publicación repetida entre páginas no se cuenta dos veces', async () => {
    const fetchImpl = (async (url: RequestInfo | URL) => {
      const u = new URL(String(url), 'http://panel.test');
      const offset = Number(u.searchParams.get('offset')) || 0;
      // Segunda página corrida en 1: repite la última de la primera.
      const desde = offset === 0 ? 0 : offset - 1;
      return new Response(
        JSON.stringify({ rows: TODAS.slice(desde, desde + 200), total: 400, fixture: false }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const r = await fetchAllIgPosts({}, { fetchImpl });
    expect(new Set(r.rows.map((p) => p.igMediaId)).size).toBe(r.rows.length);
  });
});

// La paginación del CLI del skill (misma corrección, otro consumidor) está en
// `skill-content-intelligence.test.ts`, que es donde vive el motor.
