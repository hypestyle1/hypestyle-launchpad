'use client';

import { ReactNode } from 'react';
import { Clapperboard, FlaskConical, Image as ImageIcon, Images, TriangleAlert } from 'lucide-react';

import { StatusBadge } from '@/components/admin/ui';
import { avisoDeCalidad, evaluarCalidad, type ResumenCalidad } from '@/lib/ig-insights/calidad';
import type { IgPostRecord } from '@/lib/ig-insights/types';

// Piezas compartidas de Content Intelligence (Library + Overview). Todo en
// tokens del admin; nada acá escribe: son vistas de lectura.

/* ── Etiquetas de la taxonomía (doc 03 de la propuesta) ── */

export const CATEGORIA_LABELS: Record<string, string> = {
  'flatlay': 'Producto en piso',
  'editorial': 'Editorial',
  'ugc': 'UGC / comunidad',
  'reel-hablando': 'Reel hablando',
  'reel-visual': 'Reel visual',
  'estudio': 'Producto estudio',
  'bts': 'Behind the scenes',
  'cultura': 'Creativo / cultura',
};

export const PORTADA_LABELS: Record<string, string> = {
  'producto-piso': 'Producto en piso',
  'modelo-editorial': 'Modelo editorial',
  'modelo-producto': 'Modelo + producto',
  'estudio-limpio': 'Estudio limpio',
  'grafica': 'Gráfica / lettering',
  'frame-video': 'Frame de video',
  'collage': 'Collage / split',
};

export const ESTILO_LABELS: Record<string, string> = {
  'luz-natural': 'Luz natural',
  'estudio': 'Estudio',
  'flash': 'Flash directo',
  'ia-asistido': 'IA asistido',
  'archivo': 'Archivo',
};

export const FORMATO_LABELS: Record<string, string> = {
  FEED: 'Feed',
  REELS: 'Reel',
  STORY: 'Story',
};

/**
 * Un reel con `isSharedToFeed === false` es un trial reel: Instagram lo muestra
 * sólo a gente que no sigue la cuenta. Distinta audiencia, distinta mecánica:
 * es su propio formato y no se mezcla con los de la grilla.
 */
export const esReelDePrueba = (post: IgPostRecord): boolean =>
  post.mediaProductType === 'REELS' && post.isSharedToFeed === false;

export function formatoDe(post: IgPostRecord): string {
  if (esReelDePrueba(post)) return 'Reel de prueba';
  if (post.mediaProductType === 'REELS') return 'Reel';
  if (post.mediaProductType === 'STORY') return 'Story';
  if (post.mediaType === 'CAROUSEL_ALBUM') return `Carrusel ×${post.mediaCount}`;
  return 'Imagen';
}

/* ── Banner de datos de prueba (requisito 9) ── */

export function FixtureBanner() {
  return (
    <div className="flex items-center gap-2.5 bg-warning-soft border border-warning/40 text-warning rounded-lg px-4 py-2.5 text-[12.5px] font-medium">
      <FlaskConical size={15} className="shrink-0" />
      <span>
        <strong>Datos de prueba.</strong> El backend de ingesta no está desplegado (gate B1): todo lo
        que ves es sintético y está marcado como DEMO. Al cerrar B1/B2 esta pantalla pasa a datos
        reales sin cambios.
      </span>
    </div>
  );
}

/**
 * Aviso de cobertura incompleta (corrección C3).
 *
 * Aparece sólo si el conjunto cargado NO cubre el total que informa el
 * backend: ninguna pantalla puede presentar como "el período" un recorte
 * silencioso.
 */
export function AvisoCobertura({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-warning-soft border border-warning/40 text-warning rounded-lg px-4 py-2.5 text-[12.5px] font-medium">
      <TriangleAlert size={15} className="shrink-0" />
      <span>
        <strong>Datos incompletos.</strong> {texto}
      </span>
    </div>
  );
}

/**
 * Universo analizado y universo excluido, con el motivo de cada exclusión.
 *
 * No es un cartel de error: es parte del resultado. Si no se ve cuántas
 * publicaciones quedaron afuera y por qué, los números de arriba no se pueden
 * leer.
 */
export function AvisoCalidad({ resumen }: { resumen: ResumenCalidad }) {
  const motivos = Object.entries(resumen.porMotivo).sort((a, b) => b[1] - a[1]);
  return (
    <details className="bg-warning-soft border border-warning/40 text-warning rounded-lg px-4 py-2.5 text-[12.5px]">
      <summary className="cursor-pointer font-medium list-none flex items-center gap-2.5">
        <TriangleAlert size={15} className="shrink-0" />
        <span>{avisoDeCalidad(resumen)}</span>
      </summary>
      <div className="mt-2.5 pl-[25px] space-y-1 font-normal">
        {motivos.map(([motivo, n]) => (
          <p key={motivo} className="leading-snug">
            <strong className="tabular-nums">{n}</strong> · {motivo}
          </p>
        ))}
        {resumen.anterioresAlCorteQuePasan > 0 && (
          <p className="leading-snug opacity-80">
            {resumen.anterioresAlCorteQuePasan} anteriores al {resumen.corteObservado} pasaron igual
            los controles: se excluye por coherencia de los datos, no por fecha.
          </p>
        )}
        <p className="leading-snug opacity-80">
          Las métricas originales no se modifican: esto es una lectura derivada (regla v
          {resumen.regla}).
        </p>
      </div>
    </details>
  );
}

