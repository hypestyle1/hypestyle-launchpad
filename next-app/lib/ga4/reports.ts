// Reportes de GA4 — definición de los requests y parseo de las respuestas.
// Todo PURO (sin red): se testea con fixtures de la API. El cliente (client.ts)
// sólo transporta.
//
// Qué mide cada cosa y qué NO:
//   - Sesiones/usuarios/interacción: tráfico real del sitio, es la fortaleza de GA.
//   - Compras y revenue de GA: el evento `purchase` sólo dispara en /confirmacion
//     con pago aprobado y se pierde en la vuelta desde MercadoPago y con el
//     consentimiento de cookies. SUB-REPORTA fuerte. Sirve para comparar canales
//     entre sí, nunca como revenue del negocio (eso es Woo).

export interface GaTotals {
  activeUsers: number; newUsers: number; sessions: number; engagedSessions: number;
  engagementRate: number;            // 0..1
  avgSessionSeconds: number;
  pageViews: number;
  keyEvents: number;
  purchases: number; purchaseRevenue: number;
}
export interface GaDaily { date: string; sessions: number; activeUsers: number; purchases: number }
export interface GaChannel { channel: string; sessions: number; activeUsers: number; engagementRate: number; purchases: number; purchaseRevenue: number }
export interface GaCampaign {
  campaign: string; sourceMedium: string;
  sessions: number; activeUsers: number; engagementRate: number;
  addToCarts: number; checkouts: number; purchases: number; purchaseRevenue: number;
}
export interface GaFunnel { viewItem: number; addToCart: number; beginCheckout: number; purchase: number }
export interface GaLanding { page: string; sessions: number; engagementRate: number; purchases: number }
export interface GaDevice { device: string; sessions: number; activeUsers: number; purchases: number }

export interface GaReport {
  totals: GaTotals;
  daily: GaDaily[];
  channels: GaChannel[];
  campaigns: GaCampaign[];
  funnel: GaFunnel;
  landing: GaLanding[];
  devices: GaDevice[];
}

const FUNNEL_EVENTS = ['view_item', 'add_to_cart', 'begin_checkout', 'purchase'] as const;

const dims = (...names: string[]) => names.map((name) => ({ name }));
const mets = (...names: string[]) => names.map((name) => ({ name }));

/**
 * Los 7 reportes del resumen, en el orden que espera `parseReports`. GA4 acepta
 * hasta 5 por batch: el cliente los parte solo. `since`/`until` en YYYY-MM-DD
 * (la propiedad está en hora argentina, igual que la cuenta de Meta).
 */
export function buildReportRequests(since: string, until: string): Record<string, unknown>[] {
  const dateRanges = [{ startDate: since, endDate: until }];
  return [
    { dateRanges, metrics: mets('activeUsers', 'newUsers', 'sessions', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'screenPageViews', 'keyEvents', 'ecommercePurchases', 'purchaseRevenue') },
    { dateRanges, dimensions: dims('date'), metrics: mets('sessions', 'activeUsers', 'ecommercePurchases'), orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
    { dateRanges, dimensions: dims('sessionDefaultChannelGroup'), metrics: mets('sessions', 'activeUsers', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 20 },
    { dateRanges, dimensions: dims('sessionCampaignName', 'sessionSourceMedium'), metrics: mets('sessions', 'activeUsers', 'engagementRate', 'addToCarts', 'checkouts', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 150 },
    { dateRanges, dimensions: dims('eventName'), metrics: mets('eventCount'), dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: [...FUNNEL_EVENTS] } } } },
    { dateRanges, dimensions: dims('landingPage'), metrics: mets('sessions', 'engagementRate', 'ecommercePurchases'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 15 },
    { dateRanges, dimensions: dims('deviceCategory'), metrics: mets('sessions', 'activeUsers', 'ecommercePurchases'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5 },
  ];
}

/* ─── Parseo ─────────────────────────────────────────────────────────────── */

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const rows = (report: any): Row[] => (Array.isArray(report?.rows) ? report.rows : []);
const dim = (r: Row, i: number) => r.dimensionValues?.[i]?.value ?? '';
const met = (r: Row, i: number) => num(r.metricValues?.[i]?.value);

/** GA devuelve `date` como YYYYMMDD; se normaliza a YYYY-MM-DD. */
export function isoDate(yyyymmdd: string): string {
  return /^\d{8}$/.test(yyyymmdd) ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}` : yyyymmdd;
}

export function emptyTotals(): GaTotals {
  return { activeUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0, engagementRate: 0, avgSessionSeconds: 0, pageViews: 0, keyEvents: 0, purchases: 0, purchaseRevenue: 0 };
}

export function parseReports(reports: any[]): GaReport {
  const [tot, daily, channels, campaigns, funnel, landing, devices] = reports;

  const t = rows(tot)[0];
  const totals: GaTotals = t ? {
    activeUsers: met(t, 0), newUsers: met(t, 1), sessions: met(t, 2), engagedSessions: met(t, 3),
    engagementRate: met(t, 4), avgSessionSeconds: met(t, 5), pageViews: met(t, 6), keyEvents: met(t, 7),
    purchases: met(t, 8), purchaseRevenue: met(t, 9),
  } : emptyTotals();

  const funnelCounts: Record<string, number> = {};
  for (const r of rows(funnel)) funnelCounts[dim(r, 0)] = met(r, 0);

  return {
    totals,
    daily: rows(daily).map((r) => ({ date: isoDate(dim(r, 0)), sessions: met(r, 0), activeUsers: met(r, 1), purchases: met(r, 2) })),
    channels: rows(channels).map((r) => ({ channel: dim(r, 0), sessions: met(r, 0), activeUsers: met(r, 1), engagementRate: met(r, 2), purchases: met(r, 3), purchaseRevenue: met(r, 4) })),
    campaigns: rows(campaigns).map((r) => ({
      campaign: dim(r, 0), sourceMedium: dim(r, 1),
      sessions: met(r, 0), activeUsers: met(r, 1), engagementRate: met(r, 2),
      addToCarts: met(r, 3), checkouts: met(r, 4), purchases: met(r, 5), purchaseRevenue: met(r, 6),
    })),
    funnel: {
      viewItem: funnelCounts.view_item || 0, addToCart: funnelCounts.add_to_cart || 0,
      beginCheckout: funnelCounts.begin_checkout || 0, purchase: funnelCounts.purchase || 0,
    },
    landing: rows(landing).map((r) => ({ page: dim(r, 0), sessions: met(r, 0), engagementRate: met(r, 1), purchases: met(r, 2) })),
    devices: rows(devices).map((r) => ({ device: dim(r, 0), sessions: met(r, 0), activeUsers: met(r, 1), purchases: met(r, 2) })),
  };
}

/**
 * Serie diaria completa para el rango: GA omite los días sin datos, y un
 * sparkline con huecos miente. `since`/`until` inclusivos, YYYY-MM-DD.
 */
export function fillDaily(daily: GaDaily[], since: string, until: string): GaDaily[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const out: GaDaily[] = [];
  const cur = new Date(`${since}T00:00:00Z`);
  const end = new Date(`${until}T00:00:00Z`);
  for (let i = 0; cur <= end && i < 400; i++, cur.setUTCDate(cur.getUTCDate() + 1)) {
    const key = cur.toISOString().slice(0, 10);
    out.push(byDate.get(key) || { date: key, sessions: 0, activeUsers: 0, purchases: 0 });
  }
  return out;
}
