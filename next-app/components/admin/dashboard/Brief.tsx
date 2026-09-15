'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { BriefResponse, ScoredSignal, BriefDomain } from '@/lib/brief/types';

// Sección "Hoy": máximo 5 decisiones con plata adelante. Renderiza cualquier
// señal igual, sin saber de qué dominio viene. Cuando no hay nada, una línea.

const DOMAIN_LABEL: Record<BriefDomain, string> = {
  ops: 'Pedidos', stock: 'Stock', ads: 'Meta', finance: 'Finanzas', customers: 'Clientes', content: 'Contenido', system: 'Sistema',
};

const TONE_BAR: Record<ScoredSignal['tone'], string> = {
  critical: 'bg-destructive',
  warning: 'bg-warning',
  opportunity: 'bg-success',
  info: 'bg-muted-foreground/40',
};

function todayLabel(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}

function SignalLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  const cls = primary
    ? 'inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:underline whitespace-nowrap'
    : 'inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground hover:underline whitespace-nowrap';
  if (href.startsWith('/')) return <Link href={href} className={cls}>{label}<ArrowUpRight size={13} /></Link>;
  return <a href={href} target="_blank" rel="noreferrer" className={cls}>{label}<ArrowUpRight size={13} /></a>;
}

function SignalRow({ s }: { s: ScoredSignal }) {
  return (
    <li className="flex gap-3 px-4 py-3 bg-card border border-border rounded-lg">
      <span className={`w-1 self-stretch rounded-full shrink-0 ${TONE_BAR[s.tone]}`} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground leading-snug">{s.situation}</p>
          <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">{s.evidence}</p>
          <p className="text-[12.5px] text-foreground/90 mt-1 leading-snug"><span className="text-muted-foreground">Acción:</span> {s.action}</p>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 shrink-0">
          <SignalLink href={s.href} label={s.hrefLabel} primary />
          {(s.links || []).map((l) => <SignalLink key={l.href} href={l.href} label={l.label} />)}
        </div>
      </div>
    </li>
  );
}

export function Brief({ data, state }: { data: BriefResponse | null; state: 'loading' | 'ok' | 'error' }) {
  const items = data?.items || [];
  const n = items.length;
  const degradedDomains = [...new Set((data?.degraded || []).map((d) => d.domain))];

  return (
    <section className="mb-8" aria-label="Hoy">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">
          Hoy, {todayLabel(data?.generatedAt || new Date().toISOString())}
        </h2>
        <p className="text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
          {state === 'ok' && data && (
            <span>{n === 0 ? 'sin decisiones pendientes' : `${n} ${n === 1 ? 'decisión' : 'decisiones'}`} · actualizado {timeLabel(data.generatedAt)}</span>
          )}
          {degradedDomains.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" title={(data?.degraded || []).filter((x) => x.domain === d).map((x) => x.reason).join(' · ')}>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              {DOMAIN_LABEL[d]} sin datos
            </span>
          ))}
        </p>
      </div>

      {state === 'loading' && (
        <div className="grid gap-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[76px] bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
      )}

      {state === 'error' && (
        <p className="text-[13px] text-muted-foreground bg-card border border-border rounded-lg px-4 py-3">
          No pudimos armar el brief. El resto del panel sigue funcionando.
        </p>
      )}

      {state === 'ok' && n === 0 && (
        <p className="text-[13px] text-muted-foreground bg-card border border-border rounded-lg px-4 py-3">
          Nada urgente hoy. Todo dentro de lo normal.
        </p>
      )}

      {state === 'ok' && n > 0 && (
        <ul className="grid gap-2">
          {items.map((s) => <SignalRow key={s.id} s={s} />)}
        </ul>
      )}
    </section>
  );
}
