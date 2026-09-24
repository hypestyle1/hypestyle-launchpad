// WHOLESALE_MARGIN_RISK — alerta, no acción.
//
// El mayorista compra al 50% del PVP. Con la regla de precios retail (PVP entre
// 3,33x y 5x el costo), un producto al piso queda a 1,67x en mayorista: 40% de
// margen bruto. Por debajo de eso el 50% ya no cierra. El sistema no cambia
// precios ni descuentos: marca, y la decisión (subir PVP, bajar costo o sacar
// el producto del canal) es del negocio.
//
//   CRITICAL      PVP / costo < 3,33x   (mg mayorista < 40%)
//   RISK          PVP / costo < 3,5x    (mg mayorista < 43%)
//   COST_UNKNOWN  sin perfil, perfil incompleto o marcado "a confirmar"
//   NOT_WHOLESALE fuera del catálogo mayorista (pack, set, gift card, excluidos)

import { wholesalePrice } from './mayorista-pricing';

export type WholesaleRiskLevel = 'OK' | 'RISK' | 'CRITICAL' | 'COST_UNKNOWN' | 'NOT_WHOLESALE';

export const RISK_MULTIPLE = 3.5;
export const CRITICAL_MULTIPLE = 3.33;

export interface WholesaleRiskInput {
  /** PVP real = regular_price. */
  regularPrice: number | null | undefined;
  cost: number | null | undefined;
  /** ¿El costo es confiable? (perfil configurado, completo y sin "a confirmar"). */
  costReliable: boolean;
  wholesale: boolean;
}

export interface WholesaleRisk {
  level: WholesaleRiskLevel;
  /** PVP / costo. */
  multiple: number | null;
  wholesalePrice: number | null;
  /** (mayorista − costo) / mayorista. */
  wholesaleMargin: number | null;
}

/** "a confirmar" en el nombre del perfil = costo provisorio. */
export function costProfileLooksProvisional(profileName: string | null | undefined): boolean {
  return /a\s*confirmar/i.test(profileName ?? '');
}

export function wholesaleMarginRisk(input: WholesaleRiskInput): WholesaleRisk {
  const regular = Number(input.regularPrice);
  const cost = Number(input.cost);
  const ws = Number.isFinite(regular) && regular > 0 ? wholesalePrice(regular) : null;
  if (!input.wholesale) return { level: 'NOT_WHOLESALE', multiple: null, wholesalePrice: ws, wholesaleMargin: null };
  if (!input.costReliable || !Number.isFinite(cost) || cost <= 0 || ws == null) {
    return { level: 'COST_UNKNOWN', multiple: null, wholesalePrice: ws, wholesaleMargin: null };
  }
  const multiple = regular / cost;
  const wholesaleMargin = (ws - cost) / ws;
  const level: WholesaleRiskLevel = multiple < CRITICAL_MULTIPLE ? 'CRITICAL' : multiple < RISK_MULTIPLE ? 'RISK' : 'OK';
  return { level, multiple, wholesalePrice: ws, wholesaleMargin };
}

export const RISK_LABEL: Record<WholesaleRiskLevel, string> = {
  OK: 'OK',
  RISK: 'RISK',
  CRITICAL: 'CRITICAL',
  COST_UNKNOWN: 'COST_UNKNOWN',
  NOT_WHOLESALE: '—',
};
