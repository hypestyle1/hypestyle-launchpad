// Conjuntos activos de ventas que gastaron por encima del piso en los últimos
// N días completos y rinden bajo el breakeven ROAS (derivado del margen real
// de contribución de Woo, no de benchmarks). El impacto es lo que quemaría en
// `projectDays` si sigue al ritmo actual: es la plata en juego de la decisión
// de pausar. ROAS de Meta es atribuido, no venta de Woo: confianza "rule".
// Nunca ejecuta nada: propone pausar o bajar.

import { breakevenRoas } from '@/lib/meta/metrics';
import { fmtARS, fmtRatio } from '../../format';
import type { BriefRule, BriefSignal, SourceRef } from '../../types';

/** Objetivos de optimización que buscan compras. Lo demás (alcance, clics, interacción) no se juzga por ROAS. */
const SALES_GOALS = new Set(['OFFSITE_CONVERSIONS', 'VALUE', 'CONVERSIONS', '']);

export const adsetBelowBreakeven: BriefRule = {
  id: 'ads.adset-below-breakeven',
  domain: 'ads',
  requires: ['meta.adsets', 'sales.30d'],
  evaluate(inputs, ctx): BriefSignal[] {
    const ads = inputs['meta.adsets']!;
    const sales = inputs['sales.30d']!;
    const be = breakevenRoas(sales.contributionProfit, sales.netRevenue);
    if (be == null || !Number.isFinite(be) || be <= 0) return [];
    const { minSpendARS, projectDays } = ctx.config.ads;
    const days = Math.max(1, ads.days);
    const signals: BriefSignal[] = [];

    for (const row of ads.rows) {
      if (row.effectiveStatus && row.effectiveStatus !== 'ACTIVE') continue;
      if (!SALES_GOALS.has(row.optimizationGoal || '')) continue;
      if (row.spend < minSpendARS) continue;
      const roas = row.roas;
      if (roas != null && roas >= be) continue;

      const adsetId = String(row.adsetId || row.id || '');
      const name = row.adsetName || row.name || `conjunto ${adsetId}`;
      const daily = row.spend / days;
      const projected = Math.round(daily * projectDays);
      const gap = Math.min(1, Math.max(0, 1 - (roas ?? 0) / be));
      const noPurchases = row.purchases === 0;
      const sourceRefs: SourceRef[] = [{ type: 'adset', id: adsetId, label: name }];
      if (row.campaignId) sourceRefs.push({ type: 'campaign', id: row.campaignId, label: row.campaignName });

      signals.push({
        id: `ads:adset-below-breakeven:${adsetId}`,
        domain: 'ads',
        rule: this.id,
        situation: noPurchases
          ? `${name} gastó ${fmtARS(row.spend)} en ${days} días sin una compra`
          : `${name} gastó ${fmtARS(row.spend)} en ${days} días bajo el breakeven`,
        evidence: `ROAS ${fmtRatio(roas)} contra breakeven ${fmtRatio(be)} · ${row.purchases} compras atribuidas · ${fmtARS(Math.round(daily))}/día, ${fmtARS(projected)} en ${projectDays} días si sigue así${row.campaignName ? ` · ${row.campaignName}` : ''}.`,
        action: noPurchases
          ? 'Pausar el conjunto o cambiar el creativo: nadie compró en la ventana.'
          : 'Bajar el presupuesto del conjunto o revisar el creativo.',
        href: '/admin/ads',
        hrefLabel: 'Ver Ads',
        impact: { amount: projected, currency: 'ARS', kind: 'at_risk' },
        urgency: 1 + gap,
        confidence: 'rule',
        // Crítico saltea el piso: solo cuando gastó el triple del mínimo sin una compra.
        tone: noPurchases && row.spend >= minSpendARS * 3 ? 'critical' : 'warning',
        observedAt: ctx.now.toISOString(),
        entity: { type: 'adset', id: adsetId, label: name },
        sourceRefs,
        meta: { spend: row.spend, daily: Math.round(daily), projected, roas, breakeven: be, purchases: row.purchases, since: ads.since, until: ads.until, effectiveStatus: row.effectiveStatus, optimizationGoal: row.optimizationGoal },
      });
    }
    return signals;
  },
};
