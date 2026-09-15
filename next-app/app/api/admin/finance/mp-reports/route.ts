import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { auditLog } from '@/lib/admin-audit';
import { mpReportsClient, reportConfig, monthRangeForMp } from '@/lib/finance/mp-reports-client';
import { syncReports, reprocessFile, reconcileStored, REPORT_KINDS } from '@/lib/finance/mp-reports-sync';
import { ledgerStore } from '@/lib/finance/mp-ledger-store';
import type { ReportKind } from '@/lib/finance/mp-reports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Reportes de Mercado Pago (Fase 3).
//
//   GET  (Vercel Cron, CRON_SECRET)  corrida diaria: lista, baja lo nuevo,
//        parsea, persiste, concilia. No regenera el histórico.
//   POST (panel, sección `costos`)   { action }
//        sync                        misma corrida que el cron, a mano
//        generate {kind?, month}     pide a MP el reporte de un mes (async)
//        status                      lista en MP + archivos en el ledger + corridas
//        reprocess {fileName}        re-parsea el CSV guardado y re-concilia
//        reconcile {month}           re-concilia lo persistido de un mes
//        configure                   escribe la config de columnas y activa schedule
//
// El token de MP nunca sale del servidor.

const MP_TOKEN = (process.env.MP_ACCESS_TOKEN || '').trim();
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

function kindOf(v: unknown): ReportKind | null {
  return v === 'release_report' || v === 'settlement_report' ? v : null;
}

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (!CRON_SECRET || provided !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!MP_TOKEN) return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 503 });
  const summary = await syncReports(mpReportsClient(MP_TOKEN), { runKind: 'cron' });
  return NextResponse.json(summary, { status: summary.backendMissing ? 503 : 200 });
}

export async function POST(req: NextRequest) {
  const actor = await authorizeAdmin(req, 'costos');
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!MP_TOKEN) return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 503 });
  const body: any = await req.json().catch(() => ({}));
  const action = String(body?.action || 'status');
  const client = mpReportsClient(MP_TOKEN);
  const who = actor.viaSharedKey ? 'clave compartida' : `perfil #${actor.session!.id} (${actor.session!.role})`;

  if (action === 'status') {
    const [rel, set, files, runs] = await Promise.all([client.list('release_report'), client.list('settlement_report'), ledgerStore.listFiles(), ledgerStore.listRuns(20)]);
    return NextResponse.json({
      mp: { release_report: rel, settlement_report: set },
      ledger: files.ok ? files.body?.files || [] : null,
      backendMissing: !files.ok && files.status === 404,
      runs: runs.ok ? runs.body?.runs || [] : [],
    });
  }

  if (action === 'sync') {
    const summary = await syncReports(client, { runKind: 'manual', force: body?.force === true, limit: Number(body?.limit) || 20 });
    return NextResponse.json(summary, { status: summary.backendMissing ? 503 : 200 });
  }

  if (action === 'generate') {
    const month = String(body?.month || '');
    const range = monthRangeForMp(month);
    if (!range) return NextResponse.json({ error: 'month inválido (YYYY-MM)' }, { status: 400 });
    const kinds = kindOf(body?.kind) ? [kindOf(body?.kind)!] : REPORT_KINDS;
    const out: Record<string, unknown> = {};
    for (const k of kinds) {
      const r = await client.create(k, range.begin, range.end);
      out[k] = { ok: r.ok, status: r.status, id: r.body?.id ?? null, error: r.ok ? null : String(r.body?.message || r.body?.error || `http_${r.status}`) };
    }
    await auditLog({ action: 'mp_report_generate', actor: who, result: 'ok', details: { month, kinds } });
    return NextResponse.json({ month, range, results: out });
  }

  if (action === 'reprocess') {
    const fileName = String(body?.fileName || '');
    if (!/^[A-Za-z0-9_.-]+$/.test(fileName)) return NextResponse.json({ error: 'fileName inválido' }, { status: 400 });
    const summary = await reprocessFile(fileName);
    await auditLog({ action: 'mp_report_reprocess', actor: who, result: summary.errors.length ? 'error' : 'ok', error: summary.errors.slice(0, 3).join('; ') || null, details: { fileName } });
    return NextResponse.json(summary, { status: summary.backendMissing ? 503 : 200 });
  }

  if (action === 'reconcile') {
    const month = String(body?.month || '');
    const summary = await reconcileStored(month);
    return NextResponse.json(summary, { status: summary.backendMissing ? 503 : 200 });
  }

  if (action === 'configure') {
    const out: Record<string, unknown> = {};
    for (const k of REPORT_KINDS) {
      const cfg = await client.putConfig(k, reportConfig(k));
      const sch = await client.schedule(k, true);
      out[k] = { config: cfg.status, schedule: sch.status };
    }
    await auditLog({ action: 'mp_report_configure', actor: who, result: 'ok', details: out });
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
