// Config del monitor de capacidad n8n. El límite mensual NO lo expone la API de
// n8n Cloud, así que es configurable por env (default 10.000). Los umbrales
// viven acá centralizados (no desperdigados). Se aplican sobre la utilización
// PROYECTADA a fin de mes, no sobre el consumo de hoy.

export const N8N_MONTHLY_LIMIT = Number(process.env.N8N_MONTHLY_LIMIT) || 10000;

export type CapacityStatus = 'healthy' | 'watch' | 'warning' | 'critical';

export const CAPACITY_THRESHOLDS: Record<Exclude<CapacityStatus, 'healthy'>, number> = {
  watch: 0.60,
  warning: 0.75,
  critical: 0.90,
};

export function statusFor(projectedPct: number): CapacityStatus {
  if (projectedPct >= CAPACITY_THRESHOLDS.critical) return 'critical';
  if (projectedPct >= CAPACITY_THRESHOLDS.warning) return 'warning';
  if (projectedPct >= CAPACITY_THRESHOLDS.watch) return 'watch';
  return 'healthy';
}
