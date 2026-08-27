// Cruce Meta + Woo/Finance + Operating Costs → AdvertisingSummary. Todo con las
// definiciones centrales de metrics.ts. Mantiene SEPARADO platform / business /
// blended. No suma Meta attributed revenue con Woo revenue.

import type { MetaInsight } from './client';
import {
  effectiveAdCost, metaRoas, metaCpa, mer, blendedCac, adSpendPctRevenue,
  breakevenRoas, breakevenSignal, contributionAfterMarketing, camMargin,
  operatingProfitEstimated, type AdvertisingCostRule, type BreakevenSignal, type Quality,
} from './metrics';

export interface BusinessInputs {
  wooRevenue: number;       // Woo revenue económico (NO attributed)
  netRevenue: number;
  contributionProfit: number;
  newCustomers: number | null;
  operatingExpenses: number;
  operatingExpensesPartial: boolean; // hay CostItems MISSING
}

export interface CampaignRow extends MetaInsight {
  cpa: number | null;
  signal: BreakevenSignal;
}

export interface AdvertisingSummary {
  connected: boolean;
  account: { name: string; currency: string; timezone: string } | null;
  // 1. PLATFORM (fuente Meta)
  platform: {
    spend: number; impressions: number; reach: number; clicks: number;
    ctr: number; cpc: number; cpm: number; frequency: number;
    purchases: number; attributedValue: number; roas: number | null; cpa: number | null;
  };
  // Advertising cost model
  ad: {
    platformSpend: number; economicUplift: number; effective: number;
    spendQuality: Quality; upliftQuality: Quality; mixed: boolean;
  };
  // 2. BUSINESS (Woo/Finance) + 3. BLENDED
  business: {
    wooRevenue: number; netRevenue: number; contributionProfit: number; newCustomers: number | null;
    mer: number | null; blendedCac: number | null; adSpendPctRevenue: number | null;
    breakevenRoas: number | null;
    contributionAfterMarketing: number; camMargin: number | null;
    operatingExpenses: number; operatingProfitEstimated: number; operatingProfitPartial: boolean;
  };
  campaigns: CampaignRow[];
}

export function buildAdvertisingSummary(
  account: { name: string; currency: string; timezone: string } | null,
  accountRow: MetaInsight | null,
  campaigns: MetaInsight[],
  statuses: Map<string, string>,
  business: BusinessInputs,
  rules: AdvertisingCostRule[],
  endISO: string,
): AdvertisingSummary {
  const spend = accountRow?.spend ?? campaigns.reduce((s, c) => s + c.spend, 0);
  const attributedValue = accountRow?.purchaseValue ?? campaigns.reduce((s, c) => s + c.purchaseValue, 0);
  const purchases = accountRow?.purchases ?? campaigns.reduce((s, c) => s + c.purchases, 0);

  const ad = effectiveAdCost(spend, rules, endISO);
  const be = breakevenRoas(business.contributionProfit, business.netRevenue);
  const cam = contributionAfterMarketing(business.contributionProfit, ad.effective);

  const campaignRows: CampaignRow[] = campaigns
    .map((c) => {
      const roas = c.roas ?? metaRoas(c.purchaseValue, c.spend);
      return {
        ...c,
        status: c.campaignId ? (statuses.get(c.campaignId) || c.status) : c.status,
        roas,
        cpa: metaCpa(c.spend, c.purchases),
        signal: breakevenSignal(roas, be),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return {
    connected: !!account,
    account,
    platform: {
      spend, impressions: accountRow?.impressions ?? 0, reach: accountRow?.reach ?? 0, clicks: accountRow?.clicks ?? 0,
      ctr: accountRow?.ctr ?? 0, cpc: accountRow?.cpc ?? 0, cpm: accountRow?.cpm ?? 0, frequency: accountRow?.frequency ?? 0,
      purchases, attributedValue, roas: metaRoas(attributedValue, spend), cpa: metaCpa(spend, purchases),
    },
    ad: { platformSpend: ad.platformSpend, economicUplift: ad.economicUplift, effective: ad.effective, spendQuality: ad.spendQuality, upliftQuality: ad.upliftQuality, mixed: ad.mixed },
    business: {
      wooRevenue: business.wooRevenue, netRevenue: business.netRevenue, contributionProfit: business.contributionProfit, newCustomers: business.newCustomers,
      mer: mer(business.wooRevenue, ad.effective),
      blendedCac: business.newCustomers != null ? blendedCac(ad.effective, business.newCustomers) : null,
      adSpendPctRevenue: adSpendPctRevenue(ad.effective, business.wooRevenue),
      breakevenRoas: be,
      contributionAfterMarketing: cam, camMargin: camMargin(cam, business.netRevenue),
      operatingExpenses: business.operatingExpenses,
      operatingProfitEstimated: operatingProfitEstimated(cam, business.operatingExpenses),
      operatingProfitPartial: business.operatingExpensesPartial,
    },
    campaigns: campaignRows,
  };
}
