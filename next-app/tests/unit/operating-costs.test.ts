import { describe, it, expect } from 'vitest';
import {
  costForRange, convertToARS, aggregateOperating, fxQualityFor,
  type OperatingCost, type Currency,
} from '@/lib/finance/operating-costs';
import { DEFAULT_OPERATING_COSTS } from '@/lib/finance/operating-costs-defaults';

const FX = { USD: 1000, EUR: 1200 }; // pesos por unidad, redondo para verificar

function cost(partial: Partial<OperatingCost>): OperatingCost {
  return {
    id: 'c', name: 'X', provider: 'P', category: 'infrastructure', costType: 'fixed',
    frequency: 'monthly', profitLevel: 'operating', source: 'configured', quality: 'configured',
    taxTreatment: 'economic_cost', active: true, periods: [], ...partial,
  } as OperatingCost;
}
const per = (amount: number | null, currency: Currency, validFrom: string, validTo: string | null = null) =>
  ({ id: 'p' + validFrom, amount, currency, validFrom, validTo });

describe('periodización — monthly', () => {
  const n8n = cost({ frequency: 'monthly', periods: [per(65, 'USD', '2026-08-01')] });

  it('mes completo (agosto, 31 días) = monto entero', () => {
    const r = costForRange(n8n, '2026-08-01', '2026-08-31');
    expect(r.byCurrency.USD).toBeCloseTo(65, 6);
    expect(convertToARS(r.byCurrency, FX)).toBeCloseTo(65000, 3);
  });

  it('mes parcial (7 días) = 65/31×7', () => {
    const r = costForRange(n8n, '2026-08-01', '2026-08-07');
    expect(r.byCurrency.USD).toBeCloseTo((65 / 31) * 7, 6);
  });

  it('un solo día = 65/31', () => {
    const r = costForRange(n8n, '2026-08-15', '2026-08-15');
    expect(r.byCurrency.USD).toBeCloseTo(65 / 31, 6);
  });
});

describe('periodización — annual / weekly / daily', () => {
  it('annual USD 365 en 1 día (año no bisiesto) = 1 USD', () => {
    const dom = cost({ frequency: 'annual', periods: [per(365, 'USD', '2026-01-01')] });
    const r = costForRange(dom, '2026-06-10', '2026-06-10');
    expect(r.byCurrency.USD).toBeCloseTo(1, 6);
  });
  it('weekly USD 7 en 1 día = 1 USD', () => {
    const w = cost({ frequency: 'weekly', periods: [per(7, 'USD', '2026-08-01')] });
    const r = costForRange(w, '2026-08-10', '2026-08-10');
    expect(r.byCurrency.USD).toBeCloseTo(1, 6);
  });
  it('daily USD 3 en 4 días = 12 USD', () => {
    const d = cost({ frequency: 'daily', periods: [per(3, 'USD', '2026-08-01')] });
    const r = costForRange(d, '2026-08-01', '2026-08-04');
    expect(r.byCurrency.USD).toBeCloseTo(12, 6);
  });
});

describe('usage / one-off', () => {
  it('usage observado mensual se reparte por día (aprox)', () => {
    const ant = cost({ frequency: 'usage', costType: 'variable', periods: [per(31, 'USD', '2026-08-01')] });
    const full = costForRange(ant, '2026-08-01', '2026-08-31');
    expect(full.byCurrency.USD).toBeCloseTo(31, 6);
    const oneDay = costForRange(ant, '2026-08-01', '2026-08-01');
    expect(oneDay.byCurrency.USD).toBeCloseTo(1, 6);
  });
  it('one-off se imputa sólo en su fecha', () => {
    const shoot = cost({ frequency: 'one_off', costType: 'one_off', periods: [per(500, 'USD', '2026-08-15')] });
    expect(costForRange(shoot, '2026-08-01', '2026-08-31').byCurrency.USD).toBe(500);
    expect(costForRange(shoot, '2026-08-16', '2026-08-31').byCurrency.USD).toBe(0);
    expect(costForRange(shoot, '2026-08-16', '2026-08-31').applied).toBe(false);
  });
});

describe('zero confirmado vs missing', () => {
  it('$0 confirmado = ars 0, NO missing', () => {
    const ups = cost({ periods: [per(0, 'USD', '2026-08-01')], quality: 'configured' });
    const r = costForRange(ups, '2026-08-01', '2026-08-31');
    expect(convertToARS(r.byCurrency, FX)).toBe(0);
    expect(r.hasMissing).toBe(false);
    expect(r.applied).toBe(true);
  });
  it('monto null = missing (no cuenta como 0 conocido)', () => {
    const brevo = cost({ periods: [per(null, 'USD', '2026-08-01')], quality: 'missing' });
    const r = costForRange(brevo, '2026-08-01', '2026-08-31');
    expect(r.hasMissing).toBe(true);
    expect(convertToARS(r.byCurrency, FX)).toBe(0);
  });
});

