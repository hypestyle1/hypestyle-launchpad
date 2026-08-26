// Motor de capacidad n8n (puro, testeable). Convierte la lista de ejecuciones del
// mes en las métricas de capacidad. La prioridad es la PROYECCIÓN a fin de mes,
// no el consumo actual: 42% al día 8 es peligroso; 42% al día 25 es sano.
//
// Separa siempre n8n executions de AI messages de tokens: acá sólo se cuentan
// executions (una ejecución puede venir de un ack de WhatsApp con 0 tokens).

import { N8N_MONTHLY_LIMIT, statusFor, type CapacityStatus } from './config';

export interface ExecLite {
  workflowId: string;
  status: string;        // success | error | crashed | running | waiting | ...
  startedAtMs: number;   // instante de inicio (ms)
}

export interface CapacityInput {
  executions: ExecLite[];
  monthStartMs: number;
  monthEndMs: number;      // fin exclusivo (00:00 del 1° del mes siguiente)
  nowMs: number;
  monthlyLimit?: number;
  workflowNames?: Map<string, string>;
}

export interface WorkflowRow {
  id: string; name: string; executions: number; pct: number; failed: number; successful: number;
}

export interface CapacityResult {
  used: number;
  limit: number;
  remaining: number;
  usagePct: number;
  elapsedDays: number;
  daysInMonth: number;
  daysRemaining: number;
  avgDaily: number;
  trailing7Avg: number;
  projectedMonthEnd: number;
  projectedPct: number;
  remainingProjected: number;   // limit − projected (puede ser negativo)
  exhaustionDate: string | null; // ISO, o null si no hay riesgo proyectado
  status: CapacityStatus;
  workflows: WorkflowRow[];
  failed: number;
  successful: number;
  failureRate: number;
  lastSuccessAtMs: number | null;
  lastFailedAtMs: number | null;
}

const DAY = 24 * 3600_000;
const isFailed = (s: string) => s === 'error' || s === 'crashed';
const isSuccess = (s: string) => s === 'success';

export function computeCapacity(input: CapacityInput): CapacityResult {
  const limit = input.monthlyLimit ?? N8N_MONTHLY_LIMIT;
  const inMonth = input.executions.filter((e) => e.startedAtMs >= input.monthStartMs && e.startedAtMs < input.monthEndMs);
  const used = inMonth.length;

  const daysInMonth = Math.round((input.monthEndMs - input.monthStartMs) / DAY);
  // Días transcurridos (al menos 1, tope daysInMonth).
  const elapsedRaw = (input.nowMs - input.monthStartMs) / DAY;
  const elapsedDays = Math.min(daysInMonth, Math.max(1, Math.ceil(elapsedRaw)));
  const daysRemaining = Math.max(0, daysInMonth - elapsedDays);

  const avgDaily = used / elapsedDays;

  // Promedio de los últimos 7 días (indicador secundario, más robusto a anomalías).
  const since7 = input.nowMs - 7 * DAY;
  const last7 = inMonth.filter((e) => e.startedAtMs >= since7).length;
  const window7 = Math.min(7, elapsedDays);
  const trailing7Avg = window7 > 0 ? last7 / window7 : 0;

  const projectedMonthEnd = Math.round(avgDaily * daysInMonth);
  const projectedPct = limit > 0 ? projectedMonthEnd / limit : 0;
  const remaining = limit - used;
  const remainingProjected = limit - projectedMonthEnd;

  // Fecha estimada de agotamiento: sólo si la proyección supera el límite.
  let exhaustionDate: string | null = null;
  if (projectedMonthEnd > limit && avgDaily > 0 && remaining > 0) {
    const daysToExhaust = remaining / avgDaily;
    exhaustionDate = new Date(input.nowMs + daysToExhaust * DAY).toISOString();
  }

  // Breakdown por workflow.
  const byWf = new Map<string, { executions: number; failed: number; successful: number }>();
  let failed = 0, successful = 0, lastSuccessAtMs: number | null = null, lastFailedAtMs: number | null = null;
  for (const e of inMonth) {
    const w = byWf.get(e.workflowId) || { executions: 0, failed: 0, successful: 0 };
    w.executions += 1;
    if (isFailed(e.status)) { w.failed += 1; failed += 1; if (!lastFailedAtMs || e.startedAtMs > lastFailedAtMs) lastFailedAtMs = e.startedAtMs; }
    if (isSuccess(e.status)) { w.successful += 1; successful += 1; if (!lastSuccessAtMs || e.startedAtMs > lastSuccessAtMs) lastSuccessAtMs = e.startedAtMs; }
    byWf.set(e.workflowId, w);
  }
  const workflows: WorkflowRow[] = [...byWf.entries()].map(([id, w]) => ({
    id,
    name: input.workflowNames?.get(id) || id,
    executions: w.executions,
    pct: used > 0 ? w.executions / used : 0,
    failed: w.failed,
    successful: w.successful,
  })).sort((a, b) => b.executions - a.executions);

  return {
    used, limit, remaining, usagePct: limit > 0 ? used / limit : 0,
    elapsedDays, daysInMonth, daysRemaining,
    avgDaily: Math.round(avgDaily * 10) / 10,
    trailing7Avg: Math.round(trailing7Avg * 10) / 10,
    projectedMonthEnd, projectedPct, remainingProjected,
    exhaustionDate,
    status: statusFor(projectedPct),
    workflows,
    failed, successful,
    failureRate: used > 0 ? failed / used : 0,
    lastSuccessAtMs, lastFailedAtMs,
  };
}
