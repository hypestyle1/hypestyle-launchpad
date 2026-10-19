import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdmin } from '@/lib/admin-auth';
import { IgApiError } from '@/lib/ig-insights/client';
import { classifyIgFailure, describeFailure, statusForFailure } from '@/lib/ig-insights/errors';
import { runBackfillPage, runRecentSync } from '@/lib/ig-insights/sync';
import { pushPosts, pushSnapshots, syncWriteEnabled, WpStoreError } from '@/lib/ig-insights/wp-store';

/**
 * Sync de Content Intelligence (PR-2/PR-3 del plan
 * _claude/propuestas/_content-intelligence-2026-10-17/06-plan-ejecucion-prs.md).
 *
 * GET /api/admin/ig-sync
 *   ?scope=recent (default) | backfill
 *   ?mode=dry (default)     | write
 *   ?daily=1   (recent: incluye posts de <30 días además de los de <72 h)
 *   ?after=<cursor>&limit=  (backfill: pagina hacia atrás, reanudable)
 *   ?until=<unix|YYYY-MM-DD> (backfill: retoma en esa fecha, sin depender del cursor)
 *
 * DRY por defecto: lee de Meta, arma los lotes y los DEVUELVE sin escribir en
 * ningún lado. El modo write exige además `IG_SYNC_WRITE=1` en el entorno
 * (apagada hasta el gate B2) — sin esa env responde 403 aunque el secreto sea
 * válido. No hay entrada en vercel.json: el cron se activa recién en el gate B3.
 *
 * Auth: CRON_SECRET (Bearer de Vercel Cron, ?secret= o x-cron-secret), o un
 * admin con la sección 'creadores' (para corridas manuales desde el panel).
 */

export const dynamic = 'force-dynamic';

/**
 * Corrección C1 de la auditoría. Sin esto la función se corta en el default de
 * Vercel (~15 s) y una página de backfill de 25 publicaciones a 600 ms de
 * throttle no entra. Los hermanos de cron ya declaran 60 (`finance/sync-mp`,
 * `close-friends/sync`).
 */
export const maxDuration = 60;

/** Reserva para las dos escrituras a WP (bulk de posts + bulk de snapshots). */
const RESERVA_ESCRITURA_MS = 15_000;
/** Margen para serializar la respuesta y cerrar la función. */
const MARGEN_MS = 5_000;
/** Presupuesto real para hablar con Meta dentro de una invocación. */
const PRESUPUESTO_META_MS = maxDuration * 1_000 - RESERVA_ESCRITURA_MS - MARGEN_MS;

const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

async function authed(req: NextRequest): Promise<boolean> {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided =
    req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET configurado esa vía no existe.
  if (CRON_SECRET && provided === CRON_SECRET) return true;
  return Boolean(await authorizeAdmin(req, 'creadores'));
}

export async function GET(req: NextRequest) {
  if (!(await authed(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const scope = q.get('scope') === 'backfill' ? 'backfill' : 'recent';
  const mode = q.get('mode') === 'write' ? 'write' : 'dry';
  const limit = Math.min(Math.max(Number(q.get('limit')) || 25, 1), 50);

  if (mode === 'write' && !syncWriteEnabled()) {
    return NextResponse.json(
      { error: 'Modo write deshabilitado: falta IG_SYNC_WRITE=1 (gate B2 pendiente de aprobación).' },
      { status: 403 },
    );
  }

  const deadlineAt = Date.now() + PRESUPUESTO_META_MS;

  try {
    const batch =
      scope === 'backfill'
        ? await runBackfillPage({
            after: q.get('after') || undefined,
            until: q.get('until') || undefined,
            limit,
            deadlineAt,
          })
        : await runRecentSync({ daily: q.get('daily') === '1', limit, deadlineAt });

    const comun = {
      ok: true,
      mode,
      scope,
      counts: {
        posts: batch.posts.length,
        snapshots: batch.snapshots.length,
        skipped: batch.skipped.length,
        pendientes: batch.pendientes.length,
      },
      // `complete: false` ⇒ la página NO se consumió entera: hay que retomar
      // con `resume` antes de avanzar el cursor.
      complete: batch.complete,
      nextAfter: batch.nextAfter,
      resume: batch.resume,
      skipped: batch.skipped,
      pendientes: batch.pendientes,
      stats: batch.stats,
    };

    if (mode === 'dry') {
      return NextResponse.json({
        ...comun,
        // Muestra para inspección; el lote completo no se devuelve para no
        // armar respuestas gigantes en el backfill.
        sample: {
          posts: batch.posts.slice(0, 3),
          snapshots: batch.snapshots.slice(0, 2),
        },
      });
    }

    // Orden obligado: primero las publicaciones, después sus métricas. Si la
    // segunda escritura falla, se informa `written.snapshots = null` y la
    // página queda para reintentar (los dos bulks son idempotentes).
    const posts = await pushPosts(batch.posts);
    let snapshots = null;
    let errorEscritura: string | null = null;
    try {
      snapshots = await pushSnapshots(batch.snapshots);
    } catch (err) {
      errorEscritura = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json(
      {
        ...comun,
        ok: errorEscritura == null,
        complete: batch.complete && errorEscritura == null,
        nextAfter: errorEscritura == null ? batch.nextAfter : null,
        written: { posts, snapshots },
        errorEscritura,
      },
      { status: errorEscritura == null ? 200 : 502 },
    );
  } catch (err) {
    if (err instanceof WpStoreError) {
      return NextResponse.json(
        { error: err.message, notDeployed: err.notDeployed },
        { status: err.notDeployed ? 501 : 502 },
      );
    }
    if (err instanceof IgApiError) {
      // Clasificado (C2): el rate limit sale como 429 y con `retryAfterHint`
      // para que quien corre el backfill sepa que hay que esperar, no que
      // faltan métricas.
      const falla = classifyIgFailure(err);
      return NextResponse.json(
        {
          error: describeFailure(falla),
          igErrorCode: err.code,
          igErrorKind: falla.kind,
          aborted: true,
          retryAfterHint: falla.kind === 'rate-limit' ? '~1 hora (ventana de Meta)' : null,
          resume: { after: q.get('after') || null, until: q.get('until') || null },
        },
        { status: statusForFailure(falla) },
      );
    }
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
