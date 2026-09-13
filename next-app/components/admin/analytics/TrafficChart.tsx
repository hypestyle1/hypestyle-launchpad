'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GaDaily } from '@/lib/ga4/reports';

// Serie diaria de tráfico. Mismo lenguaje que MetricChart (monocromático,
// currentColor, sin colores hardcodeados) pero con las métricas de GA: ese chart
// está tipado a las métricas financieras y no conviene abrirlo.

export type TrafficKey = 'sessions' | 'activeUsers' | 'purchases';
const LABEL: Record<TrafficKey, string> = { sessions: 'Sesiones', activeUsers: 'Usuarios', purchases: 'Compras (GA)' };

function labelDate(iso: string): string {
  const [, mm, dd] = iso.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(dd)} ${meses[Number(mm) - 1]}`;
}

export function TrafficChart({ data, metric, loading }: { data: GaDaily[]; metric: TrafficKey; loading?: boolean }) {
  const rows = useMemo(() => data.map((d) => ({ label: labelDate(d.date), value: d[metric] })), [data, metric]);
  if (loading) return <div className="h-full w-full rounded-lg bg-muted/40 animate-pulse" />;
  if (!rows.some((r) => r.value > 0)) return <div className="h-full w-full grid place-items-center text-[13px] text-muted-foreground">Sin datos en este período</div>;
  return (
    <div className="h-full w-full text-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="hs-traffic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis width={40} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(v) => String(Math.round(v))} />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0]?.value as number;
              return (
                <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg text-[12px]">
                  <p className="text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-semibold text-foreground tabular-nums">{LABEL[metric]}: {Math.round(v ?? 0).toLocaleString('es-AR')}</p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} fill="url(#hs-traffic)" dot={false} activeDot={{ r: 3, fill: 'currentColor' }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
