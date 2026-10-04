import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { isPrivateAccessActive, isMockMode } from '@/lib/private-access/config';
import { getPrivateAccessConfigFresh } from '@/lib/private-access/server';
import { wpGet, wpPost } from '@/lib/private-access/store';
import { NO_STORE, invalidateConfig, wpError } from '@/lib/private-access/admin';

export const dynamic = 'force-dynamic';

/** GET → config + estado + stats, para la cabecera del panel. */
export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { config, notDeployed, error } = await getPrivateAccessConfigFresh();
  if (notDeployed) return NextResponse.json({ notDeployed: true, config }, { headers: NO_STORE });
  if (error) return NextResponse.json({ error }, { status: 502, headers: NO_STORE });
  const stats = isMockMode() ? null : await wpGet<Record<string, number>>('/stats');
  return NextResponse.json({
    config,
    active: isPrivateAccessActive(config),
    mock: isMockMode(),
    stats: stats && stats.ok ? stats.data : null,
    statsError: stats && stats.ok === false ? stats.error : null,
  }, { headers: NO_STORE });
}

/** POST { patch } → actualiza la config (fechas, switch, override, tag). */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const r = await wpPost('/config', body?.patch ?? {});
  if (r.ok === false) return wpError(r);
  invalidateConfig();
  return NextResponse.json({ ok: true, config: r.data }, { headers: NO_STORE });
}
