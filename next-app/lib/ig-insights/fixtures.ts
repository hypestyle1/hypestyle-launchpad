/**
 * DATOS DE PRUEBA de Content Intelligence (requisito 9 del encargo de PR-4/5).
 *
 * Se sirven ÚNICAMENTE cuando WP responde 404 en /ig-posts — es decir, mientras
 * el mu-plugin no esté desplegado (gate B1) — y la respuesta viaja con
 * `fixture: true`, que el panel convierte en un banner ámbar permanente.
 *
 * NADA de esto existe en Instagram: los IDs empiezan con 999, los permalinks
 * apuntan a /p/DEMO…, y las métricas son sintéticas generadas con un PRNG
 * determinista (mismo dataset en cada corrida y en los tests). Las magnitudes
 * están calibradas a los órdenes reales de la cuenta (reach 3–60k, ER 2–20%)
 * para que la UI se vea como se va a ver — no para "demostrar" ninguna
 * hipótesis creativa.
 */

import type { IgPostRecord, IgSnapshotMetrics, IgSnapshotRecord } from './types';

/** PRNG determinista (mulberry32): mismo seed → mismo dataset. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Perfil = {
  category: string;
  coverType: string;
  visualStyle: string;
  scenario: string;
  productType: 'FEED' | 'REELS';
  mediaType: 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO';
  /** Multiplicadores de reach / tasa de like / tasa de guardado. */
  mReach: number;
  mLike: number;
  mSave: number;
  caption: string;
};

// Mezcla verosímil de los formatos reales del feed de Hype. Los multiplicadores
// generan VARIEDAD entre categorías (para que las tablas digan algo), no un
// resultado prearmado a favor de ninguna hipótesis.
const PERFILES: Perfil[] = [
  { category: 'flatlay',       coverType: 'producto-piso',   visualStyle: 'luz-natural', scenario: 'piso-cemento',   productType: 'FEED',  mediaType: 'CAROUSEL_ALBUM', mReach: 0.7, mLike: 1.5, mSave: 1.7, caption: 'Camo Cap Grey disponible en la web.\n\nHype® STYLE&CULTURE' },
  { category: 'editorial',     coverType: 'modelo-editorial',visualStyle: 'estudio',     scenario: 'exterior-urbano',productType: 'FEED',  mediaType: 'CAROUSEL_ALBUM', mReach: 1.6, mLike: 0.8, mSave: 0.8, caption: 'SS27 Campaign — Athletic Dept.\n\nHype® STYLE&CULTURE' },
  { category: 'estudio',       coverType: 'estudio-limpio',  visualStyle: 'estudio',     scenario: 'estudio',        productType: 'FEED',  mediaType: 'CAROUSEL_ALBUM', mReach: 0.9, mLike: 1.1, mSave: 1.3, caption: 'Regular Tee — nueva paleta SS27.' },
  { category: 'ugc',           coverType: 'modelo-producto', visualStyle: 'luz-natural', scenario: 'exterior-urbano',productType: 'FEED',  mediaType: 'CAROUSEL_ALBUM', mReach: 0.8, mLike: 1.2, mSave: 0.9, caption: '@cliente con el Zip Hoodie Camo.' },
  { category: 'reel-visual',   coverType: 'frame-video',     visualStyle: 'luz-natural', scenario: 'estudio',        productType: 'REELS', mediaType: 'VIDEO',          mReach: 1.9, mLike: 0.7, mSave: 1.0, caption: 'Longsleeve Pink/Blue — fit check.' },
  { category: 'reel-hablando', coverType: 'frame-video',     visualStyle: 'luz-natural', scenario: 'local-showroom', productType: 'REELS', mediaType: 'VIDEO',          mReach: 1.3, mLike: 0.9, mSave: 0.7, caption: 'Por qué hacemos tiradas cortas.' },
  { category: 'bts',           coverType: 'frame-video',     visualStyle: 'archivo',     scenario: 'local-showroom', productType: 'FEED',  mediaType: 'CAROUSEL_ALBUM', mReach: 0.6, mLike: 1.0, mSave: 0.8, caption: 'Detrás de escena — estampado Running Horses.' },
  { category: 'cultura',       coverType: 'grafica',         visualStyle: 'archivo',     scenario: 'estudio',        productType: 'FEED',  mediaType: 'IMAGE',          mReach: 0.8, mLike: 0.9, mSave: 1.1, caption: 'STYLE&CULTURE — archivo 2019.' },
];

