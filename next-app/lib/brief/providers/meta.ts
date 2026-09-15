// Conjuntos de anuncios de Meta en los últimos N días completos (hoy queda
// afuera: Meta lo reporta parcial). Reusa el cliente read-only existente; el
// token nunca sale del servidor. Si Meta no está configurado, el provider
// falla y el dominio queda degradado sin romper el brief.

import { fetchInsights, fetchAdsetStatuses, metaConfigured } from '@/lib/meta/client';
import { arDateKey } from '../format';
import type { AdsetRow, BriefProvider } from '../types';

export const metaAdsetsProvider: BriefProvider<'meta.adsets'> = {
  key: 'meta.adsets',
  domain: 'ads',
  async load(ctx) {
    if (!metaConfigured()) throw new Error('Meta no configurado');
    const days = ctx.config.ads.days;
    const nowMs = ctx.now.getTime();
    const until = arDateKey(nowMs - 86_400_000);
    const since = arDateKey(nowMs - days * 86_400_000);
    const [rows, statuses] = await Promise.all([fetchInsights('adset', since, until), fetchAdsetStatuses()]);
    const enriched: AdsetRow[] = rows.map((r) => {
      const st = statuses.get(String(r.adsetId || r.id || ''));
      return { ...r, effectiveStatus: st?.status || '', optimizationGoal: st?.goal || '' };
    });
    return { since, until, days, rows: enriched };
  },
};
