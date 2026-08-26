import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { resolvePreset } from '@/lib/dashboard/periods';
import { computeCapacity } from '@/lib/bot/capacity';
import { getN8nData, lastGoodCache, n8nConfigured } from '@/lib/bot/n8n';
import { N8N_MONTHLY_LIMIT } from '@/lib/bot/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!n8nConfigured()) {
    return NextResponse.json({ error: 'n8n no configurado', hint: 'Falta N8N_API_KEY en el servidor.' }, { status: 400 });
  }

  const force = req.nextUrl.searchParams.get('refresh') === '1';
  // Mes calendario en curso, hora AR.
  const month = resolvePreset('thisMonth', new Date());
  const monthStartMs = Date.parse(month.startUTC);
  const monthEndMs = Date.parse(month.endUTC);
  const nowMs = Date.now();

  try {
    const { executions, names, at } = await getN8nData(monthStartMs, force);
    const cap = computeCapacity({ executions, monthStartMs, monthEndMs, nowMs, monthlyLimit: N8N_MONTHLY_LIMIT, workflowNames: names });
    return NextResponse.json({ ...cap, lastUpdated: new Date(at).toISOString(), stale: false });
  } catch (e: any) {
    // Error state: NO devolver 0/10000. Servir el último dato válido si existe.
    const last = lastGoodCache();
    if (last) {
      const cap = computeCapacity({ executions: last.executions, monthStartMs, monthEndMs, nowMs, monthlyLimit: N8N_MONTHLY_LIMIT, workflowNames: last.names });
      return NextResponse.json({ ...cap, lastUpdated: new Date(last.at).toISOString(), stale: true, error: 'No pudimos actualizar n8n' });
    }
    return NextResponse.json({ error: 'No pudimos consultar n8n', detail: String(e?.message || e) }, { status: 502 });
  }
}
