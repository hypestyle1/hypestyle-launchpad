// Content OS — modelo central. UN ContentItem cambia de vista (Calendar/Kanban/
// List), nunca se duplica. IDs de enums en inglés (estables para automations);
// labels en español para la UI. Datos estructurados (no texto libre) para poder
// consultar después "scheduledAt mañana AND status != approved", etc.

export type ContentStatus =
  | 'idea' | 'pending' | 'in_production' | 'review' | 'approved'
  | 'scheduled' | 'published' | 'blocked' | 'cancelled';
export type ContentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ContentChannel = 'instagram' | 'tiktok' | 'youtube' | 'email' | 'website' | 'other';
export type ContentFormat =
  | 'reel' | 'story' | 'post' | 'carousel' | 'tiktok' | 'short'
  | 'video' | 'newsletter' | 'shooting' | 'ugc' | 'blog' | 'other';

export interface ContentReference { id: string; label?: string; url: string; type?: string }
export interface ContentAsset { id: string; type?: string; url: string; label?: string }

// 04C — Workflow + Knowledge
export type ApprovalState = 'not_requested' | 'pending_review' | 'changes_requested' | 'approved';
export type ContentPillar =
  | 'product' | 'editorial' | 'community' | 'culture' | 'campaign' | 'ugc'
  | 'creator' | 'behind_the_scenes' | 'education_storytelling' | 'brand' | 'other';
export type ContentObjective =
  | 'awareness' | 'engagement' | 'traffic' | 'conversion' | 'launch' | 'community' | 'retention' | 'other';
export interface ChecklistItem { id: string; label: string; completed: boolean; completedAt?: string | null; completedBy?: string | null }
export interface AssetRevision { id: string; revisionNumber: number; url: string; uploadedAt?: string | null; uploadedBy?: string | null; notes?: string; approved?: boolean }

export interface ContentItem {
  id: string;
  title: string;
  description?: string;      // qué hay que hacer / idea
  channel: ContentChannel;
  format: ContentFormat;
  status: ContentStatus;
  priority: ContentPriority;
  scheduledAt?: string | null;   // planificada (ISO)
  publishedAt?: string | null;   // real (ISO)
  responsibleId?: string | null;
  campaignId?: string | null;      // 04B: iniciativa a la que pertenece
  creatorId?: string | null;
  collaborationId?: string | null; // 04B: acuerdo concreto (identifica la colaboración aunque el creator repita)
  productIds?: number[];
  copy?: string;                 // texto a publicar (largo, con saltos)
  notes?: string;                // interno
  references?: ContentReference[];
  assets?: ContentAsset[];
  // 04C — aprobación (snapshot; el historial vive en eventos)
  approvalState?: ApprovalState;
  reviewerId?: string | null;
  approverId?: string | null;
  reviewRequestedAt?: string | null;
  approvedAt?: string | null;
  // 04C — brief (conocimiento para producir)
  contentPillar?: ContentPillar | null;
  objective?: ContentObjective | null;
  hook?: string;
  keyMessage?: string;
  cta?: string;
  audience?: string;
  briefDo?: string[];
  briefDont?: string[];
  additionalRequirements?: string;
  // 04C — checklist, blockers, revisions
  checklist?: ChecklistItem[];
  blockedReason?: string;
  blockedByContentIds?: number[];
  assetRevisions?: AssetRevision[];
  currentRevision?: string | null;
  approvedRevision?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  archived?: boolean;
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: 'Idea', pending: 'Pendiente', in_production: 'En producción', review: 'Para revisar',
  approved: 'Aprobado', scheduled: 'Programado', published: 'Publicado', blocked: 'Bloqueado', cancelled: 'Cancelado',
};
export const PRIORITY_LABEL: Record<ContentPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
export const CHANNEL_LABEL: Record<ContentChannel, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', email: 'Email', website: 'Web', other: 'Otro',
};
export const FORMAT_LABEL: Record<ContentFormat, string> = {
  reel: 'Reel', story: 'Story', post: 'Post', carousel: 'Carrusel', tiktok: 'TikTok', short: 'Short',
  video: 'Video', newsletter: 'Newsletter', shooting: 'Shooting', ugc: 'UGC', blog: 'Blog', other: 'Otro',
};

