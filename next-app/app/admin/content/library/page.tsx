'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';

import { DataTable } from '@/components/admin/DataTable';
import {
  AvisoCalidad,
  AvisoCobertura,
  AvisoDistribucion,
  CATEGORIA_LABELS,
  CoverThumb,
  esReelDePrueba,
  ESTILO_LABELS,
  EstadoBadges,
  FixtureBanner,
  formatoDe,
  NotaMetodologica,
  PORTADA_LABELS,
} from '@/components/admin/intelligence/bits';
import { PostDrawer, type Benchmark } from '@/components/admin/intelligence/PostDrawer';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/admin/ui';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { factorVsMedian, groupStats } from '@/lib/ig-insights/analytics';
import { avisoDeCalidad, metricasDe, resumenDeCalidad } from '@/lib/ig-insights/calidad';
import { avisoDeCobertura, fetchAllIgPosts } from '@/lib/ig-insights/fetch-all';
import { fmtFactor, fmtFecha, fmtInt, fmtPct } from '@/lib/ig-insights/format';
import { engagementOverReach, likesOverReach, savedOverReach } from '@/lib/ig-insights/ratios';
import type { IgPostRecord } from '@/lib/ig-insights/types';

// PR-4 — Content Library: la biblioteca de publicaciones reales de IG con su
// rendimiento. Lectura pura: filtra, ordena y abre la ficha. Reutiliza
// PageHeader/DataTable/estados del panel; el único layout nuevo es la grilla
// de portadas, que no existía en el admin.

const SELECT_CLS =
  'h-8 border border-border bg-card text-foreground rounded-lg px-2 text-[12px] focus:outline-none focus:border-border-mid';

type Orden = 'fecha' | 'erReach' | 'likesReach' | 'savedReach' | 'reach';

const ORDEN_LABELS: Record<Orden, string> = {
  fecha: 'Más recientes',
  erReach: 'Engagement / alcance',
  likesReach: 'Likes / alcance',
  savedReach: 'Guardados / alcance',
  reach: 'Alcance',
};

const PERIODOS = [
  { key: '90', label: 'Últimos 90 días' },
  { key: '180', label: 'Últimos 6 meses' },
  { key: '365', label: 'Último año' },
  { key: 'all', label: 'Todo' },
];

function valorDe(post: IgPostRecord, orden: Orden): number | null {
  // Métricas usables: lo que el control de calidad descarta queda en null y no
  // ordena ni compara.
  const m = metricasDe(post);
  if (!post.latest) return null;
  if (orden === 'reach') return m.reach ?? null;
  if (orden === 'likesReach') return likesOverReach(m);
  if (orden === 'savedReach') return savedOverReach(m);
  return engagementOverReach(m);
}

