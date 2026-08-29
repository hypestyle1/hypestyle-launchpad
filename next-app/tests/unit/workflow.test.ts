import { describe, it, expect } from 'vitest';
import {
  APPROVAL_LABEL, APPROVAL_TONE, APPROVAL_STATES, PILLAR_LABEL, OBJECTIVE_LABEL, PILLARS, OBJECTIVES,
  KANBAN_STATUSES, PRODUCTION_STATUSES, ALL_STATUSES,
} from '@/lib/content/types';
import {
  APPROVAL_ACTION_LABEL, USAGE_TRISTATE_LABEL, USAGE_TRISTATES, blankUsage, blankTemplate, SYSTEM_VIEWS, contentFromTemplate,
} from '@/lib/workflow/types';

describe('04C — Workflow / Approvals / Knowledge', () => {
  it('Kanban de PRODUCCIÓN no incluye review/approved (eso es approvalState)', () => {
    expect(KANBAN_STATUSES).not.toContain('review');
    expect(KANBAN_STATUSES).not.toContain('approved');
    expect(KANBAN_STATUSES).toEqual(['idea', 'pending', 'in_production', 'scheduled', 'published']);
    // ALL_STATUSES conserva legacy para compatibilidad
    expect(ALL_STATUSES).toContain('review');
    expect(ALL_STATUSES).toContain('approved');
    expect(PRODUCTION_STATUSES).toContain('blocked');
  });
  it('approvalState: 4 estados con label y tono', () => {
    expect(APPROVAL_STATES).toEqual(['not_requested', 'pending_review', 'changes_requested', 'approved']);
    for (const s of APPROVAL_STATES) { expect(APPROVAL_LABEL[s]).toBeTruthy(); expect(APPROVAL_TONE[s]).toBeTruthy(); }
  });
  it('acciones de aprobación tienen label', () => {
    for (const a of ['review_requested', 'approved', 'changes_requested', 'reopened'] as const) expect(APPROVAL_ACTION_LABEL[a]).toBeTruthy();
  });
  it('taxonomías pillar/objective completas', () => {
    for (const p of PILLARS) expect(PILLAR_LABEL[p]).toBeTruthy();
    for (const o of OBJECTIVES) expect(OBJECTIVE_LABEL[o]).toBeTruthy();
    expect(PILLARS).toContain('culture'); expect(OBJECTIVES).toContain('conversion');
  });
  it('usage rights tri-state: default unknown (no asume "no")', () => {
    const u = blankUsage();
    expect(u.paidAdsUsageAllowed).toBe('unknown');
    expect(u.exclusivity).toBe('unknown');
    expect(u.rawFilesRequired).toBe(false);
    for (const t of USAGE_TRISTATES) expect(USAGE_TRISTATE_LABEL[t]).toBeTruthy();
  });
  it('system views incluyen Para revisar y Vencidos', () => {
    const ids = SYSTEM_VIEWS.map((v) => v.id);
    expect(ids).toContain('sys_review'); expect(ids).toContain('sys_overdue'); expect(ids).toContain('sys_nodate');
    expect(SYSTEM_VIEWS.find((v) => v.id === 'sys_review')!.filters[0]).toEqual({ field: 'approvalState', operator: 'equals', value: 'pending_review' });
  });
  it('crear desde template: copia defaults, checklist con ids nuevos, sin fecha/campaña fija', () => {
    const t: any = { id: 't1', name: 'Reel Producto', channel: 'instagram', format: 'reel', contentPillar: 'product', objective: 'conversion', priority: 'high', hook: 'H', briefDo: ['fit'], checklist: [{ id: 'x', label: 'Filmar', completed: true }] };
    const c = contentFromTemplate(t);
    expect(c.channel).toBe('instagram'); expect(c.contentPillar).toBe('product'); expect(c.priority).toBe('high');
    expect(c.status).toBe('idea');
    expect(c.checklist[0].label).toBe('Filmar'); expect(c.checklist[0].completed).toBe(false); expect(c.checklist[0].id).not.toBe('x');
    expect(c.campaignId).toBeUndefined(); expect(c.scheduledAt).toBeUndefined();
  });
});
