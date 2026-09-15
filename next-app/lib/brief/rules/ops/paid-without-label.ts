// Pedidos pagados que llevan más de N horas sin rótulo de Andreani.
// Plata cobrada y frenada: riesgo de reclamo y de "no me llegó".
//
// Quedan afuera los pedidos sin envío (canjes, retiros y cargas manuales a $0:
// nunca van a tener rótulo) y los de más de `labelMaxDays`, que no son una
// urgencia de hoy sino pedidos sin cerrar; esos se mencionan aparte.

import { arDayLabel, fmtAgo, fmtARS, hoursBetween, plural } from '../../format';
import type { ProcessingOrder } from '@/lib/orders-fulfillment';
import type { BriefRule, BriefSignal } from '../../types';

export function isShippable(o: ProcessingOrder): boolean {
  return o.total > 0 && o.shippingMethod !== '';
}

export const paidWithoutLabel: BriefRule = {
  id: 'ops.paid-without-label',
  domain: 'ops',
  requires: ['orders.processing'],
  evaluate(inputs, ctx): BriefSignal[] {
    const { labelHours, criticalLabelHours, labelMaxDays } = ctx.config.ops;
    const all = (inputs['orders.processing'] || [])
      .filter((o) => o.stage === 'sin_rotulo' && o.dateGmt && isShippable(o) && hoursBetween(o.dateGmt, ctx.now) >= labelHours)
      .sort((a, b) => a.dateGmt.localeCompare(b.dateGmt));
    const stale = all.filter((o) => hoursBetween(o.dateGmt, ctx.now) > labelMaxDays * 24);
    const stuck = all.filter((o) => hoursBetween(o.dateGmt, ctx.now) <= labelMaxDays * 24);
    if (!stuck.length) return [];

    const amount = Math.round(stuck.reduce((s, o) => s + o.total, 0));
    const oldest = stuck[0];
    const maxHours = hoursBetween(oldest.dateGmt, ctx.now);
    // Urgencia: 1 al cruzar el umbral, 2 cuando el más viejo lo triplica.
    const urgency = 1 + Math.min(1, (maxHours - labelHours) / (labelHours * 2));
    const n = stuck.length;
    const staleTxt = stale.length
      ? ` Además ${stale.length} ${plural(stale.length, 'pedido', 'pedidos')} de más de ${labelMaxDays} días sin cerrar (${stale.map((o) => `#${o.number}`).join(', ')}).`
      : '';

    return [{
      id: 'ops:paid-without-label:all',
      domain: 'ops',
      rule: this.id,
      situation: `${fmtARS(amount)} pagados llevan más de ${labelHours} h sin rótulo`,
      evidence: `${n} ${plural(n, 'pedido', 'pedidos')}, el más viejo del ${arDayLabel(oldest.dateGmt)} (#${oldest.number}, ${fmtAgo(maxHours)}).${staleTxt}`,
      action: 'Generar los rótulos hoy o avisar la demora a los clientes.',
      href: '/admin/pedidos?filter=por-empaquetar',
      hrefLabel: 'Ver pedidos',
      impact: { amount, currency: 'ARS', kind: 'retained' },
      urgency,
      confidence: 'exact',
      tone: maxHours >= criticalLabelHours ? 'critical' : 'warning',
      observedAt: ctx.now.toISOString(),
      sourceRefs: [
        ...stuck.map((o) => ({ type: 'order' as const, id: o.id, label: `#${o.number}` })),
        ...stale.map((o) => ({ type: 'order' as const, id: o.id, label: `#${o.number} (sin cerrar)` })),
      ],
      meta: { count: n, maxHours: Math.round(maxHours), labelHours, stale: stale.map((o) => o.number) },
    }];
  },
};
