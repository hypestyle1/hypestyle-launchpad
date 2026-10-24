'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

import { Sparkline } from '@/components/admin/Sparkline';
import { LoadingState, StatusBadge } from '@/components/admin/ui';
import { factorVsMedian } from '@/lib/ig-insights/analytics';
import { metricasDe } from '@/lib/ig-insights/calidad';
import { fmtFactor, fmtFecha, fmtInt, fmtPct, fmtSegundos } from '@/lib/ig-insights/format';
import {
  commentsOverReach,
  engagementOverReach,
  followsOverReach,
  likesOverReach,
  likesOverViews,
  savedOverReach,
  sharesOverReach,
  viewsPerReach,
} from '@/lib/ig-insights/ratios';
import type { IgPostRecord, IgSnapshotRecord } from '@/lib/ig-insights/types';

import {
  CATEGORIA_LABELS,
  CoverThumb,
  ESCENARIO_LABELS,
  ESTILO_LABELS,
  EstadoBadges,
  formatoDe,
  MODELOS_LABELS,
  NotaMetodologica,
  PORTADA_LABELS,
} from './bits';

// Ficha individual de una publicación: la pieza visual junto a su rendimiento
// y su análisis. Patrón de panel lateral del Content OS (ContentDrawer), sin
// portal de Radix: los portales se montan fuera de .admin-theme.
//
// Solo lectura. La edición de la clasificación llega con PR-6/7 (el endpoint
// de escritura existe en el mu-plugin pero esta vista todavía no lo usa).

type Detalle = { post: IgPostRecord; snapshots: IgSnapshotRecord[]; fixture?: boolean };

/** Mediana del segmento del post, para expresar su rendimiento en ×mediana. */
export type Benchmark = { label: string; n: number; median: number | null } | null;

