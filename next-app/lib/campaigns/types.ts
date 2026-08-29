// Campaigns + Collaborations (Paso 04B). Tres entidades distintas y NO mezcladas:
//   Campaign     = iniciativa/drop/evento.
//   Collaboration = acuerdo operativo creator×campaign (qué le enviamos, qué esperamos).
//   ContentItem  = el deliverable (vive en Content OS; se referencia por collaborationId).
// Enums en inglés (estables para automations); labels en español para la UI. Los
// counts NO se guardan: se derivan de los ContentItems ligados (ver counts).

import type { ContentReference } from '@/lib/content/types';
import type { UsageRights } from '@/lib/workflow/types';

/* ── Campaign ──────────────────────────────────────────────────────────── */
export type CampaignStatus = 'draft' | 'planning' | 'active' | 'completed' | 'paused' | 'cancelled';
export type CampaignType = 'drop' | 'campaign' | 'collaboration' | 'event' | 'evergreen' | 'other';

export interface CampaignStats {
  content: number; published: number; scheduled: number; review: number; pending: number; creators: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  ownerId?: string | null;
  startAt?: string | null;
  launchAt?: string | null;
  endAt?: string | null;
  productIds?: number[];
  objective?: string;
  notes?: string;
  references?: ContentReference[];
  daysToLaunch?: number | null;   // derivado
  stats?: CampaignStats;          // derivado
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  archived?: boolean;
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Borrador', planning: 'Planificación', active: 'Activa', completed: 'Completada', paused: 'Pausada', cancelled: 'Cancelada',
};
export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  drop: 'Drop', campaign: 'Campaña', collaboration: 'Colaboración', event: 'Evento', evergreen: 'Evergreen', other: 'Otro',
};
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['draft', 'planning', 'active', 'completed', 'paused', 'cancelled'];
export const CAMPAIGN_TYPES: CampaignType[] = ['drop', 'campaign', 'collaboration', 'event', 'evergreen', 'other'];

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  planning: 'bg-secondary text-secondary-foreground',
  active: 'bg-success-soft text-success',
  completed: 'bg-success-soft text-success',
  paused: 'bg-warning-soft text-warning',
  cancelled: 'bg-muted text-muted-foreground/60',
};

/* ── CreatorCollaboration ──────────────────────────────────────────────── */
export type CollaborationStatus =
  | 'prospecting' | 'contacted' | 'agreed' | 'preparing' | 'sent'
  | 'delivered' | 'content_due' | 'content_received' | 'completed' | 'cancelled';

export type CompensationType = 'gifting' | 'paid' | 'gifting_paid' | 'exchange' | 'organic' | 'other';

export interface CollaborationItem {
  productId: number;
  quantity: number;
  variationId?: number;
  size?: string;
  notes?: string;
}
export interface CollaborationCompensation {
  type: CompensationType;
  amount?: number;
  currency?: string;
  notes?: string;
}
export interface CollaborationCounts { expected: number; received: number; published: number }

export interface CreatorCollaboration {
  id: string;
  creatorId: string;
  campaignId?: string | null;
  responsibleId?: string | null;
  status: CollaborationStatus;
  agreedAt?: string | null;
  shipmentDate?: string | null;
  deliveredAt?: string | null;
  dueAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  itemsSent?: CollaborationItem[];
  compensation?: CollaborationCompensation | null;
  notes?: string;
  usage?: UsageRights;            // 04C — UGC usage rights
  rightsExpireInDays?: number | null; // derivado
  contentItemIds?: string[];      // derivado (link vive en el ContentItem)
  counts?: CollaborationCounts;   // derivado
  overdue?: boolean;              // derivado
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  archived?: boolean;
}

export const COLLAB_STATUS_LABEL: Record<CollaborationStatus, string> = {
  prospecting: 'Potencial', contacted: 'Contactado', agreed: 'Acordado', preparing: 'Preparando envío',
  sent: 'Enviado', delivered: 'Entregado', content_due: 'Contenido pendiente', content_received: 'Contenido recibido',
  completed: 'Completado', cancelled: 'Cancelado',
};
// Orden real del ciclo (cancelled es lateral, reversible).
export const COLLAB_FLOW: CollaborationStatus[] = [
  'prospecting', 'contacted', 'agreed', 'preparing', 'sent', 'delivered', 'content_due', 'content_received', 'completed',
];
export const COLLAB_STATUSES: CollaborationStatus[] = [...COLLAB_FLOW, 'cancelled'];

export const COLLAB_STATUS_TONE: Record<CollaborationStatus, string> = {
  prospecting: 'bg-muted text-muted-foreground',
  contacted: 'bg-muted text-muted-foreground',
  agreed: 'bg-secondary text-secondary-foreground',
  preparing: 'bg-secondary text-secondary-foreground',
  sent: 'bg-warning-soft text-warning',
  delivered: 'bg-warning-soft text-warning',
  content_due: 'bg-warning-soft text-warning',
  content_received: 'bg-success-soft text-success',
  completed: 'bg-success-soft text-success',
  cancelled: 'bg-muted text-muted-foreground/60',
};

export const COMPENSATION_LABEL: Record<CompensationType, string> = {
  gifting: 'Canje (gifting)', paid: 'Pago', gifting_paid: 'Canje + pago', exchange: 'Intercambio', organic: 'Orgánico', other: 'Otro',
};
export const COMPENSATION_TYPES: CompensationType[] = ['gifting', 'paid', 'gifting_paid', 'exchange', 'organic', 'other'];

export function blankCampaign(): Partial<Campaign> {
  return { name: '', type: 'campaign', status: 'draft', productIds: [], references: [] };
}
export function blankCollaboration(creatorId = '', campaignId: string | null = null): Partial<CreatorCollaboration> {
  return { creatorId, campaignId, status: 'prospecting', itemsSent: [], compensation: { type: 'gifting' } };
}

// Progreso legible (nunca un % inventado): "7 publicadas · 3 programadas · 2 pendientes".
export function progressText(s?: CampaignStats): string {
  if (!s || !s.content) return 'Sin contenido';
  const parts = [`${s.content} pieza${s.content === 1 ? '' : 's'}`];
  if (s.published) parts.push(`${s.published} publicada${s.published === 1 ? '' : 's'}`);
  if (s.scheduled) parts.push(`${s.scheduled} programada${s.scheduled === 1 ? '' : 's'}`);
  if (s.pending) parts.push(`${s.pending} pendiente${s.pending === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
