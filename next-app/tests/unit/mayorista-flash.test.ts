import { describe, it, expect } from 'vitest';
import { FLASH_CYBER_CAMPAIGN_ID, paymentWindowFor, paymentDeadline, fmtDeadlineAR } from '@/lib/mayorista-flash';
import { applyCampaign, arDate, type WholesaleCampaign } from '@/lib/wholesale-campaigns';
import type { PricingResult } from '@/lib/mayorista-pricing';

describe('plazo de pago de campaña mayorista', () => {
  it('solo el Flash Cyber tiene plazo, de 24 h', () => {
    expect(paymentWindowFor(FLASH_CYBER_CAMPAIGN_ID)).toBe(24);
    expect(paymentWindowFor('otra-campana')).toBeNull();
    expect(paymentWindowFor(null)).toBeNull();
  });

  it('vence 24 h después de confirmar', () => {
    const from = Date.parse('2026-11-05T22:30:00Z');
    expect(paymentDeadline(FLASH_CYBER_CAMPAIGN_ID, from)).toBe('2026-11-06T22:30:00.000Z');
    expect(paymentDeadline('otra-campana', from)).toBeNull();
  });

  it('formatea en hora de Buenos Aires', () => {
    expect(fmtDeadlineAR('2026-11-06T22:30:00.000Z')).toMatch(/6\/11 19:30$/);
  });
});

describe('Flash Cyber = 55% off lista (10% extra sobre el 50%)', () => {
  const flash: WholesaleCampaign = {
    id: FLASH_CYBER_CAMPAIGN_ID, name: 'Flash Cyber', status: 'active',
    startsAt: '2026-11-05T00:00:00-03:00', endsAt: arDate('2026-11-08', 'end'),
    badge: 'Flash Cyber', headline: '', text: '', minOrder: null,
    groups: [{ key: 'flash', label: 'Flash Cyber', discount: 0.1 }],
    items: [{ productId: 1, group: 'flash' }],
    createdAt: '', updatedAt: '', history: [],
  };
  const base: PricingResult = {
    lines: [
      { slug: 'hoodie', name: 'Hoodie', size: 'M', quantity: 2, productId: 1, unitPrice: 50000, lineTotal: 100000, clientPrice: null, changed: true },
      { slug: 'sweater', name: 'Sweater', size: 'M', quantity: 1, productId: 2, unitPrice: 40000, lineTotal: 40000, clientPrice: null, changed: true },
    ],
    total: 140000, changes: [], unpriced: [],
  };

  it('un producto de lista $100.000 sale $45.000; el excluido sigue al 50%', () => {
    const r = applyCampaign(base, [flash], '2026-11-06T12:00:00-03:00');
    expect(r.lines[0].unitPrice).toBe(45000);
    expect(r.lines[1].unitPrice).toBe(40000); // sweater: lista 80.000 × 0,5, sin campaña
    expect(r.lines[1].campaign).toBeNull();
  });

  it('el lunes 9/11 vuelve solo al precio normal', () => {
    const r = applyCampaign(base, [flash], '2026-11-09T00:00:01-03:00');
    expect(r.lines[0].unitPrice).toBe(50000);
  });
});
