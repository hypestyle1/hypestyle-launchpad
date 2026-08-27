import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_STATUS_LABEL, CAMPAIGN_TYPE_LABEL, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, CAMPAIGN_STATUS_TONE,
  COLLAB_STATUS_LABEL, COLLAB_STATUSES, COLLAB_FLOW, COLLAB_STATUS_TONE,
  COMPENSATION_LABEL, COMPENSATION_TYPES, blankCampaign, blankCollaboration, progressText,
  type CampaignStatus, type CollaborationStatus,
} from '@/lib/campaigns/types';

describe('Campaigns + Collaborations — modelo (04B)', () => {
  it('todos los status/type/compensation tienen label', () => {
    for (const s of CAMPAIGN_STATUSES) expect(CAMPAIGN_STATUS_LABEL[s]).toBeTruthy();
    for (const t of CAMPAIGN_TYPES) expect(CAMPAIGN_TYPE_LABEL[t]).toBeTruthy();
    for (const s of COLLAB_STATUSES) expect(COLLAB_STATUS_LABEL[s]).toBeTruthy();
    for (const c of COMPENSATION_TYPES) expect(COMPENSATION_LABEL[c]).toBeTruthy();
  });
  it('el flujo de colaboración termina en completed; cancelled es lateral', () => {
    expect(COLLAB_FLOW[0]).toBe('prospecting');
    expect(COLLAB_FLOW[COLLAB_FLOW.length - 1]).toBe('completed');
    expect(COLLAB_FLOW).not.toContain('cancelled' as CollaborationStatus);
    expect(COLLAB_STATUSES).toContain('cancelled' as CollaborationStatus);
    expect(COLLAB_STATUSES).toHaveLength(10);
  });
  it('cada status tiene tono definido', () => {
    for (const s of CAMPAIGN_STATUSES) expect(CAMPAIGN_STATUS_TONE[s as CampaignStatus]).toBeTruthy();
    for (const s of COLLAB_STATUSES) expect(COLLAB_STATUS_TONE[s]).toBeTruthy();
  });
  it('blank campaign: draft + campaign, sin fechas', () => {
    const b = blankCampaign();
    expect(b.status).toBe('draft');
    expect(b.type).toBe('campaign');
    expect(b.launchAt).toBeUndefined();
    expect(b.productIds).toEqual([]);
  });
  it('blank collaboration: prospecting + gifting, creator/campaign parametrizables', () => {
    const b = blankCollaboration('2881', 'c1');
    expect(b.creatorId).toBe('2881');
    expect(b.campaignId).toBe('c1');
    expect(b.status).toBe('prospecting');
    expect(b.compensation?.type).toBe('gifting');
    expect(blankCollaboration().campaignId).toBeNull();
  });
  it('progressText: nunca % inventado, derivado de stats', () => {
    expect(progressText(undefined)).toBe('Sin contenido');
    expect(progressText({ content: 0, published: 0, scheduled: 0, review: 0, pending: 0, creators: 0 })).toBe('Sin contenido');
    const t = progressText({ content: 12, published: 7, scheduled: 3, review: 0, pending: 2, creators: 4 });
    expect(t).toContain('12 piezas');
    expect(t).toContain('7 publicadas');
    expect(t).toContain('3 programadas');
    expect(t).toContain('2 pendientes');
    expect(t).not.toContain('%');
  });
});
