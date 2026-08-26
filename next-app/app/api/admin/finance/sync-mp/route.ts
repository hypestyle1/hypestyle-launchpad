import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { GATEWAY_FEE_META } from '@/lib/finance/fetch-orders';
import { providerOf } from '@/lib/finance/fees';
import type { GatewayFeeSnapshot } from '@/lib/finance/types';

export const dynamic = 'force-dynamic';

// MP FEE SYNC — READ-ONLY sobre Mercado Pago.
//
// Para pedidos de MP (tarjeta/wallet) con transaction_id y SIN snapshot, consulta
// GET /v1/payments/{id} (sólo lectura, no toca preferencias/checkout/webhooks) y
// persiste el fee REAL en la meta del pedido `_hs_gateway_fee`. Idempotente
// (saltea los ya sincronizados), por lotes, con manejo de error por pedido.
//
// El token MP se lee server-side (MP_ACCESS_TOKEN, la misma cuenta productiva del
// checkout). Nunca se expone ni se loguea.
//
// `dryRun=1` → consulta MP y devuelve lo que escribiría, SIN escribir en Woo.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const MP_TOKEN = (process.env.MP_ACCESS_TOKEN || '').trim();
const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const MP_METHODS = new Set(['tarjeta', 'mercadopago', 'woo-mercado-pago-basic']);

async function mpPayment(id: string, tries = 2): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` }, cache: 'no-store',
      });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 500 * (i + 1))); continue; } // rate limit → backoff
      if (!res.ok) return null;
      return await res.json();
    } catch { await new Promise((r) => setTimeout(r, 300)); }
  }
  return null;
}

/** Arma el snapshot desde el payment de MP, usando SÓLO campos que MP devuelve. */
function toSnapshot(pay: any, provider: any): GatewayFeeSnapshot | null {
  const gross = Number(pay.transaction_amount);
  if (!Number.isFinite(gross)) return null;
  const fees = Array.isArray(pay.fee_details) ? pay.fee_details : [];
  const gatewayFee = round2(fees.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0));
  const net = Number(pay?.transaction_details?.net_received_amount);
  const netReceived = Number.isFinite(net) ? round2(net) : round2(gross - gatewayFee);
  // Deducciones que NO son fee económico (retenciones/impuestos): gross − net − fee.
  const otherCashDeduction = round2(gross - netReceived - gatewayFee);
  return {
    provider,
    transactionId: String(pay.id),
    grossAmount: round2(gross),
    gatewayFee,
    netReceived,
    breakdown: fees.map((f: any) => ({ type: String(f.type || 'fee'), amount: round2(Number(f.amount) || 0) })),
    otherCashDeduction: otherCashDeduction > 0 ? otherCashDeduction : 0,
    currency: String(pay.currency_id || 'ARS'),
    syncedAt: new Date().toISOString(),
    source: 'exact',
  };
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!MP_TOKEN) return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado' }, { status: 400 });

  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get('dryRun') === '1';
  const after = sp.get('after') || '2026-05-10T00:00:00';
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '60')));

  // Pedidos MP pagados sin snapshot todavía.
  const params = new URLSearchParams({
    status: 'processing,completed', per_page: '100', orderby: 'date', order: 'desc',
    after, _fields: 'id,payment_method,transaction_id,meta_data', _cb: String(Date.now()),
  });
  const listRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
  if (!listRes.ok) return NextResponse.json({ error: 'WC list error' }, { status: 502 });
  const list = (await listRes.json()) as any[];

  const pending = list.filter((o) =>
    MP_METHODS.has(o.payment_method) && o.transaction_id &&
    !(o.meta_data || []).some((m: any) => m.key === GATEWAY_FEE_META)
  ).slice(0, limit);

  const report = { candidates: pending.length, synced: 0, skipped: 0, failed: [] as any[], dryRun, samples: [] as any[] };

  // Lotes de 5 para no saturar MP.
  for (let i = 0; i < pending.length; i += 5) {
    const batch = pending.slice(i, i + 5);
    await Promise.all(batch.map(async (o) => {
      const pay = await mpPayment(String(o.transaction_id));
      if (!pay) { report.failed.push({ order: o.id, reason: 'MP no respondió / sin datos' }); return; }
      const snap = toSnapshot(pay, providerOf(o.payment_method));
      if (!snap) { report.failed.push({ order: o.id, reason: 'payment sin transaction_amount' }); return; }
      if (dryRun) {
        report.skipped++;
        if (report.samples.length < 5) report.samples.push({ order: o.id, gross: snap.grossAmount, fee: snap.gatewayFee, net: snap.netReceived, other: snap.otherCashDeduction });
        return;
      }
      const put = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${o.id}`, {
        method: 'PUT', headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_data: [{ key: GATEWAY_FEE_META, value: JSON.stringify(snap) }] }),
      });
      if (put.ok) report.synced++;
      else report.failed.push({ order: o.id, reason: `WC write ${put.status}` });
    }));
  }

  return NextResponse.json(report);
}
