import { describe, it, expect } from 'vitest';
import { buildReportRequests, parseReports, fillDaily, isoDate, emptyTotals } from '@/lib/ga4/reports';

// Fixtures con la forma real de la Data API: rows[] con dimensionValues[] y
// metricValues[] como strings.
const row = (dims: string[], mets: (number | string)[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: mets.map((v) => ({ value: String(v) })),
});

describe('buildReportRequests', () => {
  const reqs = buildReportRequests('2026-08-15', '2026-09-11');
  it('arma 7 reportes con el mismo rango', () => {
    expect(reqs).toHaveLength(7);
    for (const r of reqs) expect(r.dateRanges).toEqual([{ startDate: '2026-08-15', endDate: '2026-09-11' }]);
  });
  it('el reporte de totales no supera las 10 métricas que permite la API', () => {
    expect((reqs[0].metrics as unknown[]).length).toBeLessThanOrEqual(10);
  });
  it('el embudo filtra sólo los 4 eventos de e-commerce', () => {
    const f: any = reqs[4].dimensionFilter;
    expect(f.filter.inListFilter.values).toEqual(['view_item', 'add_to_cart', 'begin_checkout', 'purchase']);
  });
  it('campañas trae utm_campaign y fuente/medio', () => {
    expect((reqs[3].dimensions as any[]).map((d) => d.name)).toEqual(['sessionCampaignName', 'sessionSourceMedium']);
  });
});

describe('parseReports', () => {
  const reports = [
    { rows: [row([], [4142, 900, 4689, 3818, 0.8142, 50.7, 46014, 2, 12, 290392.19])] },
    { rows: [row(['20260815'], [100, 90, 1]), row(['20260817'], [120, 100, 0])] },
    { rows: [row(['Paid Social'], [4130, 3554, 0.575, 1, 150201.68]), row(['Organic Search'], [1124, 680, 0.71, 7, 682062.95])] },
    { rows: [row(['cold-archive', 'ig / paid'], [4130, 3554, 0.575, 300, 80, 1, 150201.68]), row(['(organic)', 'google / organic'], [1124, 680, 0.71, 50, 20, 7, 682062.95])] },
    { rows: [row(['view_item'], [9000]), row(['add_to_cart'], [700]), row(['purchase'], [12]), row(['begin_checkout'], [200])] },
    { rows: [row(['/'], [2000, 0.6, 3]), row(['/producto/find-jesus'], [500, 0.8, 2])] },
    { rows: [row(['mobile'], [4000, 3500, 10]), row(['desktop'], [689, 642, 2])] },
  ];
  const r = parseReports(reports);

  it('totales en el orden de las métricas pedidas', () => {
    expect(r.totals.activeUsers).toBe(4142);
    expect(r.totals.sessions).toBe(4689);
    expect(r.totals.engagementRate).toBeCloseTo(0.8142);
    expect(r.totals.purchases).toBe(12);
    expect(r.totals.purchaseRevenue).toBeCloseTo(290392.19);
  });
  it('fechas YYYYMMDD → ISO', () => {
    expect(r.daily[0]).toEqual({ date: '2026-08-15', sessions: 100, activeUsers: 90, purchases: 1 });
    expect(isoDate('20260901')).toBe('2026-09-01');
    expect(isoDate('2026-09-01')).toBe('2026-09-01');
  });
  it('campañas con fuente/medio y métricas de e-commerce', () => {
    expect(r.campaigns[0]).toMatchObject({ campaign: 'cold-archive', sourceMedium: 'ig / paid', sessions: 4130, addToCarts: 300, checkouts: 80, purchases: 1 });
  });
  it('embudo por nombre de evento, sin depender del orden de las filas', () => {
    expect(r.funnel).toEqual({ viewItem: 9000, addToCart: 700, beginCheckout: 200, purchase: 12 });
  });
  it('canales, landings y dispositivos', () => {
    expect(r.channels.map((c) => c.channel)).toEqual(['Paid Social', 'Organic Search']);
    expect(r.landing[1].page).toBe('/producto/find-jesus');
    expect(r.devices[0]).toEqual({ device: 'mobile', sessions: 4000, activeUsers: 3500, purchases: 10 });
  });
  it('reportes vacíos (propiedad nueva, sin datos) no rompen', () => {
    const empty = parseReports([{}, {}, {}, {}, {}, {}, {}]);
    expect(empty.totals).toEqual(emptyTotals());
    expect(empty.funnel).toEqual({ viewItem: 0, addToCart: 0, beginCheckout: 0, purchase: 0 });
    expect(empty.campaigns).toEqual([]);
  });
});

describe('fillDaily', () => {
  it('rellena los días sin datos con ceros, en orden', () => {
    const out = fillDaily([{ date: '2026-09-02', sessions: 5, activeUsers: 4, purchases: 0 }], '2026-09-01', '2026-09-03');
    expect(out.map((d) => d.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(out[0].sessions).toBe(0);
    expect(out[1].sessions).toBe(5);
  });
  it('un solo día', () => {
    expect(fillDaily([], '2026-09-12', '2026-09-12')).toHaveLength(1);
  });
});
