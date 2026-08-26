import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const BREVO_KEY    = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const NEWSLETTER_LIST_ID = 3;

// Órdenes cuyo status implica que el pago efectivamente llegó (no cuenta cancelled/pending/failed/on-hold).
const PAID_STATUSES = ['processing', 'completed', 'refunded'];

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function fetchAllOrders(after: string): Promise<any[]> {
  const perPage = 100;
  let page = 1;
  const all: any[] = [];
  for (;;) {
    const params = new URLSearchParams({
      status: 'any', per_page: String(perPage), page: String(page),
      orderby: 'date', order: 'desc', after,
      _fields: 'id,number,status,billing,total,date_created,meta_data',
    });
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() }, cache: 'no-store',
    });
    if (!res.ok) break;
    const batch = await res.json() as any[];
    all.push(...batch);
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
    if (page >= totalPages || batch.length === 0) break;
    page++;
  }
  return all;
}

async function fetchAllContacts(): Promise<any[]> {
  const limit = 500;
  let offset = 0;
  const all: any[] = [];
  for (;;) {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${NEWSLETTER_LIST_ID}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { 'api-key': BREVO_KEY }, cache: 'no-store' }
    );
    if (!res.ok) break;
    const data = await res.json();
    const page = data.contacts || [];
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const days  = parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30;
  const after = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19);

  const [orders, contacts] = await Promise.all([fetchAllOrders(after), fetchAllContacts()]);

  // ─── Carrito abandonado ───────────────────────────────────────────────
  // Pedidos que en algún momento recibieron al menos un mail de la secuencia
  // (tienen _hs_abandoned_step), creados dentro de la ventana pedida.
  const abandonedOrders = orders.filter(o =>
    (o.meta_data || []).some((m: any) => m.key === '_hs_abandoned_step')
  );

  const stepReached = (o: any) => {
    const v = (o.meta_data || []).find((m: any) => m.key === '_hs_abandoned_step')?.value;
    return parseInt(String(v), 10) || 0;
  };

  const abandonedByStep = { step1: 0, step2: 0, step3: 0 };
  let recoveredOrders = 0;
  let recoveredRevenue = 0;

  for (const o of abandonedOrders) {
    const step = stepReached(o);
    if (step >= 1) abandonedByStep.step1++;
    if (step >= 2) abandonedByStep.step2++;
    if (step >= 3) abandonedByStep.step3++;
    if (PAID_STATUSES.includes(o.status)) {
      recoveredOrders++;
      recoveredRevenue += parseFloat(o.total || '0');
    }
  }

  // ─── Bienvenida ────────────────────────────────────────────────────────
  // Contactos de la lista de newsletter que se suscribieron dentro de la ventana
  // (tienen SIGNUP_DATE, seteado a partir de la feature de secuencia — los
  // suscriptos de antes quedan afuera de esta métrica).
  const afterMs = new Date(after).getTime();
  const welcomeContacts = contacts.filter(c => {
    const signup = c.attributes?.SIGNUP_DATE;
    return signup && new Date(signup).getTime() >= afterMs && !c.emailBlacklisted;
  });

  const welcomeByStep = { step1: 0, step2: 0, step3: 0 };
  for (const c of welcomeContacts) {
    const step = parseInt(String(c.attributes?.WELCOME_STEP ?? ''), 10) || 0;
    if (step >= 1) welcomeByStep.step1++;
    if (step >= 2) welcomeByStep.step2++;
    if (step >= 3) welcomeByStep.step3++;
  }

  // Atribución de compras: pedidos pagos, de esta misma ventana, hechos por un
  // email que se suscribió a la lista y cuya orden es posterior a su SIGNUP_DATE.
  const paidOrdersByEmail = new Map<string, any[]>();
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status)) continue;
    const email = (o.billing?.email || '').toLowerCase().trim();
    if (!email) continue;
    if (!paidOrdersByEmail.has(email)) paidOrdersByEmail.set(email, []);
    paidOrdersByEmail.get(email)!.push(o);
  }

  let welcomeBuyers = 0;
  let welcomeRevenue = 0;
  for (const c of welcomeContacts) {
    const email = (c.email || '').toLowerCase().trim();
    const signupMs = new Date(c.attributes?.SIGNUP_DATE).getTime();
    const matches = (paidOrdersByEmail.get(email) || []).filter(
      o => new Date(o.date_created).getTime() >= signupMs
    );
    if (matches.length) {
      welcomeBuyers++;
      welcomeRevenue += matches.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
    }
  }

  return NextResponse.json({
    period_days: days,
    abandoned: {
      sent: abandonedByStep,
      recovered_orders: recoveredOrders,
      recovered_revenue: Math.round(recoveredRevenue),
      conversion_rate: abandonedByStep.step1 ? recoveredOrders / abandonedByStep.step1 : 0,
    },
    welcome: {
      sent: welcomeByStep,
      buyers: welcomeBuyers,
      revenue: Math.round(welcomeRevenue),
      conversion_rate: welcomeByStep.step1 ? welcomeBuyers / welcomeByStep.step1 : 0,
    },
  });
}
