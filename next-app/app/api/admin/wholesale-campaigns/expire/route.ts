import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { expireCampaigns } from '@/lib/wholesale-campaigns';
import { readCampaigns, writeCampaigns } from '@/lib/wholesale-campaigns-store';

// Cron diario (07:50): marca `ended` las campañas `active` que ya vencieron.
// Es cosmética para el admin — la vigencia real la decide isCampaignLive en
// cada pedido y en el catálogo, sin depender de esto. Acepta CRON_SECRET o
// x-admin-key.

const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.headers.get('x-cron-secret') || bearer;
  const cronOk = !!CRON_SECRET && provided === CRON_SECRET;
  if (!cronOk && !adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const list = await readCampaigns();
    const { list: next, ended } = expireCampaigns(list);
    if (ended.length) await writeCampaigns(next.filter(c => ended.includes(c.id)));
    return NextResponse.json({ ok: true, ended, total: list.length });
  } catch (err) {
    console.error('[wholesale-campaigns/expire]', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