const CANT_POSTS = 72;
const DIA_MS = 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function buildMetrics(rnd: () => number, perfil: Perfil, viral: boolean): IgSnapshotMetrics {
  const reachBase = 3000 + rnd() * 18000;
  const reach = Math.round(reachBase * perfil.mReach * (viral ? 6 : 1));
  const views = Math.round(reach * (1.8 + rnd() * 2.5));
  const likes = Math.round(reach * (0.025 + rnd() * 0.05) * perfil.mLike);
  const saved = Math.round(reach * (0.002 + rnd() * 0.006) * perfil.mSave);
  const shares = Math.round(reach * (0.001 + rnd() * 0.005));
  const comments = Math.round(likes * (0.005 + rnd() * 0.02));
  const profileVisits = Math.round(reach * (0.005 + rnd() * 0.015));
  const follows = Math.round(profileVisits * (0.04 + rnd() * 0.1));
  const esReel = perfil.productType === 'REELS';
  return {
    views,
    reach,
    likes,
    comments,
    saved,
    shares,
    reposts: null, // métrica sin verificar contra la cuenta: ausente, como en la API real
    totalInteractions: likes + comments + saved + shares,
    profileVisits,
    follows,
    avgWatchTimeMs: esReel ? Math.round(4000 + rnd() * 9000) : null,
    videoViewTotalTimeMs: null,
  };
}

/** Dataset completo, determinista. `ahora` se puede fijar en tests. */
export function fixturePosts(ahora: Date = new Date()): IgPostRecord[] {
  const rnd = mulberry32(20261017);
  const posts: IgPostRecord[] = [];

  for (let i = 0; i < CANT_POSTS; i++) {
    const perfil = PERFILES[i % PERFILES.length];
    // Un post cada ~5 días hacia atrás (cubre ~12 meses), con jitter.
    const published = new Date(ahora.getTime() - (1 + i * 5 + rnd() * 3) * DIA_MS);
    const viral = i === 7 || i === 31; // dos atípicos para probar la detección
    const sinInsights = i % 19 === 3; // algunos sin métricas todavía
    const sinClasificar = i % 7 === 5; // y otros sin etiqueta editorial
    const boosted = i % 9 === 2;

    const ageHours = Math.round((ahora.getTime() - published.getTime()) / 3_600_000);
    const metrics = buildMetrics(rnd, perfil, viral);

    const latest: IgSnapshotRecord | null = sinInsights
      ? null
      : { takenAt: iso(ahora), ageHours, ...metrics };

    posts.push({
      igMediaId: `999${String(100000000000000 + i)}`,
      permalink: `https://www.instagram.com/p/DEMO${String(i).padStart(3, '0')}/`,
      publishedAt: iso(published),
      mediaType: perfil.mediaType,
      mediaProductType: perfil.productType,
      caption: perfil.caption,
      isSharedToFeed: perfil.productType === 'REELS' ? i % 11 !== 4 : null,
      mediaCount: perfil.mediaType === 'CAROUSEL_ALBUM' ? 3 + (i % 6) : 1,
      coverAttachmentId: null,
      coverUrl: null, // las portadas reales llegan con B2 (descarga en write)
      children: null,
      likeCount: latest?.likes ?? null,
      commentsCount: latest?.comments ?? null,
      category: sinClasificar ? '' : perfil.category,
      coverType: sinClasificar ? '' : perfil.coverType,
      visualStyle: sinClasificar ? '' : perfil.visualStyle,
      objective: '',
      scenario: sinClasificar ? '' : perfil.scenario,
      hasModels: perfil.coverType.startsWith('modelo') ? 'modelo' : 'sin-personas',
      aiUsage: 'none',
      classifiedBy: sinClasificar ? '' : 'claude',
      classifiedAt: sinClasificar ? null : iso(ahora),
      reviewState: sinClasificar ? '' : i % 4 === 0 ? 'approved' : 'pending',
      wasBoosted: boosted,
      boostRef: boosted ? 'DEMO' : '',
      contentItemId: i % 12 === 1 ? 9000 + i : null,
      campaignId: i % 5 === 0 ? 1 + (i % 3) : null,
      creatorId: null,
      productIds: i % 3 === 0 ? [800 + (i % 10)] : [],
      learnings: null,
      experimentId: null,
      updatedAt: iso(ahora),
      latest,
    });
  }
  return posts;
}