export default function LibraryPage() {
  const { headers, autorizado } = useAdminAuth();

  const [posts, setPosts] = useState<IgPostRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [fixture, setFixture] = useState(false);
  const [cobertura, setCobertura] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [vista, setVista] = useState<'grilla' | 'tabla'>('grilla');
  const [orden, setOrden] = useState<Orden>('fecha');

  const [f, setF] = useState({
    periodo: '365',
    productType: '',
    category: '',
    coverType: '',
    visualStyle: '',
    campaignId: '',
    productId: '',
    distribucion: 'organico',
    reels: 'grilla',
    classified: '',
    search: '',
  });

  const load = useCallback(async () => {
    setError(null);
    const params: Record<string, string> = {};
    if (f.productType) params.productType = f.productType;
    if (f.category) params.category = f.category;
    if (f.classified) params.classified = f.classified;
    if (f.search.trim()) params.search = f.search.trim();
    if (f.distribucion === 'organico') params.boosted = '0';
    if (f.distribucion === 'pago') params.boosted = '1';
    if (f.periodo !== 'all') {
      const desde = new Date(Date.now() - Number(f.periodo) * 86_400_000);
      params.since = desde.toISOString().slice(0, 19).replace('T', ' ');
    }
    try {
      // Paginado completo (C3): el backend topea en 200 por pedido.
      const d = await fetchAllIgPosts(params, { headers: headers() });
      setPosts(d.rows);
      setTotal(d.total);
      setFixture(d.fixture);
      setCobertura(avisoDeCobertura(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
      setPosts([]);
    }
  }, [f.periodo, f.productType, f.category, f.classified, f.search, f.distribucion, headers]);

  useEffect(() => {
    if (autorizado) void load();
  }, [autorizado, load]);

  // Filtros que no viajan al backend (portada, estilo, campaña, producto, reels).
  const visibles = useMemo(() => {
    let rows = posts ?? [];
    // Los trial reels no se mezclan con los de la grilla.
    if (f.reels === 'grilla') rows = rows.filter((p) => !esReelDePrueba(p));
    if (f.reels === 'prueba') rows = rows.filter(esReelDePrueba);
    if (f.coverType) rows = rows.filter((p) => p.coverType === f.coverType);
    if (f.visualStyle) rows = rows.filter((p) => p.visualStyle === f.visualStyle);
    if (f.campaignId) rows = rows.filter((p) => String(p.campaignId ?? '') === f.campaignId);
    if (f.productId) rows = rows.filter((p) => p.productIds.includes(Number(f.productId)));
    if (orden !== 'fecha') {
      rows = [...rows].sort((a, b) => (valorDe(b, orden) ?? -1) - (valorDe(a, orden) ?? -1));
    }
    return rows;
  }, [posts, f.reels, f.coverType, f.visualStyle, f.campaignId, f.productId, orden]);

  // Universo analizado vs excluido, siempre a la vista.
  const calidad = useMemo(() => resumenDeCalidad(visibles), [visibles]);

  // Benchmark por categoría sobre lo cargado (excluyendo pauteados: nunca se
  // mezclan orgánico y pago en una misma comparación).
  const porCategoria = useMemo(
    () =>
      groupStats(
        (posts ?? []).filter((p) => !p.wasBoosted),
        (p) => p.category || null,
        (p) => engagementOverReach(metricasDe(p)),
      ),
    [posts],
  );

  const benchmarkDe = useCallback(
    (post: IgPostRecord): Benchmark => {
      const seg = porCategoria.find((s) => s.key === post.category);
      if (!seg) return null;
      return { label: CATEGORIA_LABELS[seg.key] ?? seg.key, n: seg.n, median: seg.median };
    },
    [porCategoria],
  );

  const campanias = useMemo(
    () => [...new Set((posts ?? []).map((p) => p.campaignId).filter((v): v is number => v != null))],
    [posts],
  );
  const productos = useMemo(
    () => [...new Set((posts ?? []).flatMap((p) => p.productIds))].sort((a, b) => a - b),
    [posts],
  );

  if (autorizado === false) {
    return <ErrorState title="Sin acceso" hint="Esta sección necesita el permiso de contenido." />;
  }

  return (
    <>
      <PageHeader
        title="Biblioteca de contenido"
        subtitle={
          posts
            ? `${visibles.length} de ${total} publicaciones${fixture ? ' (datos de prueba)' : ''}`
            : 'Cargando…'
        }
      >
        <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={SELECT_CLS}>
          {Object.entries(ORDEN_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setVista('grilla')}
            aria-label="Ver en grilla"
            className={`h-8 px-2.5 ${vista === 'grilla' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setVista('tabla')}
            aria-label="Ver en tabla"
            className={`h-8 px-2.5 border-l border-border ${vista === 'tabla' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
          >
            <Table2 size={14} />
          </button>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-6 space-y-4">
        {fixture && <FixtureBanner />}
        {cobertura && <AvisoCobertura texto={cobertura} />}
        {avisoDeCalidad(calidad) && <AvisoCalidad resumen={calidad} />}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <input
            value={f.search}
            onChange={(e) => setF((s) => ({ ...s, search: e.target.value }))}
            placeholder="Buscar en el copy…"
            className="h-8 border border-border bg-card text-foreground rounded-lg px-2.5 text-[12px] focus:outline-none focus:border-border-mid min-w-[180px]"
          />
          <select
            value={f.periodo}
            onChange={(e) => setF((s) => ({ ...s, periodo: e.target.value }))}
            className={SELECT_CLS}
          >
            {PERIODOS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={f.productType}
            onChange={(e) => setF((s) => ({ ...s, productType: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Todo formato</option>
            <option value="FEED">Feed</option>
            <option value="REELS">Reels</option>
            <option value="STORY">Stories</option>
          </select>
          <select
            value={f.category}
            onChange={(e) => setF((s) => ({ ...s, category: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Toda categoría</option>
            {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={f.coverType}
            onChange={(e) => setF((s) => ({ ...s, coverType: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Toda portada</option>
            {Object.entries(PORTADA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={f.visualStyle}
            onChange={(e) => setF((s) => ({ ...s, visualStyle: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Todo estilo</option>
            {Object.entries(ESTILO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {campanias.length > 0 && (
            <select
              value={f.campaignId}
              onChange={(e) => setF((s) => ({ ...s, campaignId: e.target.value }))}
              className={SELECT_CLS}
            >
              <option value="">Toda campaña</option>
              {campanias.map((c) => (
                <option key={c} value={String(c)}>
                  Campaña #{c}
                </option>
              ))}
            </select>
          )}
          {productos.length > 0 && (
            <select
              value={f.productId}
              onChange={(e) => setF((s) => ({ ...s, productId: e.target.value }))}
              className={SELECT_CLS}
            >
              <option value="">Todo producto</option>
              {productos.map((p) => (
                <option key={p} value={String(p)}>
                  Producto #{p}
                </option>
              ))}
            </select>
          )}
          <select
            value={f.distribucion}
            onChange={(e) => setF((s) => ({ ...s, distribucion: e.target.value }))}
            className={SELECT_CLS}
            title="Orgánico y pauteado nunca se mezclan en un ranking"
          >
            <option value="organico">Solo orgánico</option>
            <option value="pago">Solo pauteado</option>
            <option value="todo">Ambos (sin segmentar)</option>
          </select>
          <select
            value={f.reels}
            onChange={(e) => setF((s) => ({ ...s, reels: e.target.value }))}
            className={SELECT_CLS}
            title="Los reels fuera de la grilla sólo se muestran a no seguidores: no son comparables con los de la grilla"
          >
            <option value="grilla">Reels de la grilla</option>
            <option value="prueba">Solo reels de prueba</option>
            <option value="todos">Todos los reels</option>
          </select>
          <select
            value={f.classified}
            onChange={(e) => setF((s) => ({ ...s, classified: e.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Clasificadas y sin clasificar</option>
            <option value="yes">Solo clasificadas</option>
            <option value="no">Sin clasificar</option>
            <option value="pending">Clasificación a revisar</option>
          </select>
        </div>

        {!posts && <LoadingState label="Cargando publicaciones…" />}
        {error && <ErrorState hint={`No se pudo cargar (${error}).`} onRetry={() => void load()} />}
        {posts && !error && visibles.length === 0 && (
          <EmptyState
            title="Sin publicaciones para estos filtros"
            hint="Probá ampliar el período o quitar algún filtro."
          />
        )}

        {posts && visibles.length > 0 && vista === 'grilla' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visibles.map((post) => {
              const bench = benchmarkDe(post);
              const factor = factorVsMedian(
                engagementOverReach(metricasDe(post)),
                bench?.median ?? null,
              );
              return (
                <button
                  key={post.igMediaId}
                  onClick={() => setAbierto(post.igMediaId)}
                  className="bg-card border border-border rounded-lg overflow-hidden text-left hover:border-border-mid transition-colors"
                >
                  <CoverThumb post={post} />
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-foreground">
                        {formatoDe(post)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtFecha(post.publishedAt)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="text-[11px] text-muted-foreground">Alcance</span>
                      <span className="text-[12px] font-semibold text-foreground">
                        {fmtInt(metricasDe(post).reach)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="text-[11px] text-muted-foreground">ER / alcance</span>
                      <span className="text-[12px] font-semibold text-foreground">
                        {fmtPct(engagementOverReach(metricasDe(post)), 1)}
                      </span>
                    </div>
                    {factor != null && (
                      <p className="text-[10.5px] text-muted-foreground/70">
                        {fmtFactor(factor)} la mediana de su categoría
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <EstadoBadges post={post} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {posts && visibles.length > 0 && vista === 'tabla' && (
          <DataTable
            rows={visibles}
            keyOf={(p) => p.igMediaId}
            onRowClick={(p) => setAbierto(p.igMediaId)}
            columns={[
              { key: 'fecha', header: 'Fecha', render: (p) => fmtFecha(p.publishedAt) },
              { key: 'formato', header: 'Formato', render: (p) => formatoDe(p) },
              {
                key: 'categoria',
                header: 'Categoría',
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
                key: 'likes',
                header: 'Likes / alcance',
                align: 'right',
                render: (p) => fmtPct(likesOverReach(metricasDe(p)), 2),
              },
              {
                key: 'er',
                header: 'ER / alcance',
                align: 'right',
                render: (p) => fmtPct(engagementOverReach(metricasDe(p)), 2),
              },
              {
                key: 'saved',
                header: 'Guard. / alcance',
                align: 'right',
                render: (p) => fmtPct(savedOverReach(metricasDe(p)), 2),
              },
            ]}
          />
        )}

        <NotaMetodologica>
          Los pauteados se filtran aparte: un ranking nunca mezcla distribución orgánica y paga.
        </NotaMetodologica>
        {f.distribucion === 'organico' && (
          <AvisoDistribucion
            n={(posts ?? []).length}
            verificadas={(posts ?? []).filter((p) => p.boostRef).length}
          />
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
