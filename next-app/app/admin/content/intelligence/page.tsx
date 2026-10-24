'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DataTable } from '@/components/admin/DataTable';
import {
  AvisoCalidad,
  AvisoCobertura,
  AvisoDistribucion,
  CATEGORIA_LABELS,
  ESCENARIO_LABELS,
  esReelDePrueba,
  ESTILO_LABELS,
  FixtureBanner,
  formatoDe,
  MODELOS_LABELS,
  MuestraChica,
  NotaMetodologica,
  PORTADA_LABELS,
} from '@/components/admin/intelligence/bits';
import { PostDrawer, type Benchmark } from '@/components/admin/intelligence/PostDrawer';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/admin/ui';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  factorVsMedian,
  groupStats,
  inRange,
  median,
  MIN_SAMPLE,
  outlierBounds,
  periodDelta,
  previousRange,
  type SegmentSummary,
} from '@/lib/ig-insights/analytics';
import {
  avisoDeCalidad,
  metricasDe,
  resumenDeCalidad,
  tieneAlcanceConfiable,
} from '@/lib/ig-insights/calidad';
import { avisoDeCobertura, fetchAllIgPosts } from '@/lib/ig-insights/fetch-all';
import { fmtFactor, fmtFecha, fmtInt, fmtPct } from '@/lib/ig-insights/format';
import {
  engagementOverReach,
  likesOverReach,
  likesOverViews,
  savedOverReach,
  sharesOverReach,
} from '@/lib/ig-insights/ratios';
import type { IgPostRecord } from '@/lib/ig-insights/types';

// PR-5 — Analytics Overview: rendimiento orgánico del contenido por segmento.
// Medianas (no promedios), n siempre visible, advertencia con muestra chica, y
// segmentación estricta orgánico/pago. Reutiliza KpiCard/DataTable/PageHeader.

const SELECT_CLS =
  'h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid';

const PERIODOS = [
  { key: '30', label: 'Últimos 30 días' },
  { key: '90', label: 'Últimos 90 días' },
  { key: '180', label: 'Últimos 6 meses' },
  { key: '365', label: 'Último año' },
];

// Las cinco dimensiones de la taxonomía v1 (doc 19) más el formato, que es
// observado y no se clasifica a mano.
type Dim = 'category' | 'coverType' | 'visualStyle' | 'scenario' | 'hasModels' | 'formato';

const DIMENSIONES: Array<{ key: Dim; label: string }> = [
  { key: 'category', label: 'Categoría' },
  { key: 'coverType', label: 'Tipo de portada' },
  { key: 'visualStyle', label: 'Estilo visual' },
  { key: 'scenario', label: 'Escenario' },
  { key: 'hasModels', label: 'Personas' },
  { key: 'formato', label: 'Formato' },
];

const LABELS: Record<Dim, Record<string, string>> = {
  category: CATEGORIA_LABELS,
  coverType: PORTADA_LABELS,
  visualStyle: ESTILO_LABELS,
  scenario: ESCENARIO_LABELS,
  hasModels: MODELOS_LABELS,
  formato: {},
};

function claveDim(post: IgPostRecord, dim: Dim): string | null {
  if (dim === 'formato') return formatoDe(post).replace(/ ×\d+$/, '');
  const v = post[dim];
  return v ? String(v) : null;
}

/** Métricas que se pueden rankear/comparar, con su fórmula y denominador. */
const METRICAS = {
  likesReach: {
    label: 'Likes / alcance',
    nota: 'Principal de reacción relativa',
    fn: likesOverReach,
    digits: 2,
  },
  erReach: { label: 'Engagement / alcance', nota: 'Interacciones totales', fn: engagementOverReach, digits: 2 },
  savedReach: { label: 'Guardados / alcance', nota: 'Interés en el producto', fn: savedOverReach, digits: 2 },
  sharesReach: { label: 'Compartidos / alcance', nota: 'Distribución', fn: sharesOverReach, digits: 2 },
  likesViews: {
    label: 'Likes / views',
    nota: 'Secundaria: views cuenta repeticiones',
    fn: likesOverViews,
    digits: 2,
  },
} as const;

type MetricaKey = keyof typeof METRICAS;

