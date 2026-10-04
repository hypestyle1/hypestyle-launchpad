import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { parseMembersImport } from '@/lib/private-access/import';
import { loadStore } from '@/lib/close-friends/store';
import { wpPost } from '@/lib/private-access/store';
import { NO_STORE, wpError } from '@/lib/private-access/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST { text, dryRun? }               → CSV `username,name` o JSON del export de Instagram
 * POST { fromCloseFriends: true }      → los tildados del panel Close Friends
 *
 * Con dryRun devuelve el preview (cuántos, ejemplos, inválidos) sin guardar.
 * Suma solo los que faltan: nunca borra ni reactiva bloqueados.
 */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  let rows: { handle: string; name: string }[];
  let invalid: string[] = [];
  let source: 'csv' | 'ig_export' | 'close_friends' = 'csv';
  let format = 'csv';

  if (body?.fromCloseFriends) {
    const cf = await loadStore();
    if (cf.ok === false) return NextResponse.json({ error: cf.error || 'No se pudo leer Close Friends' }, { status: 502 });
    // Solo los tildados ("ya está en Mejores Amigos"), con usuario válido.
    rows = cf.data.entries
      .filter((e) => e.added && e.status !== 'descartado' && e.status !== 'revisar')
      .map((e) => ({ handle: e.handle, name: e.name || '' }));
    source = 'close_friends';
    format = 'close_friends';
  } else {
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!text.trim()) return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 });
    if (text.length > 5_000_000) return NextResponse.json({ error: 'Archivo demasiado grande' }, { status: 413 });
    const parsed = parseMembersImport(text);
    rows = parsed.rows;
    invalid = parsed.invalid;
    format = parsed.format;
    if (parsed.format === 'instagram_json') source = 'ig_export';
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'No se encontró ningún usuario válido', invalid: invalid.slice(0, 50) }, { status: 400 });
  }

  if (body?.dryRun) {
    return NextResponse.json({ dryRun: true, format, valid: rows.length, sample: rows.slice(0, 8), invalid: invalid.slice(0, 50), invalidCount: invalid.length }, { headers: NO_STORE });
  }

  const r = await wpPost<Record<string, unknown>>('/members/import', { rows, source });
  if (r.ok === false) return wpError(r);
  return NextResponse.json({ ...r.data, format, invalid: invalid.slice(0, 50), invalidCount: invalid.length }, { headers: NO_STORE });
}
