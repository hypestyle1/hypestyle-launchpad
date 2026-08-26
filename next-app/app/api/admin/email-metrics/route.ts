import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const BREVO_KEY    = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_SECRET = process.env.WP_SECRET          || '';
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

// Cache por lista: la atribución de campañas pide los contactos de la lista a la
// que se envió cada una, y varias campañas comparten lista.
const cacheListas = new Map<number, any[]>();

async function fetchAllContacts(listId: number = NEWSLETTER_LIST_ID): Promise<any[]> {
  const cacheado = cacheListas.get(listId);
  if (cacheado) return cacheado;
  const limit = 500;
  let offset = 0;
  const all: any[] = [];
  for (;;) {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { 'api-key': BREVO_KEY }, cache: 'no-store' }
    );
    if (!res.ok) break;
    const data = await res.json();
    const page = data.contacts || [];
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  cacheListas.set(listId, all);
  return all;
}

/**
 * Campañas enviadas (newsletter). Son distintas de las automatizaciones: no
 * salen de nuestro código sino de Brevo, así que las estadísticas las tiene
 * Brevo y hay que pedírselas. Sin esto había que salir del panel para saber
 * cómo rindió un envío.
 */
async function fetchCampaigns(limit = 12): Promise<any[]> {
  const res = await fetch(
    `https://api.brevo.com/v3/emailCampaigns?limit=${limit}&offset=0&sort=desc&statistics=globalStats`,
    { headers: { "api-key": BREVO_KEY }, cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.campaigns || [])
    // Los borradores no tienen nada que mostrar y ensucian la lista.
    .filter((c: any) => ["sent", "in_process", "queued", "in_review"].includes(c.status))
    .map((c: any) => {
      const g = c.statistics?.globalStats || {};
      const entregados = g.delivered || 0;
      return {
        id: c.id,
        // A qué listas se envió: es lo que permite atribuirle compras después.
        listas: (c.recipients?.lists || []) as number[],
        nombre: c.name,
        asunto: c.subject,
        estado: c.status,
        fecha: c.sentDate || c.scheduledAt || null,
        enviados: g.sent || 0,
        entregados,
        rebotes: (g.hardBounces || 0) + (g.softBounces || 0),
        aperturas: g.uniqueViews || 0,
        clicks: g.uniqueClicks || 0,
        bajas: g.unsubscriptions || 0,
        quejas: g.complaints || 0,
        // Sobre entregados, no sobre enviados: es la tasa que mira Brevo y la
        // única comparable entre envíos con distinto nivel de rebote.
        tasa_apertura: entregados ? (g.uniqueViews || 0) / entregados : 0,
        tasa_click: entregados ? (g.uniqueClicks || 0) / entregados : 0,
      };
    });
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const days  = parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30;
  const after = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19);

  const [orders, contacts, campaigns] = await Promise.all([fetchAllOrders(after), fetchAllContacts(), fetchCampaigns()]);

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

  // ─── Compras atribuidas a cada campaña ─────────────────────────────────
  // Woo no guarda la UTM del pedido, así que no se puede seguir el click hasta
  // la compra. Lo que sí se puede: cruzar los destinatarios del envío contra los
  // pedidos pagos posteriores. La ventana es de 72h — pasado ese plazo la compra
  // ya no se explica por el mail, y contarla infla el número.
  //
  // Es atribución por contacto, no causalidad: alguien de la lista pudo comprar
  // por la pauta el mismo día. Sirve para comparar envíos entre sí, no para
  // sumarlo al ROAS de Meta (ahí estaría contando la misma venta dos veces).
  const VENTANA_MS = 72 * 3_600_000;
  for (const c of campaigns) {
    const fechaMs = c.fecha ? new Date(c.fecha).getTime() : 0;
    // Sin fecha, o enviada antes del período que se está mirando: no hay pedidos
    // cargados para cruzar, así que se devuelve null y la pantalla muestra "—"
    // en vez de un cero que se leería como "no vendió nada".
    if (!fechaMs || fechaMs < afterMs) { c.compras = null; c.plata = null; continue; }

    const destinatarios = new Set<string>();
    for (const listId of c.listas) {
      for (const contacto of await fetchAllContacts(listId)) {
        destinatarios.add((contacto.email || '').toLowerCase().trim());
      }
    }

    let compras = 0, plata = 0;
    for (const [email, pedidos] of paidOrdersByEmail) {
      if (!destinatarios.has(email)) continue;
      for (const o of pedidos) {
        const t = new Date(o.date_created).getTime();
        if (t >= fechaMs && t <= fechaMs + VENTANA_MS) { compras++; plata += parseFloat(o.total || '0'); }
      }
    }
    c.compras = compras;
    c.plata = Math.round(plata);
  }

  // ─── Salud de las automatizaciones ─────────────────────────────────────
  // Un cero en "enviados" es ambiguo: puede ser que no haya habido carritos que
  // recuperar, o que la secuencia esté apagada hace semanas. Sin esto había que
  // leer el código y las variables de Vercel para saber cuál de las dos.
  //
  // `activa` sale del mismo interruptor que mira el cron. `ultimo_envio` es el
  // último rastro real de la secuencia: el pedido más nuevo con `_hs_abandoned_step`
  // y el contacto más nuevo que ya pasó del paso 1 (el paso 1 lo escribe el alta,
  // no el cron, así que no sirve como señal de vida).
  const ultimoAbandonado = abandonedOrders
    .map(o => o.date_created).filter(Boolean).sort().pop() || null;
  const ultimaBienvenida = contacts
    .filter(c => (parseInt(String(c.attributes?.WELCOME_STEP ?? ''), 10) || 0) >= 2)
    .map(c => c.attributes?.SIGNUP_DATE).filter(Boolean).sort().pop() || null;

  // Candidatos esperando ahora mismo: pedidos sin pagar dentro de la ventana de
  // la secuencia. Si esto es alto y `ultimo_envio` es viejo, está rota.
  const enEspera = orders.filter(o => {
    if (!['pending', 'failed'].includes(o.status)) return false;
    if (!(o.billing?.email || '').trim()) return false;
    const horas = (Date.now() - new Date(o.date_created).getTime()) / 3_600_000;
    return horas >= 3 && horas <= 96;
  }).length;

  return NextResponse.json({
    period_days: days,
    campaigns,
    abandoned: {
      activa: process.env.ABANDONED_ENABLED === 'true',
      ultimo_envio: ultimoAbandonado,
      en_espera: enEspera,
      sent: abandonedByStep,
      recovered_orders: recoveredOrders,
      recovered_revenue: Math.round(recoveredRevenue),
      conversion_rate: abandonedByStep.step1 ? recoveredOrders / abandonedByStep.step1 : 0,
    },
    welcome: {
      activa: process.env.WELCOME_SEQUENCE_ENABLED === 'true',
      ultimo_envio: ultimaBienvenida,
      sent: welcomeByStep,
      buyers: welcomeBuyers,
      revenue: Math.round(welcomeRevenue),
      conversion_rate: welcomeByStep.step1 ? welcomeBuyers / welcomeByStep.step1 : 0,
    },
  });
}
