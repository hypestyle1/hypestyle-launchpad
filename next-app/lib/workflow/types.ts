// 04C — Workflow layer: eventos (approval/comment/activity), templates, saved
// views, filter engine, UGC usage rights. Enums en inglés; labels en español.

import type { ContentChannel, ContentFormat, ContentPriority, ContentPillar, ContentObjective, ChecklistItem } from '@/lib/content/types';

/* ── Eventos (append-only) ── */
export type EventEntity = 'content' | 'campaign' | 'collaboration';
export type EventKind = 'approval' | 'comment' | 'activity';
export type ApprovalAction = 'review_requested' | 'approved' | 'changes_requested' | 'reopened';

export interface ContentEvent {
  id: string;
  entityType: EventEntity;
  entityId: string;
  kind: EventKind;
  actorId?: string | null;
  action?: string | null;      // ApprovalAction para kind=approval; verbo para activity
  body?: string;               // comentario (texto plano)
  mentions?: string[];
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt?: string | null;
}

export const APPROVAL_ACTION_LABEL: Record<ApprovalAction, string> = {
  review_requested: 'solicitó revisión', approved: 'aprobó', changes_requested: 'pidió cambios', reopened: 'reabrió la revisión',
};

/* ── Templates ── */
export interface Template {
  id: string;
  name: string;
  titlePattern?: string;
  channel: ContentChannel;
  format: ContentFormat;
  contentPillar?: ContentPillar | null;
  objective?: ContentObjective | null;
  priority?: ContentPriority;
  hook?: string;
  keyMessage?: string;
  cta?: string;
  audience?: string;
  briefDo?: string[];
  briefDont?: string[];
  checklist?: ChecklistItem[];
  notes?: string;
  references?: { id: string; url: string; label?: string }[];
  defaultResponsibleId?: string | null;
  defaultReviewerId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archived?: boolean;
}

export function blankTemplate(): Partial<Template> {
  return { name: '', channel: 'instagram', format: 'reel', priority: 'medium', briefDo: [], briefDont: [], checklist: [] };
}

// Compone un ContentItem nuevo a partir de un template (independiente después).
export function contentFromTemplate(t: Template): any {
  return {
    title: t.titlePattern || '', channel: t.channel, format: t.format, status: 'idea', priority: t.priority || 'medium',
    contentPillar: t.contentPillar || null, objective: t.objective || null,
    hook: t.hook || '', keyMessage: t.keyMessage || '', cta: t.cta || '', audience: t.audience || '',
    briefDo: [...(t.briefDo || [])], briefDont: [...(t.briefDont || [])],
    checklist: (t.checklist || []).map((c, i) => ({ id: 'c_' + Date.now().toString(36) + i, label: c.label, completed: false })),
    references: (t.references || []).map((r) => ({ ...r })), notes: t.notes || '',
    responsibleId: t.defaultResponsibleId || null, reviewerId: t.defaultReviewerId || null,
  };
}

/* ── Filter engine ── */
export type FilterOperator = 'equals' | 'not_equals' | 'in' | 'before' | 'after' | 'is_empty' | 'is_not_empty';
export interface StructuredFilter { field: string; operator: FilterOperator; value?: any }
export interface SortConfig { field: string; dir: 'asc' | 'desc' }

/* ── Saved Views ── */
export type SavedViewType = 'calendar' | 'kanban' | 'list';
export type SavedViewScope = 'personal' | 'shared';
export interface SavedView {
  id: string;
  name: string;
  viewType: SavedViewType;
  filters: StructuredFilter[];
  sort?: SortConfig[];
  ownerId?: string | null;
  scope: SavedViewScope;
  system?: boolean;            // vistas de sistema (no persistidas)
  createdAt?: string | null;
  updatedAt?: string | null;
}

/* ── UGC usage rights (viven en la Collaboration) ── */
export type UsageTristate = 'yes' | 'no' | 'unknown' | 'not_applicable';
export interface UsageRights {
  organicUsageAllowed: UsageTristate;
  paidAdsUsageAllowed: UsageTristate;
  whitelistingAllowed: UsageTristate;
  exclusivity: UsageTristate;
  rawFilesRequired: boolean;
  rawFilesReceived: boolean;
  usageStartAt?: string | null;
  usageEndAt?: string | null;
  territory?: string;
  agreementReference?: string;
  usageNotes?: string;
}
export const USAGE_TRISTATE_LABEL: Record<UsageTristate, string> = {
  yes: 'Sí', no: 'No', unknown: 'Sin definir', not_applicable: 'No aplica',
};
export const USAGE_TRISTATES: UsageTristate[] = ['yes', 'no', 'unknown', 'not_applicable'];
export const USAGE_TRISTATE_TONE: Record<UsageTristate, string> = {
  yes: 'bg-success-soft text-success', no: 'bg-destructive/10 text-destructive',
  unknown: 'bg-muted text-muted-foreground/70', not_applicable: 'bg-muted text-muted-foreground/60',
};

export function blankUsage(): UsageRights {
  return { organicUsageAllowed: 'unknown', paidAdsUsageAllowed: 'unknown', whitelistingAllowed: 'unknown', exclusivity: 'unknown', rawFilesRequired: false, rawFilesReceived: false };
}

/* ── Vistas de sistema (no persistidas; se resuelven client-side) ── */
export const SYSTEM_VIEWS: SavedView[] = [
  { id: 'sys_today', name: 'Hoy', viewType: 'list', scope: 'shared', system: true, filters: [{ field: 'scheduledAt', operator: 'equals', value: 'today' }] },
  { id: 'sys_week', name: 'Esta semana', viewType: 'list', scope: 'shared', system: true, filters: [{ field: 'scheduledAt', operator: 'equals', value: 'this_week' }] },
  { id: 'sys_review', name: 'Para revisar', viewType: 'list', scope: 'shared', system: true, filters: [{ field: 'approvalState', operator: 'equals', value: 'pending_review' }] },
  { id: 'sys_overdue', name: 'Vencidos', viewType: 'list', scope: 'shared', system: true, filters: [{ field: 'scheduledAt', operator: 'before', value: 'now' }] },
  { id: 'sys_nodate', name: 'Sin fecha', viewType: 'list', scope: 'shared', system: true, filters: [{ field: 'scheduledAt', operator: 'is_empty' }] },
];
