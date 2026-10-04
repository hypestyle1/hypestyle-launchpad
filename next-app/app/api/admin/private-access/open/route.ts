import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches, authorizeAdmin } from '@/lib/admin-auth';
import { getPrivateAccessConfigFresh } from '@/lib/private-access/server';
import { NO_STORE, openCollection, wpError } from '@/lib/private-access/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

/**
 * POST { dryRun? } — "Abrir al público ahora" desde el panel. Con dryRun
 * devuelve qué productos se publicarían, sin tocar nada.
 */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const r = await openCollection(!!body?.dryRun);
  if (r.ok === false) return wpError(r);
  return NextResponse.json(r.data, { headers: NO_STORE });
}

/**
 * GET — cron de Vercel cada 10 minutos (ver vercel.json). Si ya pasó la hora
 * de apertura pública y la colección no se abrió, la abre. La vigencia de la
 * preventa NO depende de esto (se calcula en cada request); el cron solo
 * publica los productos. Acepta CRON_SECRET o x-admin-key.
 */
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const cronOk = !!CRON_SECRET && (bearer === CRON_SECRET || req.headers.get('x-cron-secret') === CRON_SECRET);
  if (!cronOk && !adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { config, notDeployed, error } = await getPrivateAccessConfigFresh();
  if (notDeployed) return NextResponse.json({ ok: true, skipped: 'plugin no desplegado' });
  if (error) return NextResponse.json({ ok: false, error }, { status: 502 });

  const due = Date.now() >= new Date(config.publicOpenAt).getTime();
  if (!due || config.openedAt || config.override === 'force_on') {
    return NextResponse.json({ ok: true, skipped: config.openedAt ? 'ya abierta' : !due ? 'todavía no es la hora' : 'override force_on' });
  }
  const r = await openCollection(false);
  if (r.ok === false) return wpError(r);
  console.log('[private-access/open] apertura pública', r.data.published.length, 'productos');
  return NextResponse.json({ ok: true, opened: r.data });
}