/**
 * Aviso de distribución sin verificar (hallazgo A-a de la auditoría).
 *
 * `was_boosted` no lo escribe ningún proceso automático: hoy una publicación
 * sin marca de pauta significa "no se verificó", no "orgánica confirmada".
 * Mientras eso siga así, toda comparación "orgánica" lleva este cartel.
 */
export function AvisoDistribucion({ n, verificadas = 0 }: { n: number; verificadas?: number }) {
  if (n <= 0) return null;
  return (
    <p className="text-[11px] text-warning/90 leading-relaxed">
      Distribución sin verificar en {n - verificadas} de {n} publicaciones: la marca de pauta se
      carga a mano y todavía no se cruzó con Meta Ads. Tratar este universo como{' '}
      <strong>orgánico no confirmado</strong>.
    </p>
  );
}

/* ── Portada ── */

// Tinte por categoría para los placeholders (la portada real llega con B2,
// cuando el backfill en modo write las descargue a la biblioteca de WP).
const TINTES: Record<string, string> = {
  'flatlay': 'from-stone-500/30',
  'editorial': 'from-rose-500/25',
  'ugc': 'from-amber-500/25',
  'reel-hablando': 'from-sky-500/25',
  'reel-visual': 'from-violet-500/25',
  'estudio': 'from-zinc-500/30',
  'bts': 'from-emerald-500/25',
  'cultura': 'from-orange-500/25',
  '': 'from-muted',
};

export function CoverThumb({ post, className = '' }: { post: IgPostRecord; className?: string }) {
  const esVideo = post.mediaType === 'VIDEO';
  if (post.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.coverUrl}
        alt=""
        loading="lazy"
        className={`w-full aspect-[4/5] object-cover bg-muted ${className}`}
      />
    );
  }
  const Icono = esVideo ? Clapperboard : post.mediaType === 'CAROUSEL_ALBUM' ? Images : ImageIcon;
  return (
    <div
      className={`w-full aspect-[4/5] bg-gradient-to-br ${TINTES[post.category] ?? 'from-muted'} to-muted flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}
    >
      <Icono size={22} strokeWidth={1.5} />
      <span className="text-[10px] uppercase tracking-wider text-center px-2 leading-tight">
        {post.category ? CATEGORIA_LABELS[post.category] ?? post.category : 'Sin portada local'}
      </span>
    </div>
  );
}

/* ── Estados de una publicación (requisito: estados claros) ── */

export function EstadoBadges({ post }: { post: IgPostRecord }) {
  const calidad = evaluarCalidad(post, post.latest);
  const alcanceRoto = calidad.metricas.reach?.estado === 'no-confiable';
  return (
    <>
      {post.wasBoosted && <StatusBadge tone="info">Pauteado</StatusBadge>}
      {esReelDePrueba(post) && <StatusBadge tone="neutral">Fuera de la grilla</StatusBadge>}
      {!post.latest && <StatusBadge tone="warning">Sin insights</StatusBadge>}
      {alcanceRoto && (
        <StatusBadge tone="warning">
          <span title={calidad.metricas.reach?.motivo ?? ''}>Métricas no confiables</span>
        </StatusBadge>
      )}
      {post.category === '' && <StatusBadge tone="warning">Sin clasificar</StatusBadge>}
      {post.category !== '' && post.reviewState === 'pending' && (
        <StatusBadge tone="neutral">Clasif. a revisar</StatusBadge>
      )}
      {post.contentItemId == null && <StatusBadge tone="neutral">Sin vincular</StatusBadge>}
    </>
  );
}

/* ── Advertencia de muestra chica (metodología doc 03) ── */

export function MuestraChica({ n }: { n: number }) {
  return (
    <span
      className="text-[10px] uppercase tracking-wide text-warning bg-warning-soft rounded-full px-1.5 py-0.5 leading-none whitespace-nowrap"
      title={`Con n=${n} (menos de 8) esta comparación no alcanza para sacar conclusiones.`}
    >
      n={n} · muestra chica
    </span>
  );
}

/* ── Nota metodológica compartida ── */

export function NotaMetodologica({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
      Medianas, no promedios. Los ratios usan <strong>reach</strong> (cuentas únicas, estimado);
      likes/views es secundaria porque views cuenta repeticiones. Nada de esto es una fórmula del
      algoritmo de Instagram, y correlación no es causalidad. {children}
    </p>
  );
}
