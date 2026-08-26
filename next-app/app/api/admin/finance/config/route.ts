import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { loadFinanceConfig, saveFinanceConfig } from '@/lib/finance/load-config';
import { mergeFinanceConfig } from '@/lib/finance/config';
import type { FinanceConfig } from '@/lib/finance/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const cfg = await loadFinanceConfig(true);
  return NextResponse.json({ config: cfg });
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  let body: Partial<FinanceConfig>;
  try { body = (await req.json())?.config ?? (await req.json()); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  const cfg = mergeFinanceConfig(body);
  const ok = await saveFinanceConfig(cfg);
  if (!ok) {
    // La ruta PHP finance-config todavía no está desplegada, o falló.
    return NextResponse.json({ error: 'No se pudo guardar. ¿Está desplegada la ruta hypestyle/v1/finance-config?', config: cfg }, { status: 502 });
  }
  return NextResponse.json({ ok: true, config: cfg });
}