export function PostDrawer({
  igMediaId,
  benchmark,
  headers,
  onClose,
}: {
  igMediaId: string;
  benchmark: Benchmark;
  headers: () => Record<string, string>;
  onClose: () => void;
}) {
  const [data, setData] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setData(null);
    setError(null);
    fetch(`/api/admin/ig-posts/${igMediaId}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => vivo && setData(d))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'error'));
    return () => {
      vivo = false;
    };
  }, [igMediaId, headers]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-card border-l border-border w-full max-w-2xl h-full overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de publicación"
        onClick={(e) => e.stopPropagation()}
      >
        {!data && !error && <LoadingState label="Cargando publicación…" />}
        {error && (
          <div className="p-6">
            <p className="text-[13px] text-destructive">No se pudo cargar la ficha ({error}).</p>
          </div>
        )}
        {data && <Cuerpo detalle={data} benchmark={benchmark} onClose={onClose} />}
      </div>
    </div>
  );
}

function Cuerpo({
  detalle,
  benchmark,
  onClose,
}: {
  detalle: Detalle;
  benchmark: Benchmark;
  onClose: () => void;
}) {
  const { post, snapshots } = detalle;
  // La ficha muestra las métricas USABLES: lo que el control de calidad
  // descarta aparece como "—" y el badge de EstadoBadges dice por qué. La
  // lectura original queda intacta en `post.latest` y en la curva de abajo.
  const m = metricasDe(post);
  const esReel = post.mediaProductType === 'REELS';

  const erReach = engagementOverReach(m);
  const factor = factorVsMedian(erReach, benchmark?.median ?? null);

  // Serie para el sparkline: engagement acumulado por snapshot.
  const serie = snapshots
    .map((s) => (s.likes ?? 0) + (s.comments ?? 0) + (s.saved ?? 0) + (s.shares ?? 0))
    .filter((n) => Number.isFinite(n));

  return (
    <>
      <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-start gap-3 z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-foreground">{formatoDe(post)}</span>
            <span className="text-[12px] text-muted-foreground">{fmtFecha(post.publishedAt)}</span>
            {detalle.fixture && <StatusBadge tone="warning">DEMO</StatusBadge>}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <EstadoBadges post={post} />
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* ── La pieza ── */}
        <div className="flex gap-4">
          <div className="w-32 shrink-0 rounded-lg overflow-hidden border border-border">
            <CoverThumb post={post} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {post.caption ? (
              <p className="text-[12.5px] text-foreground leading-relaxed whitespace-pre-line line-clamp-6">
                {post.caption}
              </p>
            ) : (
              <p className="text-[12.5px] text-muted-foreground italic">Sin copy.</p>
            )}
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground hover:underline"
              >
                Ver en Instagram <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* ── Rendimiento ── */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 mb-2.5">
            Rendimiento
          </h3>
          {!m ? (
            <p className="text-[12.5px] text-muted-foreground bg-muted/50 border border-border rounded-lg p-3 leading-relaxed">
              Sin insights todavía. Puede ser un post muy nuevo (Meta demora hasta 48 h) o uno que
              el sync aún no leyó.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Dato label="Alcance" valor={fmtInt(m.reach)} nota="estimado" />
                <Dato label="Visualizaciones" valor={fmtInt(m.views)} />
                <Dato label="Likes" valor={fmtInt(m.likes)} />
                <Dato label="Comentarios" valor={fmtInt(m.comments)} />
                <Dato label="Guardados" valor={fmtInt(m.saved)} />
                <Dato label="Compartidos" valor={fmtInt(m.shares)} />
                <Dato label="Visitas al perfil" valor={fmtInt(m.profileVisits)} />
                <Dato label="Seguidores nuevos" valor={fmtInt(m.follows)} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                <Dato label="Likes / alcance" valor={fmtPct(likesOverReach(m), 2)} destacado />
                <Dato label="Engagement / alcance" valor={fmtPct(erReach, 2)} destacado />
                <Dato
                  label="Likes / views"
                  valor={fmtPct(likesOverViews(m), 2)}
                  nota="secundaria"
                />
                <Dato label="Guardados / alcance" valor={fmtPct(savedOverReach(m), 2)} />
                <Dato label="Compartidos / alcance" valor={fmtPct(sharesOverReach(m), 2)} />
                <Dato label="Comentarios / alcance" valor={fmtPct(commentsOverReach(m), 2)} />
                <Dato label="Seguidores / alcance" valor={fmtPct(followsOverReach(m), 3)} />
                <Dato label="Views / alcance" valor={fmtFactor(viewsPerReach(m))} />
                {esReel && (
                  <Dato label="Tiempo medio" valor={fmtSegundos(m.avgWatchTimeMs)} />
                )}
              </div>

              {/* Benchmark interno */}
              <div className="mt-3 bg-muted/40 border border-border rounded-lg p-3">
                {benchmark && benchmark.median != null ? (
                  <p className="text-[12.5px] text-foreground leading-relaxed">
                    Engagement/alcance <strong>{fmtFactor(factor)}</strong> la mediana de{' '}
                    <strong>{benchmark.label}</strong> ({fmtPct(benchmark.median, 2)}, n=
                    {benchmark.n})
                    {benchmark.n < 8 && (
                      <span className="text-warning"> — muestra chica, tomalo como indicio</span>
                    )}
                    .
                  </p>
                ) : (
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    Todavía no hay benchmark para su segmento: falta clasificar más publicaciones.
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── Evolución ── */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 mb-2.5">
            Evolución
          </h3>
          {snapshots.length < 2 ? (
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              {snapshots.length === 0
                ? 'Sin lecturas registradas.'
                : 'Una sola lectura: la curva se arma con los snapshots que toma el sync (2 h, 24 h, 72 h, 7 d, 30 d). Las publicaciones anteriores al sistema solo tienen su acumulado final — Instagram no expone el histórico.'}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Sparkline data={serie} width={160} height={36} />
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Interacciones acumuladas en {snapshots.length} lecturas.
                </p>
              </div>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-muted-foreground/80 border-b border-border">
                      <th className="font-medium py-1.5 pr-3">Momento</th>
                      <th className="font-medium py-1.5 pr-3 text-right">Alcance</th>
                      <th className="font-medium py-1.5 pr-3 text-right">Likes</th>
                      <th className="font-medium py-1.5 pr-3 text-right">Guardados</th>
                      <th className="font-medium py-1.5 text-right">ER/alcance</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {snapshots.map((s) => (
                      <tr key={s.takenAt} className="border-b border-border/60 last:border-0">
                        <td className="py-1.5 pr-3 text-foreground">
                          {s.ageHours == null
                            ? '—'
                            : s.ageHours < 48
                              ? `${s.ageHours} h`
                              : `${Math.round(s.ageHours / 24)} d`}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-foreground">{fmtInt(s.reach)}</td>
                        <td className="py-1.5 pr-3 text-right text-foreground">{fmtInt(s.likes)}</td>
                        <td className="py-1.5 pr-3 text-right text-foreground">{fmtInt(s.saved)}</td>
                        <td className="py-1.5 text-right text-foreground">
                          {fmtPct(engagementOverReach(s), 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Clasificación y vínculos ── */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 mb-2.5">
            Clasificación
          </h3>
          {post.category === '' ? (
            <p className="text-[12.5px] text-muted-foreground bg-muted/50 border border-border rounded-lg p-3 leading-relaxed">
              Sin clasificar. La clasificación asistida (categoría, portada, estilo) llega con la
              fase de Creative Intelligence y siempre pasa por revisión humana.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
              <Campo k="Categoría" v={CATEGORIA_LABELS[post.category] ?? post.category} />
              <Campo k="Tipo de portada" v={PORTADA_LABELS[post.coverType] ?? post.coverType} />
              <Campo k="Estilo visual" v={ESTILO_LABELS[post.visualStyle] ?? post.visualStyle} />
              <Campo k="Escenario" v={ESCENARIO_LABELS[post.scenario] ?? post.scenario} />
              <Campo k="Personas" v={MODELOS_LABELS[post.hasModels] ?? post.hasModels} />
              <Campo
                k="Clasificado por"
                v={post.classifiedBy === 'claude' ? 'Claude (a revisar)' : post.classifiedBy}
              />
              {/* Trazabilidad de la clasificación: con qué vocabulario se
                  decidió, con cuánta confianza y en qué corrida. Sin esto no se
                  puede deshacer una corrida ni contrastarla contra el gold set. */}
              <Campo
                k="Taxonomía"
                v={post.taxonomyVersion != null ? `v${post.taxonomyVersion}` : '—'}
              />
              <Campo
                k="Confianza"
                v={
                  post.classificationConfidence != null
                    ? `${Math.round(post.classificationConfidence * 100)}%`
                    : '—'
                }
              />
              <Campo k="Corrida" v={post.classificationRun || '—'} />
              {post.classificationNote ? (
                <div className="col-span-2">
                  <Campo k="Nota" v={post.classificationNote} />
                </div>
              ) : null}
            </dl>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] mt-3 pt-3 border-t border-border">
            <Campo
              k="Content OS"
              v={post.contentItemId ? `Item #${post.contentItemId}` : 'Sin vincular'}
            />
            <Campo k="Campaña" v={post.campaignId ? `#${post.campaignId}` : '—'} />
            <Campo
              k="Productos"
              v={post.productIds.length ? post.productIds.join(', ') : '—'}
            />
            <Campo k="Distribución" v={post.wasBoosted ? 'Con pauta' : 'Orgánica'} />
          </dl>
          {post.contentItemId == null && (
            <p className="text-[11.5px] text-muted-foreground/70 mt-2 leading-relaxed">
              El vínculo con el Content OS se sugiere por fecha y copy, pero lo confirma una
              persona: no se crean asociaciones dudosas automáticamente.
            </p>
          )}
        </section>

        <NotaMetodologica />
      </div>
    </>
  );
}

function Dato({
  label,
  valor,
  nota,
  destacado,
}: {
  label: string;
  valor: string;
  nota?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg px-2.5 py-2 ${destacado ? 'border-border-mid bg-muted/30' : 'border-border'}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 leading-tight">
        {label}
      </p>
      <p className="text-[15px] font-bold text-foreground mt-1 leading-none tabular-nums">{valor}</p>
      {nota && (
        <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground/60 mt-1 leading-none">
          {nota}
        </p>
      )}
    </div>
  );
}

function Campo({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{k}</dt>
      <dd className="text-foreground mt-0.5">{v || '—'}</dd>
    </div>
  );
}
