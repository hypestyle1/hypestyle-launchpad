/**
 * Ratios derivados de un snapshot (doc 03 de la propuesta).
 *
 * Denominador por defecto: `reach` (cuentas únicas; Meta lo declara
 * estimación). `views` cuenta repeticiones de la misma cuenta, así que
 * likes/views es una métrica SECUNDARIA (requisito R2) y se muestra siempre
 * con esa aclaración. Nada de esto es una fórmula del algoritmo de Instagram.
 *
 * Si falta un insumo el ratio es null — no se inventa ni se subestima.
 */

import type { IgSnapshotMetrics } from './types';

type M = Partial<IgSnapshotMetrics>;

export function ratio(
  num: number | null | undefined,
  den: number | null | undefined,
): number | null {
  if (num == null || den == null || den <= 0) return null;
  return num / den;
}

/**
 * Engagement sobre alcance: (likes + comments + saved + shares) / reach.
 * Exige las cuatro interacciones presentes: con una ausente el total daría
 * de menos y el post parecería peor de lo que fue.
 */
export function engagementOverReach(m: M): number | null {
  const { likes, comments, saved, shares } = m;
  if (likes == null || comments == null || saved == null || shares == null) return null;
  return ratio(likes + comments + saved + shares, m.reach);
}

/** KPI principal de reacción relativa (R2). */
export const likesOverReach = (m: M): number | null => ratio(m.likes, m.reach);

/** Secundaria (R2): views incluye repeticiones de la misma cuenta. */
export const likesOverViews = (m: M): number | null => ratio(m.likes, m.views);

/** Señal fuerte de interés en el producto. */
export const savedOverReach = (m: M): number | null => ratio(m.saved, m.reach);

/** Señal de distribución. */
export const sharesOverReach = (m: M): number | null => ratio(m.shares, m.reach);

export const commentsOverReach = (m: M): number | null => ratio(m.comments, m.reach);

/** Captación: seguidores nuevos atribuidos por alcance. */
export const followsOverReach = (m: M): number | null => ratio(m.follows, m.reach);

/** Profundidad: cuántas veces en promedio vio el post cada cuenta alcanzada. */
export const viewsPerReach = (m: M): number | null => ratio(m.views, m.reach);
