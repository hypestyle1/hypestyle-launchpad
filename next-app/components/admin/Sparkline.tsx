'use client';

import { useId } from 'react';

// Sparkline compacto en SVG puro (sin librería). Serie real, mismo DateRange.
// No decorativo: muestra la evolución del período. Endpoint da la serie agregada
// server-side (nunca 1 request por sparkline).

export function Sparkline({ data, width = 96, height = 26, tone = 'default' }: {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const id = useId();
  const pts = (data || []).filter((n) => Number.isFinite(n));
  if (pts.length < 2) return <div style={{ width, height }} aria-hidden />;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const coords = pts.map((v, i) => [i * stepX, y(v)] as const);
  const line = coords.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const stroke = tone === 'positive' ? 'hsl(var(--success))' : tone === 'negative' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))';
  const [lx, ly] = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={lx} cy={ly} r="1.8" fill={stroke} />
    </svg>
  );
}
