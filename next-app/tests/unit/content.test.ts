import { describe, it, expect } from 'vitest';
import {
  STATUS_LABEL, PRIORITY_LABEL, CHANNEL_LABEL, FORMAT_LABEL,
  ALL_STATUSES, KANBAN_STATUSES, SIDE_STATUSES, CHANNELS, FORMATS, PRIORITIES,
  CHANNEL_FORMATS, STATUS_TONE, blankContentItem, type ContentStatus,
} from '@/lib/content/types';

describe('Content OS — modelo', () => {
  it('todos los status/priority/channel/format tienen label ES', () => {
    for (const s of ALL_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
    for (const p of PRIORITIES) expect(PRIORITY_LABEL[p]).toBeTruthy();
    for (const c of CHANNELS) expect(CHANNEL_LABEL[c]).toBeTruthy();
    for (const f of FORMATS) expect(FORMAT_LABEL[f]).toBeTruthy();
  });
  it('workflow: 7 principales en kanban + blocked/cancelled laterales', () => {
    expect(KANBAN_STATUSES).toEqual(['idea', 'pending', 'in_production', 'review', 'approved', 'scheduled', 'published']);
    expect(SIDE_STATUSES).toEqual(['blocked', 'cancelled']);
    expect(ALL_STATUSES).toHaveLength(9);
  });
  it('cancelled es un status, NO un delete (existe en el modelo)', () => {
    expect(ALL_STATUSES).toContain('cancelled' as ContentStatus);
    expect(STATUS_LABEL.cancelled).toBe('Cancelado');
  });
  it('cada canal ofrece formatos válidos + "other"', () => {
    for (const ch of CHANNELS) {
      const fs = CHANNEL_FORMATS[ch];
      expect(fs.length).toBeGreaterThan(0);
      expect(fs).toContain('other');
      for (const f of fs) expect(FORMATS).toContain(f);
    }
  });
  it('defaults de un nuevo item: idea + medium, sin fecha ni responsable', () => {
    const b = blankContentItem();
    expect(b.status).toBe('idea');
    expect(b.priority).toBe('medium');
    expect(b.scheduledAt).toBeUndefined();
    expect(b.responsibleId).toBeUndefined();
  });
  it('tono de status monocromo/semántico (review=warning, approved/published=success, blocked=destructive)', () => {
    expect(STATUS_TONE.review).toContain('warning');
    expect(STATUS_TONE.approved).toContain('success');
    expect(STATUS_TONE.blocked).toContain('destructive');
  });
});
