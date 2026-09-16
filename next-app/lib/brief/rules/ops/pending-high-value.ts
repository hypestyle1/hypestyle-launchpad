// Pedidos sin pagar de valor alto y recientes: todavía se pueden recuperar con
// un mensaje. Woo mezcla carritos abandonados con gente que va a pagar, por
// eso la confianza es "rule" y la ventana es corta.

import { waLink } from '@/lib/admin-format';
import { fmtAgo, fmtARS, hoursBetween, plural } from '../../format';
import type { BriefRule, BriefSignal } from '../../types';

export function pendingWhatsAppText(firstName: string, orderNumber: string): string {
  const saludo = firstName ? `Hola ${firstName}` : 'Hola';
  return `${saludo}, te escribimos de Hype por tu pedido #${orderNumber}. ¿Necesitás una mano para completar el pago?`;
}

export const pendingHighValue: BriefRule = {
  id: 'ops.pending-high-value',
  domain: 'ops',
  requires: ['orders.pending'],
  evaluate(inputs, ctx): BriefSignal[] {
    const { pendingMinARS, pendingMaxHours, pendingMinMinutes } = ctx.config.ops;
    const candidates = (inputs['orders.pending'] || [])
      .filter((o) => {
        if (!o.dateGmt || o.total < pendingMinARS) return false;
        const h = hoursBetween(o.dateGmt, ctx.now);
        return h >= pendingMinMinutes / 60 && h < pendingMaxHours;
      })
      .sort((a, b) => b.total - a.total);
    if (!candidates.length) return [];

    const amount = Math.round(candidates.reduce((s, o) => s + o.total, 0));
    const top = candidates[0];
    const topHours = hoursBetween(top.dateGmt, ctx.now);
    const recentShare = candidates.filter((o) => hoursBetween(o.dateGmt, ctx.now) < 24).length / candidates.length;
    const firstName = top.customerName.split(' ')[0] || '';
    const n = candidates.length;

    const links = top.phone
      ? [{ label: `WhatsApp a ${firstName || 'cliente'}`, href: waLink(top.phone, pendingWhatsAppText(firstName, top.number)) }]
      : [];

    return [{
      id: 'ops:pending-high-value:all',
      domain: 'ops',
      rule: this.id,
      situation: `${fmtARS(amount)} en ${n} ${plural(n, 'pedido sin pagar', 'pedidos sin pagar')} de las últimas ${pendingMaxHours} h`,
      evidence: `El mayor ${fmtARS(top.total)} (#${top.number}, ${fmtAgo(topHours)}, ${top.paymentTitle || 'sin método'}).`,
      action: firstName
        ? `Escribirle a ${firstName} por WhatsApp y confirmar si necesita ayuda para pagar.`
        : 'Contactar al cliente del pedido mayor y confirmar si necesita ayuda para pagar.',
      href: '/admin/pedidos?filter=sin-pagar',
      hrefLabel: 'Ver pedidos',
      links,
      impact: { amount, currency: 'ARS', kind: 'recoverable' },
      urgency: 1 + recentShare,
      confidence: 'rule',
      tone: 'opportunity',
      observedAt: ctx.now.toISOString(),
      sourceRefs: candidates.map((o) => ({ type: 'order' as const, id: o.id, label: `#${o.number}` })),
      meta: { count: n, topOrder: top.number, topTotal: top.total, recentShare },
    }];
  },
};
