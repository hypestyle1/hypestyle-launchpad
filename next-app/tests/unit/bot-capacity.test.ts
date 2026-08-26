import { describe, it, expect } from 'vitest';
import { computeCapacity, type ExecLite } from '@/lib/bot/capacity';
import { statusFor } from '@/lib/bot/config';

// Agosto 2026 (31 días) en hora AR (UTC−3).
const MONTH_START = Date.parse('2026-08-01T03:00:00.000Z');
const MONTH_END = Date.parse('2026-09-01T03:00:00.000Z');
const DAY = 24 * 3600_000;

// Genera `n` ejecuciones distribuidas uniformemente entre el inicio de mes y `nowMs`.
function execs(n: number, nowMs: number, opts: { wf?: string; status?: string } = {}): ExecLite[] {
  const span = Math.max(1, nowMs - MONTH_START);
  return Array.from({ length: n }, (_, i) => ({
    workflowId: opts.wf || 'wf-main',
    status: opts.status || 'success',
    startedAtMs: MONTH_START + Math.floor((i / n) * span),
  }));
}

const base = (executions: ExecLite[], nowMs: number, limit = 10000, names?: Map<string, string>) =>
  computeCapacity({ executions, monthStartMs: MONTH_START, monthEndMs: MONTH_END, nowMs, monthlyLimit: limit, workflowNames: names });

describe('capacity — métricas básicas', () => {
  it('usage %, remaining y días', () => {
    const now = MONTH_START + 10 * DAY; // día 11 aprox
    const r = base(execs(4150, now), now);
    expect(r.used).toBe(4150);
    expect(r.remaining).toBe(5850);
    expect(r.usagePct).toBeCloseTo(0.415, 3);
    expect(r.daysInMonth).toBe(31);
  });

  it('avg daily = used / días transcurridos', () => {
    const now = MONTH_START + 10 * DAY; // ~11 días
    const r = base(execs(1100, now), now);
    expect(r.avgDaily).toBeCloseTo(1100 / r.elapsedDays, 1);
  });
});

describe('capacity — proyección (lo importante)', () => {
  it('mismo consumo, distinta conclusión según el día del mes', () => {
    // 4.150 al día ~8 → proyecta agotar; al día ~25 → sano.
    const early = MONTH_START + 7 * DAY;   // día 8
    const late = MONTH_START + 24 * DAY;   // día 25
    const rEarly = base(execs(4150, early), early);
    const rLate = base(execs(4150, late), late);
    expect(rEarly.projectedMonthEnd).toBeGreaterThan(rLate.projectedMonthEnd);
    expect(rEarly.projectedPct).toBeGreaterThan(rLate.projectedPct);
  });

  it('projected month-end = (used/elapsed) × díasDelMes, con precisión completa', () => {
    const now = MONTH_START + 9 * DAY; // día 10 → 9 días transcurridos
    const r = base(execs(3000, now), now);
    // proyecta con avgDaily de precisión completa (3000/9 × 31), no con el redondeado.
    expect(r.projectedMonthEnd).toBe(Math.round((3000 / r.elapsedDays) * 31));
    expect(r.projectedMonthEnd).toBeGreaterThan(10000);
  });
});

describe('capacity — status por proyección', () => {
  it('umbrales sobre projectedPct', () => {
    expect(statusFor(0.4)).toBe('healthy');
    expect(statusFor(0.65)).toBe('watch');
    expect(statusFor(0.8)).toBe('warning');
    expect(statusFor(0.95)).toBe('critical');
  });
  it('el baseline actual (~42%, mes completo) es healthy', () => {
    const now = MONTH_END - DAY; // casi fin de mes
    const r = base(execs(4150, now), now);
    expect(r.status).toBe('healthy');
  });
});

describe('capacity — exhaustion date', () => {
  it('sin riesgo proyectado → null', () => {
    const now = MONTH_START + 20 * DAY;
    const r = base(execs(4000, now), now);
    expect(r.exhaustionDate).toBeNull();
  });
  it('con riesgo → fecha dentro del mes', () => {
    const now = MONTH_START + 5 * DAY; // día 6, ritmo alto
    const r = base(execs(3000, now), now); // ~500/día → proyecta ~15.500
    expect(r.projectedMonthEnd).toBeGreaterThan(10000);
    expect(r.exhaustionDate).not.toBeNull();
    expect(Date.parse(r.exhaustionDate!)).toBeLessThan(MONTH_END);
  });
});

describe('capacity — edge cases', () => {
  it('cero ejecuciones → sin NaN, healthy', () => {
    const now = MONTH_START + 10 * DAY;
    const r = base([], now);
    expect(r.used).toBe(0);
    expect(r.avgDaily).toBe(0);
    expect(r.projectedMonthEnd).toBe(0);
    expect(r.status).toBe('healthy');
    expect(r.exhaustionDate).toBeNull();
  });
  it('used > limit → remaining negativo, critical', () => {
    const now = MONTH_START + 20 * DAY;
    const r = base(execs(11000, now), now);
    expect(r.remaining).toBe(-1000);
    expect(r.status).toBe('critical');
  });
  it('primer día del mes no explota (elapsedDays ≥ 1)', () => {
    const now = MONTH_START + 3 * 3600_000; // 3 h de mes
    const r = base(execs(200, now), now);
    expect(r.elapsedDays).toBe(1);
    expect(Number.isFinite(r.avgDaily)).toBe(true);
    expect(Number.isFinite(r.projectedMonthEnd)).toBe(true);
  });
  it('último día del mes: daysRemaining 0', () => {
    const now = MONTH_END - 2 * 3600_000;
    const r = base(execs(9000, now), now);
    expect(r.daysRemaining).toBe(0);
  });
});

describe('capacity — breakdown por workflow y failures', () => {
  it('agrupa por workflow, ordena desc, cuenta fallos', () => {
    const now = MONTH_START + 10 * DAY;
    const names = new Map([['wf-main', 'Bot principal'], ['wf-proc', 'Procesar mensaje']]);
    const list = [
      ...execs(300, now, { wf: 'wf-main' }),
      ...execs(100, now, { wf: 'wf-proc' }),
      ...execs(5, now, { wf: 'wf-main', status: 'error' }),
    ];
    const r = base(list, now, 10000, names);
    expect(r.workflows[0].name).toBe('Bot principal');
    expect(r.workflows[0].executions).toBe(305);
    expect(r.failed).toBe(5);
    expect(r.successful).toBe(400);
    expect(r.failureRate).toBeCloseTo(5 / 405, 4);
    expect(r.workflows[0].pct).toBeCloseTo(305 / 405, 4);
  });
});
