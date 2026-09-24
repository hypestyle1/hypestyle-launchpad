import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { mapLimit } from '@/lib/map-limit';
import { isExcludedFromMayoristaRest } from '@/lib/mayorista-products';
import { auditWholesalePrices, auditEmailHtml, type AuditInput } from '@/lib/mayorista-price-audit';

// Auditoría diaria de precios mayoristas (ver lib/mayorista-price-audit.ts).
//
//   GET  (Vercel Cron, CRON_SECRET; o x-admin-key desde el panel)
//     ?dry=1     no escribe la marca en los productos
//     ?report=1  manda el mail aunque no haya cambios
//
// Lee todos los productos publicados por WC REST (con variaciones, porque el
// regular_price de un variable vive en cada variación), compara el
// regular_price de los del catálogo mayorista contra la meta `_hs_ws_audit`,
// avisa por mail si alguno cambió y deja la marca al día.

export const maxDuration = 120;

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const CRON_SECRET = (process.env.CRON_SECRET || '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_EMAIL = 'hypestylearg@gmail.com';
const SENDER = { name: 'Hype Panel', email: 'info@hypestyle.com.ar' };

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function wc(path: string, init?: RequestInit) {
  // _cb: la CDN de Hostinger cachea los GET por URL exacta.
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, {
    ...init,
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`WC ${res.status} en ${path}`);
  return res.json();
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

async function loadProducts(): Promise<AuditInput[]> {
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const data = await wc(`products?status=publish&per_page=100&page=${page}&_fields=id,name,slug,type,status,categories,regular_price,meta_data`);
    all.push(...data);
    if (data.length < 100) break;
  }
  // Variaciones de a 3: WP tira 500 con más fan-out.
  return mapLimit(all, 3, async (p): Promise<AuditInput> => {
    let regulars: number[] = [];
    if (p.type === 'variable') {
      const vs = await wc(`products/${p.id}/variations?per_page=100&_fields=id,regular_price,status`);
      const seen = new Set<number>();
      for (const v of vs as any[]) {
        if (v.status !== 'publish') continue;
        const r = num(v.regular_price);
        if (r != null) seen.add(r);
      }
      regulars = [...seen];
    } else {
      const r = num(p.regular_price); if (r != null) regulars = [r];
    }
    return {
      id: p.id, name: p.name,
      regularPrice: regulars.length ? Math.max(...regulars) : null,
      regulars,
      meta: p.meta_data ?? [],
      wholesale: !isExcludedFromMayoristaRest(p),
    };
  });
}

async function sendMail(html: string, subject: string) {
  if (!BREVO_API_KEY) return false;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [{ email: ADMIN_EMAIL }], subject, htmlContent: html }),
  }).catch(() => null);
  return !!res?.ok;
}

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.headers.get('x-cron-secret') || bearer;
  const cronOk = !!CRON_SECRET && provided === CRON_SECRET;
  if (!cronOk && !adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const report = req.nextUrl.searchParams.get('report') === '1';
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

  try {
    const products = await loadProducts();
    const result = auditWholesalePrices(products, today);

    let mailed = false;
    if (result.changes.length || report) {
      const subject = result.changes.length
        ? `⚠ ${result.changes.length} precio(s) mayorista(s) cambiaron — ${today}`
        : `Precios mayoristas sin cambios — ${today}`;
      mailed = await sendMail(auditEmailHtml(result, today), subject);
    }

    let updated = 0;
    if (!dry && result.updates.length) {
      for (let i = 0; i < result.updates.length; i += 50) {
        const chunk = result.updates.slice(i, i + 50);
        await wc('products/batch', { method: 'POST', body: JSON.stringify({ update: chunk }) });
        updated += chunk.length;
      }
    }

    return NextResponse.json({
      ok: true, today, dry, mailed, updated,
      audited: products.filter(p => p.wholesale).length,
      changes: result.changes, baseline: result.baseline.length, divergent: result.divergent, unpriced: result.unpriced, unchanged: result.unchanged,
    });
  } catch (err) {
    console.error('[mayorista-precios-audit]', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