/** Curva de crecimiento sintética para la ficha (marcas 2h/24h/72h/7d/30d/hoy). */
export function fixtureSnapshots(post: IgPostRecord): IgSnapshotRecord[] {
  if (!post.latest) return [];
  const publishedMs = new Date(post.publishedAt.replace(' ', 'T') + 'Z').getTime();
  const marcas: Array<[number, number]> = [
    [2, 0.14], [24, 0.5], [72, 0.74], [168, 0.88], [720, 0.97],
  ];
  const curva: IgSnapshotRecord[] = [];
  for (const [h, f] of marcas) {
    if ((post.latest.ageHours ?? 0) <= h) break;
    const escala = (v: number | null) => (v == null ? null : Math.round(v * f));
    curva.push({
      takenAt: iso(new Date(publishedMs + h * 3_600_000)),
      ageHours: h,
      views: escala(post.latest.views),
      reach: escala(post.latest.reach),
      likes: escala(post.latest.likes),
      comments: escala(post.latest.comments),
      saved: escala(post.latest.saved),
      shares: escala(post.latest.shares),
      reposts: null,
      totalInteractions: escala(post.latest.totalInteractions),
      profileVisits: escala(post.latest.profileVisits),
      follows: escala(post.latest.follows),
      avgWatchTimeMs: post.latest.avgWatchTimeMs,
      videoViewTotalTimeMs: null,
    });
  }
  curva.push(post.latest);
  return curva;
}

export type FixtureListParams = {
  productType?: string | null;
  category?: string | null;
  since?: string | null;
  until?: string | null;
  boosted?: string | null;
  classified?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

/** Mismos filtros que GET /hypestyle/v1/ig-posts, aplicados al dataset demo. */
export function fixtureList(params: FixtureListParams, ahora: Date = new Date()) {
  let rows = fixturePosts(ahora);

  if (params.productType) rows = rows.filter((r) => r.mediaProductType === params.productType);
  if (params.category) rows = rows.filter((r) => r.category === params.category);
  if (params.since) rows = rows.filter((r) => r.publishedAt >= params.since!);
  if (params.until) rows = rows.filter((r) => r.publishedAt <= params.until!);
  if (params.boosted === '1') rows = rows.filter((r) => r.wasBoosted);
  if (params.boosted === '0') rows = rows.filter((r) => !r.wasBoosted);
  if (params.classified === 'no') rows = rows.filter((r) => r.category === '');
  if (params.classified === 'yes') rows = rows.filter((r) => r.category !== '');
  if (params.classified === 'pending') rows = rows.filter((r) => r.reviewState === 'pending');
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter((r) => (r.caption ?? '').toLowerCase().includes(q));
  }

  const total = rows.length;
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  return { rows: rows.slice(offset, offset + limit), total };
}

export function fixtureDetail(igMediaId: string, ahora: Date = new Date()) {
  const post = fixturePosts(ahora).find((p) => p.igMediaId === igMediaId);
  if (!post) return null;
  return { post, snapshots: fixtureSnapshots(post) };
}
