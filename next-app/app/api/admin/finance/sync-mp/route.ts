import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { wcConfigured } from '@/lib/wc-admin';
import { mpClient, runMpSync, loadOrdersById, loadOrdersInRange, type SyncOptions } from '@/lib/finance/mp-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// MP FEE SYNC v2 — READ-ONLY sobre Mercado Pago.
//
// Consulta `GET /v1/payments/{id}` para los pedidos de MP cobrados y persiste el
// snapshot v2 (`_hs_gateway_fee`) + estado del intento (`_hs_gateway_fee_sync`).
// La lógica vive en lib/finance/mp-sync.ts; acá sólo auth y parámetros.
//
//   POST (panel, `x-admin-key`)   corrida manual: por pedido, lista o rango.
//   GET  (Vercel Cron, CRON_SECRET) corrida diaria con la política de resync.
//
// Parámetros comunes:
//   orderId=3147            un pedido        | orderIds=3147,3140,3101  varios
//   after=ISO&before=ISO    rango de creación | days=60                 últimos N días
//   limit=50                máx. pedidos a consultar en MP (cap 300)
//   force=1                 re-sincronizar aunque el snapshot esté estable
//   dryRun=1                consulta MP y arma el reporte SIN escribir en Woo
//   samples=25              cuántos ejemplos incluir en el reporte
//
// El token MP sólo se lee server-side y nunca se devuelve ni se loguea.

const MP_TOKEN = (process.env.MP_ACCESS_TOKEN || '').trim();
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

const int = (v: string | null, def: number, min: number, max: number) => {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

async function run(req: NextRequest, defaults: { limit: number; days: number }) {
  if (!MP_TOKEN) return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 503 });
  if (!wcConfigured()) return NextResponse.json({ error: 'WC_CONSUMER_KEY/SECRET no configurados' }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const opts: SyncOptions = {
    dryRun: sp.get('dryRun') === '1' || sp.get('dry') === '1',
    force: sp.get('force') === '1',
    limit: int(sp.get('limit'), defaults.limit, 1, 300),
    samples: int(sp.get('samples'), 25, 0, 100),
  };

  const idList = [sp.get('orderId'), sp.get('orderIds')].filter(Boolean).join(',')
    .split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);

  let candidates, truncated = false, missing: number[] = [];
  let scope: string;
  if (idList.length) {
    const r = await loadOrdersById([...new Set(idList)]);
    candidates = r.orders; missing = r.missing;
    scope = `pedidos ${idList.join(',')}`;
    if (!candidates.length) return NextResponse.json({ error: `Pedido(s) no encontrado(s): ${missing.join(',')}` }, { status: 404 });
  } else {
    const days = int(sp.get('days'), defaults.days, 1, 400);
    const before = sp.get('before') || new Date().toISOString();
    const after = sp.get('after') || new Date(Date.parse(before) - days * 86400_000).toISOString();
    const r = await loadOrdersInRange(after, before);
    candidates = r.orders; truncated = r.truncated;
    scope = `rango ${after.slice(0, 10)} → ${before.slice(0, 10)}`;
  }

  const report = await runMpSync(candidates, mpClient(MP_TOKEN), opts, truncated);
  report.mode = `${report.mode} · ${scope}`;
  return NextResponse.json(missing.length ? { ...report, notFound: missing } : report);
}

/** Corrida manual desde el panel. */
export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return run(req, { limit: 50, days: 60 });
}

/** Corrida diaria (Vercel Cron). Acepta ?secret=, x-cron-secret o el Bearer de Vercel. */
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET cargado el endpoint no se abre solo.
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return run(req, { limit: 150, days: 60 });
}
