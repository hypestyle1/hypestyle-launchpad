// Founder Brief ("Hoy"): contrato de señales. Espejo del documento
// `Hype/01 - Web/ADMIN/Founder Brief - contrato de señales (15-09-2026).md`.
//
// Tres capas: providers (I/O) → rules (puras) → compose (puro). Agregar un
// dominio = un provider + sus reglas en registry.ts. Nada más cambia.

import type { ProductRank } from '@/lib/dashboard/finance';
import type { MetaInsight } from '@/lib/meta/client';
import type { ProcessingOrder } from '@/lib/orders-fulfillment';

export type BriefDomain = 'ops' | 'stock' | 'ads' | 'finance' | 'customers' | 'content' | 'system';

/** Peso en el score: exact 1 · rule 0,7 · estimated 0,5 */
export type Confidence = 'exact' | 'rule' | 'estimated';

export type Tone = 'critical' | 'warning' | 'opportunity' | 'info';

/** Qué clase de plata es el impacto. Define cómo se lee la cifra, no cómo se puntúa. */
export type ImpactKind =
  | 'retained'      // plata cobrada que está frenada (pagados sin despacho)
  | 'at_risk'       // gasto que sigue corriendo (conjunto bajo breakeven)
  | 'lost'          // venta perdida estimada (talle agotado)
  | 'recoverable'   // plata que se puede recuperar (pendientes de pago)
  | 'incurred'      // costo ya incurrido fuera de rango (cuotas, categoría de gasto)
  | 'shortfall'     // faltante de caja (proyección bajo piso, compromiso sin fondos)
  | 'unclassified'; // monto sin categorizar

export type SourceRefType = 'order' | 'product' | 'variation' | 'adset' | 'campaign' | 'ledger' | 'customer';
export interface SourceRef { type: SourceRefType; id: string | number; label?: string }

export interface BriefLink { label: string; href: string }

export interface BriefSignal {
  /**
   * Estable por situación: `${domain}:${rule}:${entityId}` (o `:all` si la regla
   * agrega). NO depende de importe, urgencia ni fecha: la misma situación da el
   * mismo id día tras día. Base para historial, visto y snooze a futuro.
   */
  id: string;
  domain: BriefDomain;
  rule: string;
  /** Frase con la plata adelante. Plantilla determinista, nunca generada. */
  situation: string;
  /** Una línea de números. */
  evidence: string;
  /** Qué hacer. */
  action: string;
  /** Pantalla existente del panel, o externo (wp-admin, MP). */
  href: string;
  /** Texto del link principal ("Ver pedidos", "Editar en Woo"). */
  hrefLabel: string;
  /** Links secundarios opcionales (ej. WhatsApp al cliente). */
  links?: BriefLink[];
  impact: { amount: number; currency: 'ARS'; kind: ImpactKind };
  /** 1 a 2, factor por reloj. */
  urgency: number;
  confidence: Confidence;
  tone: Tone;
  observedAt: string;
  entity?: { type: string; id: string | number; label?: string };
  /**
   * Referencias auditables a lo que originó la señal: pedidos, productos,
   * variaciones, conjuntos de Meta y, a futuro, movimientos del ledger.
   * No se muestran en la card; existen para rastrear por qué se generó.
   */
  sourceRefs: SourceRef[];
  /** Crudo, para tests y debug; la UI no lo lee. */
  meta?: Record<string, unknown>;
}

export interface ScoredSignal extends BriefSignal { score: number }

// ── Config ──────────────────────────────────────────────────────────────────

export interface BriefConfig {
  /** Piso mínimo en ARS para entrar al brief, aunque el revenue sea chico. */
  floorMinARS: number;
  /** Piso como fracción del revenue de 30 días (default 1 %). */
  floorRevenuePct: number;
  maxItems: number;
  maxPerDomain: number;
  ops: { labelHours: number; criticalLabelHours: number; labelMaxDays: number; pendingMinARS: number; pendingMaxHours: number; pendingMinMinutes: number };
  stock: { topN: number; sizesPerProduct: number; lostDays: number };
  ads: { days: number; minSpendARS: number; projectDays: number };
  /** Base del WP para links a wp-admin (los rules son puros: no leen env). */
  wpUrl: string;
  /** Reservado para Finance OS. */
  finance?: Record<string, number>;
}

// ── Inputs de providers (tipados por clave) ──────────────────────────────────

export interface PendingOrder {
  id: number;
  number: string;
  total: number;
  dateGmt: string;
  status: string;
  customerName: string;
  phone: string;
  paymentTitle: string;
}

export interface SalesWindow {
  startUTC: string;
  endUTC: string;
  days: number;
  revenue: number;
  netRevenue: number;
  contributionProfit: number;
  orders: number;
  aov: number;
  topProducts: ProductRank[];
  truncated: boolean;
}

export interface StockVariationRow {
  id: number;
  /** id del producto padre; para simples, el mismo id. */
  productId: number;
  /** Nombre completo que devuelve Woo ("PRODUCTO - XL"). */
  name: string;
  /** Talle inferido del nombre, o '' si no se pudo. */
  size: string;
  qty: number | null;
  /** true si la fila es el producto padre (Woo lo lista cuando todas sus variaciones se agotan). */
  isParent: boolean;
  status: 'lowstock' | 'outofstock';
  lowStockAmount: number | null;
}

export interface StockReport {
  low: StockVariationRow[];
  out: StockVariationRow[];
  totals: { lowstock: number; outofstock: number; instock: number } | null;
}

export interface AdsetRow extends MetaInsight {
  effectiveStatus: string;
  /** optimization_goal del ad set (OFFSITE_CONVERSIONS, LINK_CLICKS, …). */
  optimizationGoal: string;
}

export interface AdsetWindow {
  since: string;
  until: string;
  days: number;
  rows: AdsetRow[];
}

export interface BriefInputs {
  'orders.processing'?: ProcessingOrder[];
  'orders.pending'?: PendingOrder[];
  'sales.30d'?: SalesWindow;
  'stock.report'?: StockReport;
  'meta.adsets'?: AdsetWindow;
}

export type ProviderKey = keyof BriefInputs;

export interface ProviderContext {
  now: Date;
  config: BriefConfig;
}

export interface BriefProvider<K extends ProviderKey = ProviderKey> {
  key: K;
  domain: BriefDomain;
  load(ctx: ProviderContext): Promise<NonNullable<BriefInputs[K]>>;
}

export interface BriefContext {
  now: Date;
  /** Piso en ARS para entrar al brief. */
  floorARS: number;
  revenue30d: number | null;
  config: BriefConfig;
}

export interface BriefRule {
  id: string;
  domain: BriefDomain;
  /** Providers que consume. Si alguno falló, la regla no corre. */
  requires: ProviderKey[];
  evaluate(inputs: BriefInputs, ctx: BriefContext): BriefSignal[];
}

// ── Respuesta ───────────────────────────────────────────────────────────────

export interface DegradedEntry {
  domain: BriefDomain;
  key: string;
  reason: string;
}

export interface BriefResponse {
  generatedAt: string;
  items: ScoredSignal[];
  /** Señales que no pasaron piso o tope. */
  suppressed: number;
  degraded: DegradedEntry[];
  floorARS: number;
  revenue30d: number | null;
  /** Reglas que no corrieron porque les faltó un provider. */
  skippedRules: string[];
  /** Solo con ?debug=1: resumen de lo que devolvió cada provider. */
  inputsSummary?: Record<string, unknown>;
  /** Solo con ?debug=1: todas las señales puntuadas antes del recorte. */
  all?: ScoredSignal[];
}
