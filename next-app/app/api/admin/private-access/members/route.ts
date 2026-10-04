import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { isValidHandle, normalizeHandle } from '@/lib/private-access/config';
import { wpGet, wpPost } from '@/lib/private-access/store';
import { NO_STORE, wpError } from '@/lib/private-access/admin';

export const dynamic = 'force-dynamic';

/** GET ?search=&page= → lista paginada de miembros. */
export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const r = await wpGet('/members', { search: sp.get('search') || undefined, page: sp.get('page') || 1, per_page: sp.get('per_page') || 100 });
  if (r.ok === false) return wpError(r);
  return NextResponse.json(r.data, { headers: NO_STORE });
}

/**
 * POST { action: 'upsert', handle, name?, note?, status? }
 *    | { action: 'delete', handle }
 */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const handle = normalizeHandle(String(body?.handle ?? ''));
  if (!isValidHandle(handle)) return NextResponse.json({ error: 'Usuario de Instagram inválido' }, { status: 400 });

  if (body?.action === 'delete') {
    const r = await wpPost('/members/delete', { handle });
    if (r.ok === false) return wpError(r);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const patch: Record<string, unknown> = { handle, source: 'manual' };
  for (const k of ['name', 'note', 'status'] as const) if (typeof body?.[k] === 'string') patch[k] = body[k];
  const r = await wpPost('/members', patch);
  if (r.ok === false) return wpError(r);
  return NextResponse.json(r.data, { headers: NO_STORE });
}