export default function IntelligencePage() {
  const { headers, autorizado } = useAdminAuth();

  const [posts, setPosts] = useState<IgPostRecord[] | null>(null);
  const [fixture, setFixture] = useState(false);
  const [cobertura, setCobertura] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState('90');
  const [dim, setDim] = useState<Dim>('category');
  const [metrica, setMetrica] = useState<MetricaKey>('likesReach');
  const [distribucion, setDistribucion] = useState<'organico' | 'pago'>('organico');
  const [reels, setReels] = useState<'grilla' | 'prueba' | 'todos'>('grilla');

  // Se traen dos períodos de una (actual + anterior) para poder comparar.
  const load = useCallback(async () => {
    setError(null);
    const dias = Number(periodo);
    const desde = new Date(Date.now() - dias * 2 * 86_400_000);
    try {
      // Paginado completo (C3): las medianas y los deltas se calculan sobre
      // TODAS las publicaciones del período, no sobre las primeras 200.
      const d = await fetchAllIgPosts(
        { since: desde.toISOString().slice(0, 19).replace('T', ' ') },
        { headers: headers() },
      );
      setPosts(d.rows);
      setFixture(d.fixture);
      setCobertura(avisoDeCobertura(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
      setPosts([]);
    }
  }, [periodo, headers]);

  useEffect(() => {
    if (autorizado) void load();
  }, [autorizado, load]);

  const rangos = useMemo(() => {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - Number(periodo) * 86_400_000);
    return { actual: { desde, hasta }, anterior: previousRange(desde, hasta) };
  }, [periodo]);

  // Segmentación dura: el conjunto analizado es orgánico O pauteado, nunca la
  // mezcla. Los reels fuera de la grilla tampoco se mezclan con los demás.
  const porDistribucion = useCallback(
    (rows: IgPostRecord[]) =>
      rows
        .filter((p) => (distribucion === 'pago' ? p.wasBoosted : !p.wasBoosted))
        .filter((p) =>
          reels === 'todos' ? true : reels === 'prueba' ? esReelDePrueba(p) : !esReelDePrueba(p),
        ),
    [distribucion, reels],
  );

  const actual = useMemo(
    () =>
      porDistribucion(
        (posts ?? []).filter((p) => inRange(p.publishedAt, rangos.actual.desde, rangos.actual.hasta)),
      ),
    [posts, rangos, porDistribucion],
  );
  const anterior = useMemo(
    () =>
      porDistribucion(
        (posts ?? []).filter((p) =>
          inRange(p.publishedAt, rangos.anterior.desde, rangos.anterior.hasta),
        ),
      ),
    [posts, rangos, porDistribucion],
  );

  const conInsights = useMemo(() => actual.filter((p) => p.latest), [actual]);
  /** Universo que de verdad entra a los números: con alcance confiable. */
  const analizables = useMemo(() => actual.filter(tieneAlcanceConfiable), [actual]);
  const calidad = useMemo(() => resumenDeCalidad(actual), [actual]);

  /** Mediana de una métrica en un conjunto. */
  const medianaDe = useCallback(
    (rows: IgPostRecord[], key: MetricaKey) =>
      median(
        rows
          .map((p) => METRICAS[key].fn(metricasDe(p)))
          .filter((v): v is number => v != null),
      ),
    [],
  );

  const kpis = useMemo(() => {
    const keys: MetricaKey[] = ['likesReach', 'erReach', 'savedReach', 'sharesReach', 'likesViews'];
    return keys.map((k) => {
      const cur = medianaDe(actual, k);
      const prev = medianaDe(anterior, k);
      return { key: k, cur, prev, delta: periodDelta(cur, prev) };
    });
  }, [actual, anterior, medianaDe]);

  const reachMediano = useMemo(
    () => median(analizables.map((p) => metricasDe(p).reach).filter((v): v is number => v != null)),
    [analizables],
  );
  const followsTotal = useMemo(
    () => analizables.reduce((acc, p) => acc + (metricasDe(p).follows ?? 0), 0),
    [analizables],
  );

  const segmentos = useMemo(
    () => groupStats(actual, (p) => claveDim(p, dim), (p) => METRICAS[metrica].fn(metricasDe(p))),
    [actual, dim, metrica],
  );

  const rankingBase = useMemo(
    () =>
      [...conInsights].sort(
        (a, b) =>
          (METRICAS[metrica].fn(metricasDe(b)) ?? -1) - (METRICAS[metrica].fn(metricasDe(a)) ?? -1),
      ),
    [conInsights, metrica],
  );

  // Atípicos: se señalan, no se promedian (ahí suelen estar los aprendizajes).
  const bounds = useMemo(
    () =>
      outlierBounds(
        conInsights
          .map((p) => METRICAS[metrica].fn(metricasDe(p)))
          .filter((v): v is number => v != null),
      ),
    [conInsights, metrica],
  );

  const benchPorCategoria = useMemo(
    () =>
      groupStats(actual, (p) => p.category || null, (p) => engagementOverReach(metricasDe(p))),
    [actual],
  );
  const benchmarkDe = useCallback(
    (post: IgPostRecord): Benchmark => {
      const seg = benchPorCategoria.find((s) => s.key === post.category);
      if (!seg) return null;
      return { label: CATEGORIA_LABELS[seg.key] ?? seg.key, n: seg.n, median: seg.median };
    },
    [benchPorCategoria],
  );

  if (autorizado === false) {
    return <ErrorState title="Sin acceso" hint="Esta sección necesita el permiso de contenido." />;
  }

  const metricaActual = METRICAS[metrica];
  const etiquetaSeg = (key: string) => LABELS[dim][key] ?? key;

  return (
    <>
      <PageHeader
        title="Content Intelligence"
        subtitle={
          posts
            ? `${actual.length} publicaciones ${distribucion === 'pago' ? 'con pauta' : 'orgánicas'} en el período${fixture ? ' · datos de prueba' : ''}`
            : 'Cargando…'
        }
      >
        <Link
          href="/admin/content/library"
          className="h-8 inline-flex items-center px-3 rounded-full border border-border text-[12px] font-semibold text-foreground hover:border-border-mid"
        >
          Ver biblioteca
        </Link>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={SELECT_CLS}>
          {PERIODOS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={distribucion}
          onChange={(e) => setDistribucion(e.target.value as 'organico' | 'pago')}
          className={SELECT_CLS}
          title="Los resultados orgánicos y pagos nunca se mezclan"
        >
          <option value="organico">Orgánico</option>
          <option value="pago">Con pauta</option>
        </select>
        <select
          value={reels}
          onChange={(e) => setReels(e.target.value as 'grilla' | 'prueba' | 'todos')}
          className={SELECT_CLS}
          title="Los reels fuera de la grilla sólo se muestran a no seguidores: no son comparables con los de la grilla"
        >
          <option value="grilla">Reels de la grilla</option>
          <option value="prueba">Solo reels de prueba</option>
          <option value="todos">Todos los reels</option>
        </select>
      </PageHeader>

      <div className="p-4 sm:p-6">
        {fixture && (
          <div className="mb-4">
            <FixtureBanner />
          </div>
        )}
        {cobertura && (
          <div className="mb-4">
            <AvisoCobertura texto={cobertura} />
          </div>
        )}

        {!posts && <LoadingState label="Calculando…" />}
        {error && <ErrorState hint={`No se pudo cargar (${error}).`} onRetry={() => void load()} />}

        {posts && !error && (
          <>
            {actual.length < MIN_SAMPLE && (
              <div className="mb-4 bg-warning-soft border border-warning/40 text-warning rounded-lg px-4 py-2.5 text-[12.5px] font-medium">
                Solo {actual.length} publicaciones en el período: alcanza para mirar, no para
                concluir. Ampliá el período antes de tomar decisiones.
              </div>
            )}

            {avisoDeCalidad(calidad) && (
              <div className="mb-4">
                <AvisoCalidad resumen={calidad} />
              </div>
            )}

            <SectionTitle
              right={
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                  n={actual.length} · analizables: {analizables.length}
                </span>
              }
            >
              Medianas del período
            </SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.slice(0, 4).map((k, i) => (
                <KpiCard
                  key={k.key}
                  label={METRICAS[k.key].label}
                  value={fmtPct(k.cur, METRICAS[k.key].digits)}
                  delta={k.delta}
                  emphasis={i === 0}
                  compare={k.prev != null ? `vs ${fmtPct(k.prev, 2)} período ant.` : undefined}
                  estimated
                  info={
                    <>
                      Mediana de {METRICAS[k.key].label.toLowerCase()} entre las publicaciones{' '}
                      {distribucion === 'pago' ? 'con pauta' : 'orgánicas'} del período.{' '}
                      {METRICAS[k.key].nota}. El alcance es una estimación de Meta; esto no es una
                      fórmula del algoritmo de Instagram.
                    </>
                  }
                />
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <KpiCard
                label="Likes / views"
                value={fmtPct(kpis[4].cur, 2)}
                delta={kpis[4].delta}
                compare={kpis[4].prev != null ? `vs ${fmtPct(kpis[4].prev, 2)} período ant.` : undefined}
                info="Métrica secundaria: views incluye varias visualizaciones de la misma cuenta, así que no sirve para comparar publicaciones entre sí. El denominador comparable es el alcance."
              />
              <KpiCard
                label="Alcance mediano"
                value={fmtInt(reachMediano)}
                estimated
                info="Mediana del alcance (cuentas únicas) de las publicaciones del período."
              />
              <KpiCard
                label="Publicaciones"
                value={fmtInt(actual.length)}
                sub={
                  calidad.excluidas > 0
                    ? `${calidad.sinMetricas} sin insights · ${calidad.excluidas} no confiables`
                    : `${calidad.sinMetricas} sin insights`
                }
              />
              <KpiCard
                label="Seguidores atribuidos"
                value={fmtInt(followsTotal)}
                info="Suma de los seguidores que Instagram atribuye a cada publicación del período."
              />
            </div>

            <SectionTitle
              right={
                <div className="flex gap-2">
                  <select value={dim} onChange={(e) => setDim(e.target.value as Dim)} className={SELECT_CLS}>
                    {DIMENSIONES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={metrica}
                    onChange={(e) => setMetrica(e.target.value as MetricaKey)}
                    className={SELECT_CLS}
                  >
                    {Object.entries(METRICAS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              Rendimiento por segmento
            </SectionTitle>
            <DataTable
              rows={segmentos}
              keyOf={(s: SegmentSummary) => s.key}
              emptyTitle="Sin segmentos todavía"
              emptyHint="Hace falta clasificar publicaciones para comparar por esta dimensión."
              columns={[
                {
                  key: 'seg',
                  header: DIMENSIONES.find((d) => d.key === dim)!.label,
                  render: (s: SegmentSummary) => (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{etiquetaSeg(s.key)}</span>
                      {s.smallSample && <MuestraChica n={s.n} />}
                    </span>
                  ),
                },
                { key: 'n', header: 'n', align: 'right', render: (s: SegmentSummary) => s.n },
                {
                  key: 'mediana',
                  header: `Mediana · ${metricaActual.label}`,
                  align: 'right',
                  render: (s: SegmentSummary) => fmtPct(s.median, metricaActual.digits),
                },
                {
                  key: 'rango',
                  header: 'p25 – p75',
                  align: 'right',
                  hideOnMobile: true,
                  render: (s: SegmentSummary) =>
                    `${fmtPct(s.p25, metricaActual.digits)} – ${fmtPct(s.p75, metricaActual.digits)}`,
                },
                {
                  key: 'vs',
                  header: 'vs. mejor segmento',
                  align: 'right',
                  hideOnMobile: true,
                  render: (s: SegmentSummary) =>
                    fmtFactor(factorVsMedian(s.median, segmentos[0]?.median ?? null)),
                },
              ]}
            />
            <p className="text-[11px] text-muted-foreground/70 mt-2 leading-relaxed">
              Los segmentos con n&lt;{MIN_SAMPLE} van al final y marcados: aparecen para que sepas
              que existen, no para compararlos. Una diferencia entre segmentos no prueba causa —
              puede explicarla el producto, el horario o el momento de campaña.
            </p>

            <SectionTitle
              right={
                <span className="text-[11px] text-muted-foreground/70">
                  Ordenado por {metricaActual.label.toLowerCase()}
                </span>
              }
            >
              Ranking de publicaciones
            </SectionTitle>
            <DataTable
              rows={rankingBase.slice(0, 20)}
              keyOf={(p) => p.igMediaId}
              onRowClick={(p) => setAbierto(p.igMediaId)}
              emptyTitle="Sin publicaciones con métricas"
              columns={[
                { key: 'fecha', header: 'Fecha', render: (p) => fmtFecha(p.publishedAt) },
                { key: 'formato', header: 'Formato', render: (p) => formatoDe(p) },
                {
                  key: 'cat',
                  header: 'Categoría',
                  hideOnMobile: true,
                  render: (p) =>
                    p.category ? (CATEGORIA_LABELS[p.category] ?? p.category) : '— sin clasificar',
                },
                {
                  key: 'reach',
                  header: 'Alcance',
                  align: 'right',
                  render: (p) => fmtInt(metricasDe(p).reach),
                },
                {
                  key: 'metrica',
                  header: metricaActual.label,
                  align: 'right',
                  render: (p) => {
                    const v = metricaActual.fn(metricasDe(p));
                    const esAlto = bounds && v != null && v > bounds.high;
                    return (
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        {fmtPct(v, metricaActual.digits)}
                        {esAlto && <StatusBadge tone="success">Atípico</StatusBadge>}
                      </span>
                    );
                  },
                },
              ]}
            />

            <div className="mt-4 space-y-1.5">
              <NotaMetodologica>
                Comparado contra el período inmediatamente anterior de igual duración. Las
                publicaciones de distinta época no se comparan en valores absolutos: la cuenta y el
                algoritmo cambian.
              </NotaMetodologica>
              {distribucion === 'organico' && (
                <AvisoDistribucion
                  n={actual.length}
                  verificadas={actual.filter((p) => p.boostRef).length}
                />
              )}
            </div>
          </>
        )}
      </div>

      {abierto && (
        <PostDrawer
          igMediaId={abierto}
          benchmark={benchmarkDe(
            (posts ?? []).find((p) => p.igMediaId === abierto) ?? ({} as IgPostRecord),
          )}
          headers={headers}
          onClose={() => setAbierto(null)}
        />
      )}
    </>
  );
}
