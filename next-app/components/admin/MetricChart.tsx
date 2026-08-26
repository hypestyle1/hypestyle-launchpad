'use client';

import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Granularity } from '@/lib/dashboard/periods';
import { fmtARS } from '@/lib/admin-format';

// Un único chart principal, potente. Monocromático: la serie usa `currentColor`
// (= el foreground del tema), así funciona en light y dark sin colores hardcodeados.
// La serie de comparación es la misma tinta, punteada y tenue.

export type MetricKey = 'profit' | 'revenue' | 'orders' | 'aov';

export interface ChartPoint {
  bucket: string;
  revenue: number; orders: number; profit: number; aov: number;
}

const METRIC_LABEL: Record<MetricKey, string> = {
  profit: 'Profit', revenue: 'Revenue', orders: 'Pedidos', aov: 'AOV',
};
const isMoney = (m: MetricKey) => m !== 'orders';

function labelBucket(bucket: string, g: Granularity): string {
  if (g === 'hour') {
    const hh = bucket.split('T')[1];
    return `${hh}:00`;
  }
  const [, mm, dd] = bucket.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(dd)} ${meses[Number(mm) - 1]}`;
}

function fmtValue(v: number, m: MetricKey): string {
  return isMoney(m) ? fmtARS(v) : String(Math.round(v));
}
function fmtAxis(v: number, m: MetricKey): string {
  if (!isMoney(m)) return String(Math.round(v));
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function MetricChart({
  data, previous, metric, granularity, loading, error,
}: {
  data: ChartPoint[];
  previous?: ChartPoint[] | null;
  metric: MetricKey;
  granularity: Granularity;
  loading?: boolean;
  error?: boolean;
}) {
  const rows = useMemo(() => {
    return data.map((p, i) => ({
      label: labelBucket(p.bucket, granularity),
      value: p[metric],
      prev: previous && previous[i] ? previous[i][metric] : undefined,
    }));
  }, [data, previous, metric, granularity]);

  if (loading) {
    return <div className="h-full w-full rounded-lg bg-muted/40 animate-pulse" />;
  }
  if (error) {
    return <div className="h-full w-full grid place-items-center text-[13px] text-destructive">No se pudo cargar el gráfico</div>;
  }
  const hasData = rows.some((r) => r.value > 0);
  if (!hasData) {
    return <div className="h-full w-full grid place-items-center text-[13px] text-muted-foreground">Sin datos en este período</div>;
  }

  return (
    <div className="h-full w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="hs-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis
            dataKey="label" tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            interval="preserveStartEnd" minTickGap={24}
          />
          <YAxis
            width={48} tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickFormatter={(v) => fmtAxis(v, metric)}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const cur = payload.find((p) => p.dataKey === 'value')?.value as number;
              const prev = payload.find((p) => p.dataKey === 'prev')?.value as number | undefined;
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg text-[12px]">
                  <p className="text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-semibold text-foreground tabular-nums">{METRIC_LABEL[metric]}: {fmtValue(cur ?? 0, metric)}</p>
                  {prev !== undefined && (
                    <p className="text-muted-foreground tabular-nums">Anterior: {fmtValue(prev, metric)}</p>
                  )}
                </div>
              );
            }}
          />
          {previous && (
            <Area type="monotone" dataKey="prev" stroke="currentColor" strokeOpacity={0.35}
              strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} isAnimationActive={false} />
          )}
          <Area type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2}
            fill="url(#hs-area)" dot={false} activeDot={{ r: 3, fill: 'currentColor' }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
