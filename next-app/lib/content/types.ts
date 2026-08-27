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

// Workflow principal (orden del flujo). Blocked/Cancelled son laterales.
export const KANBAN_STATUSES: ContentStatus[] = ['idea', 'pending', 'in_production', 'review', 'approved', 'scheduled', 'published'];
export const SIDE_STATUSES: ContentStatus[] = ['blocked', 'cancelled'];
export const ALL_STATUSES: ContentStatus[] = [...KANBAN_STATUSES, ...SIDE_STATUSES];

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
