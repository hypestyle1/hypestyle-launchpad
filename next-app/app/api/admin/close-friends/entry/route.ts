import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { deleteEntry, patchEntry } from '@/lib/close-friends/store';

export const dynamic = 'force-dynamic';

/** POST { key, patch: { added?, status?, handle?, note?, name? } } — edita una entrada. */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const key = typeof body?.key === 'string' ? body.key : '';
  const patch = body?.patch && typeof body.patch === 'object' ? body.patch : null;
  if (!key || !patch) return NextResponse.json({ error: 'Falta key o patch' }, { status: 400 });

  const r = await patchEntry(key, patch);
  if (r.ok === false) {
    if (r.notDeployed) return NextResponse.json({ error: 'Backend no desplegado (PHP 1.31.0)' }, { status: 501 });
    if (r.status === 409) return NextResponse.json({ error: r.error, conflict: true }, { status: 409 });
    return NextResponse.json({ error: r.error || 'No se pudo guardar' }, { status: r.status === 404 ? 404 : 502 });
  }
  return NextResponse.json({ ok: true, entry: r.data.entry });
}

/** DELETE ?key=… — borra la entrada del todo. */
export async function DELETE(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const key = req.nextUrl.searchParams.get('key') || '';
  if (!key) return NextResponse.json({ error: 'Falta key' }, { status: 400 });
  const r = await deleteEntry(key);
  if (r.ok === false) {
    if (r.notDeployed) return NextResponse.json({ error: 'Backend no desplegado (PHP 1.31.0)' }, { status: 501 });
    return NextResponse.json({ error: r.error || 'No se pudo borrar' }, { status: r.status === 404 ? 404 : 502 });
  }
  return NextResponse.json({ ok: true, total: r.data.total });
}
