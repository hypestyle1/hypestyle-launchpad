import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdmin } from '@/lib/admin-auth';
import { IgApiError } from '@/lib/ig-insights/client';
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

  try {
    const batch =
      scope === 'backfill'
        ? await runBackfillPage({ after: q.get('after') || undefined, limit })
        : await runRecentSync({ daily: q.get('daily') === '1', limit });

    if (mode === 'dry') {
      return NextResponse.json({
        ok: true,
        mode,
        scope,
        counts: {
          posts: batch.posts.length,
          snapshots: batch.snapshots.length,
          skipped: batch.skipped.length,
        },
        nextAfter: batch.nextAfter,
        skipped: batch.skipped,
        // Muestra para inspección; el lote completo no se devuelve para no
        // armar respuestas gigantes en el backfill.
        sample: {
          posts: batch.posts.slice(0, 3),
          snapshots: batch.snapshots.slice(0, 2),
        },
      });
    }

    const posts = await pushPosts(batch.posts);
    const snapshots = await pushSnapshots(batch.snapshots);
    return NextResponse.json({
      ok: true,
      mode,
      scope,
      posts,
      snapshots,
      skipped: batch.skipped,
      nextAfter: batch.nextAfter,
    });
  } catch (err) {
    if (err instanceof WpStoreError) {
      return NextResponse.json(
        { error: err.message, notDeployed: err.notDeployed },
        { status: err.notDeployed ? 501 : 502 },
      );
    }
    if (err instanceof IgApiError) {
      // 190 = token inválido/vencido, 10 = falta de permiso: el health-check
      // del panel (fase posterior) lee este shape para avisar.
      return NextResponse.json(
        { error: err.message, igErrorCode: err.code },
        { status: 502 },
      );
    }
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
