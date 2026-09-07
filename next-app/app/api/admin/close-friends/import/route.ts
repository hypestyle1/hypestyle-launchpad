import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { upsertEntries } from '@/lib/close-friends/store';
import { entriesFromSheetCsv } from '@/lib/close-friends/types';

export const dynamic = 'force-dynamic';

/**
 * POST { csv: string } — importa el CSV del sheet maestro (Woo + Tienda Nube).
 * Suma lo que falta y respeta los tildes que ya estaban en el panel; los
 * tildados del sheet ("Agregado a CF" = TRUE) quedan tildados acá también.
 */
export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const csv = typeof body?.csv === 'string' ? body.csv : '';
  if (!csv.trim()) return NextResponse.json({ error: 'CSV vacío' }, { status: 400 });
  if (csv.length > 2_000_000) return NextResponse.json({ error: 'CSV demasiado grande' }, { status: 413 });

  const entries = entriesFromSheetCsv(csv);
  if (!entries.length) return NextResponse.json({ error: 'No se encontró la columna "Usuario IG" o el archivo está vacío' }, { status: 400 });

  const r = await upsertEntries(entries);
  if (r.ok === false) {
    if (r.notDeployed) return NextResponse.json({ error: 'Backend no desplegado (PHP 1.31.0)' }, { status: 501 });
    return NextResponse.json({ error: r.error || 'No se pudo guardar' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, parsed: entries.length, added: r.data.added, updated: r.data.updated, total: r.data.total });
}