describe('vigencias', () => {
  const n8n = cost({
    frequency: 'monthly',
    periods: [per(65, 'USD', '2026-08-01', '2026-08-31'), per(75, 'USD', '2026-09-01')],
  });
  it('un cambio de precio NO reescribe el pasado: agosto usa 65', () => {
    expect(costForRange(n8n, '2026-08-01', '2026-08-31').byCurrency.USD).toBeCloseTo(65, 6);
  });
  it('septiembre usa 75', () => {
    expect(costForRange(n8n, '2026-09-01', '2026-09-30').byCurrency.USD).toBeCloseTo(75, 6);
  });
  it('rango que CRUZA dos vigencias suma cada tramo con su precio', () => {
    // Ago 28–31 (4 días @ 65/31) + Sep 1–3 (3 días @ 75/30)
    const r = costForRange(n8n, '2026-08-28', '2026-09-03');
    expect(r.byCurrency.USD).toBeCloseTo((65 / 31) * 4 + (75 / 30) * 3, 6);
  });
  it('validFrom futuro no aplica antes de tiempo', () => {
    const future = cost({ periods: [per(50, 'USD', '2027-01-01')] });
    expect(costForRange(future, '2026-08-01', '2026-08-31').applied).toBe(false);
  });
});

describe('FX multi-moneda', () => {
  it('USD → ARS', () => {
    expect(convertToARS({ ARS: 0, USD: 65, EUR: 0 }, FX)).toBe(65000);
  });
  it('EUR → ARS', () => {
    expect(convertToARS({ ARS: 0, USD: 0, EUR: 10 }, FX)).toBe(12000);
  });
  it('ARS se suma tal cual', () => {
    expect(convertToARS({ ARS: 5000, USD: 1, EUR: 0 }, FX)).toBe(6000);
  });
  it('nunca mezcla: USD y ARS conviven en byCurrency separados', () => {
    const mix = cost({ frequency: 'daily', periods: [per(1000, 'ARS', '2026-08-01')] });
    const r = costForRange(mix, '2026-08-01', '2026-08-02');
    expect(r.byCurrency.ARS).toBe(2000);
    expect(r.byCurrency.USD).toBe(0);
  });
  it('FX histórico se marca estimated; mes en curso configured', () => {
    const now = new Date('2026-08-27T12:00:00Z');
    expect(fxQualityFor('2026-08-31', now)).toBe('configured');
    expect(fxQualityFor('2026-06-30', now)).toBe('estimated');
  });
});

describe('inactivo', () => {
  it('un costo inactivo no suma', () => {
    const off = cost({ active: false, periods: [per(65, 'USD', '2026-08-01')] });
    expect(costForRange(off, '2026-08-01', '2026-08-31').applied).toBe(false);
    expect(convertToARS(costForRange(off, '2026-08-01', '2026-08-31').byCurrency, FX)).toBe(0);
  });
});

describe('agregación', () => {
  const costs: OperatingCost[] = [
    cost({ id: 'a', name: 'n8n', category: 'automation', costType: 'fixed', frequency: 'monthly', periods: [per(65, 'USD', '2026-08-01')], bot: true }),
    cost({ id: 'b', name: 'anthropic', category: 'ai', costType: 'variable', frequency: 'usage', quality: 'estimated', periods: [per(31, 'USD', '2026-08-01')], bot: true }),
    cost({ id: 'c', name: 'brevo', category: 'marketing_infra', costType: 'fixed', frequency: 'monthly', quality: 'missing', periods: [per(null, 'USD', '2026-08-01')] }),
  ];
  const s = aggregateOperating(costs, '2026-08-01', '2026-08-31', FX);

  it('total = fixed + variable, en ARS', () => {
    expect(s.totalARS).toBeCloseTo(65000 + 31000, 2);
    expect(s.fixedARS).toBeCloseTo(65000, 2);
    expect(s.variableARS).toBeCloseTo(31000, 2);
  });
  it('categorías suman y se ordenan por monto', () => {
    const total = s.byCategory.reduce((x, c) => x + c.ars, 0);
    expect(total).toBeCloseTo(s.totalARS, 2);
    expect(s.byCategory[0].ars).toBeGreaterThanOrEqual(s.byCategory[s.byCategory.length - 1].ars);
  });
  it('missing cuenta aparte (Brevo sin monto)', () => {
    expect(s.missingCount).toBe(1);
  });
  it('quality ponderada por $ (configured vs estimated)', () => {
    // 65000 configured, 31000 estimated → configured domina
    expect(s.quality.configured).toBeGreaterThan(s.quality.estimated);
  });
  it('bot split: fixed (n8n) vs usage (anthropic)', () => {
    expect(s.bot.fixedARS).toBeCloseTo(65000, 2);
    expect(s.bot.usageARS).toBeCloseTo(31000, 2);
    expect(s.bot.fixedPct).toBeCloseTo(65000 / 96000, 4);
    expect(s.bot.costPerMessageARS).toBeNull(); // sin denominador confiable en este PR
  });
});

describe('defaults', () => {
  it('n8n y Upstash confirmados; Brevo/Hostinger/Vercel/dominio missing', () => {
    const byId = Object.fromEntries(DEFAULT_OPERATING_COSTS.map((c) => [c.id, c]));
    expect(byId['oc_n8n'].periods[0].amount).toBe(65);
    expect(byId['oc_upstash'].periods[0].amount).toBe(0);
    expect(byId['oc_upstash'].quality).toBe('configured'); // cero confirmado, no missing
    for (const id of ['oc_brevo', 'oc_hostinger', 'oc_vercel', 'oc_dominio', 'oc_claude', 'oc_chatgpt']) {
      expect(byId[id].periods[0].amount).toBeNull();
      expect(byId[id].quality).toBe('missing');
    }
  });
  it('el bot lo componen n8n, Upstash, Anthropic y OpenAI', () => {
    const botIds = DEFAULT_OPERATING_COSTS.filter((c) => c.bot).map((c) => c.id).sort();
    expect(botIds).toEqual(['oc_anthropic', 'oc_n8n', 'oc_openai', 'oc_upstash']);
  });
});