// 04C — Producción y aprobación son dimensiones distintas. El Kanban es de
// PRODUCCIÓN (sin review/approved: eso es approvalState). review/approved siguen
// en el type sólo por compatibilidad con datos legacy (0 en prod al 28/08).
export const KANBAN_STATUSES: ContentStatus[] = ['idea', 'pending', 'in_production', 'scheduled', 'published'];
export const SIDE_STATUSES: ContentStatus[] = ['blocked', 'cancelled'];
// Estados de producción seleccionables en el drawer (sin review/approved).
export const PRODUCTION_STATUSES: ContentStatus[] = [...KANBAN_STATUSES, ...SIDE_STATUSES];
export const ALL_STATUSES: ContentStatus[] = ['idea', 'pending', 'in_production', 'review', 'approved', 'scheduled', 'published', 'blocked', 'cancelled'];

// ── Aprobación (04C) ──
export const APPROVAL_LABEL: Record<ApprovalState, string> = {
  not_requested: 'Sin revisión', pending_review: 'Para revisar', changes_requested: 'Cambios pedidos', approved: 'Aprobado',
};
export const APPROVAL_TONE: Record<ApprovalState, string> = {
  not_requested: 'bg-muted text-muted-foreground/70',
  pending_review: 'bg-warning-soft text-warning',
  changes_requested: 'bg-destructive/10 text-destructive',
  approved: 'bg-success-soft text-success',
};
export const APPROVAL_STATES: ApprovalState[] = ['not_requested', 'pending_review', 'changes_requested', 'approved'];

export const PILLAR_LABEL: Record<ContentPillar, string> = {
  product: 'Producto', editorial: 'Editorial', community: 'Comunidad', culture: 'Cultura', campaign: 'Campaña',
  ugc: 'UGC', creator: 'Creador', behind_the_scenes: 'Detrás de escena', education_storytelling: 'Educación / storytelling', brand: 'Marca', other: 'Otro',
};
export const OBJECTIVE_LABEL: Record<ContentObjective, string> = {
  awareness: 'Awareness', engagement: 'Engagement', traffic: 'Tráfico', conversion: 'Conversión', launch: 'Lanzamiento', community: 'Comunidad', retention: 'Retención', other: 'Otro',
};
export const PILLARS = Object.keys(PILLAR_LABEL) as ContentPillar[];
export const OBJECTIVES = Object.keys(OBJECTIVE_LABEL) as ContentObjective[];

// Tono de status para badges (monocromo + semántico sutil, sin rainbow).
export const STATUS_TONE: Record<ContentStatus, string> = {
  idea: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
  in_production: 'bg-secondary text-secondary-foreground',
  review: 'bg-warning-soft text-warning',
  approved: 'bg-success-soft text-success',
  scheduled: 'bg-secondary text-secondary-foreground',
  published: 'bg-success-soft text-success',
  blocked: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground/60',
};
export const PRIORITY_TONE: Record<ContentPriority, string> = {
  low: 'text-muted-foreground/60', medium: 'text-muted-foreground', high: 'text-warning', urgent: 'text-destructive',
};

export const CHANNELS = Object.keys(CHANNEL_LABEL) as ContentChannel[];
export const FORMATS = Object.keys(FORMAT_LABEL) as ContentFormat[];
export const PRIORITIES = Object.keys(PRIORITY_LABEL) as ContentPriority[];

/** Combos canal→formatos sugeridos (no rígido: 'other' siempre disponible). */
export const CHANNEL_FORMATS: Record<ContentChannel, ContentFormat[]> = {
  instagram: ['reel', 'story', 'post', 'carousel', 'video', 'ugc', 'other'],
  tiktok: ['tiktok', 'short', 'video', 'ugc', 'other'],
  youtube: ['video', 'short', 'other'],
  email: ['newsletter', 'other'],
  website: ['blog', 'post', 'other'],
  other: ['shooting', 'ugc', 'video', 'post', 'other'],
};

export function blankContentItem(): Partial<ContentItem> {
  return { title: '', channel: 'instagram', format: 'reel', status: 'idea', priority: 'medium', productIds: [], references: [] };
}
