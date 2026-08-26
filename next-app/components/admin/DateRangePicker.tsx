'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { PRESETS, resolvePreset, type PresetId, type Range } from '@/lib/dashboard/periods';

// Selector de período global del panel. Resuelve el preset UNA vez (con periods.ts)
// y emite {range, presetId, compare}; todas las métricas y el chart usan ese mismo
// rango. Sin portal (se monta dentro de .admin-theme para heredar los tokens).

export interface RangeState {
  presetId: PresetId;
  range: Range;
  compare: boolean;
  custom?: { start: string; end: string };
}

export function makeRangeState(presetId: PresetId, compare: boolean, custom?: { start: string; end: string }): RangeState {
  return { presetId, compare, custom, range: resolvePreset(presetId, new Date(), custom) };
}

const LABEL: Record<PresetId, string> = Object.fromEntries(PRESETS.map((p) => [p.id, p.label])) as Record<PresetId, string>;

export function DateRangePicker({ value, onChange }: { value: RangeState; onChange: (s: RangeState) => void }) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.custom?.start || '');
  const [customEnd, setCustomEnd] = useState(value.custom?.end || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (id: PresetId) => {
    if (id === 'custom') return; // se aplica con el botón
    onChange(makeRangeState(id, value.compare));
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    onChange(makeRangeState('custom', value.compare, { start: customStart, end: customEnd }));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground hover:border-border-mid transition-colors"
      >
        <Calendar size={14} className="text-muted-foreground" />
        {value.presetId === 'custom' && value.custom
          ? `${value.custom.start} → ${value.custom.end}`
          : LABEL[value.presetId]}
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 bg-card border border-border rounded-lg shadow-lg z-30 p-1.5">
          {PRESETS.filter((p) => p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-[13px] text-foreground hover:bg-muted"
            >
              {p.label}
              {value.presetId === p.id && <Check size={14} className="text-foreground" />}
            </button>
          ))}

          <div className="border-t border-border mt-1.5 pt-2 px-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5">Personalizado</p>
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 min-w-0 h-8 px-2 rounded-md border border-border bg-card text-[12px] text-foreground" />
              <span className="text-muted-foreground text-[12px]">→</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 min-w-0 h-8 px-2 rounded-md border border-border bg-card text-[12px] text-foreground" />
            </div>
            <button onClick={applyCustom} disabled={!customStart || !customEnd}
              className="w-full mt-2 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold disabled:opacity-40">
              Aplicar
            </button>
          </div>

          <label className="flex items-center gap-2 border-t border-border mt-1.5 pt-2 px-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={value.compare}
              onChange={(e) => onChange({ ...value, compare: e.target.checked })}
              className="accent-current" />
            <span className="text-[13px] text-foreground">Comparar con período anterior</span>
          </label>
        </div>
      )}
    </div>
  );
}
