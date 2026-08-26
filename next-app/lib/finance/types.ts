// Tipos del Profitability Engine. Compartidos por el dominio, los endpoints y la UI.

/** Calidad/origen de un número financiero. Nunca 'missing' = 0. */
export type DataSource = 'exact' | 'snapshot' | 'configured' | 'missing';

/** Proveedor de pago normalizado. */
export type Provider =
  | 'mercadopago_card' | 'mercadopago_wallet'
  | 'talo' | 'gocuotas' | 'paypal' | 'manual' | 'mayorista' | 'other';

/** Agrupación de proveedor para totales (tarjeta+wallet → mercadopago). */
export type ProviderGroup =
  | 'mercadopago' | 'talo' | 'gocuotas' | 'paypal' | 'manual' | 'mayorista' | 'other';

/** Un monto con su calidad de dato. */
export interface Sourced {
  amount: number;
  source: DataSource;
}

/** Regla de fee configurada, con vigencia temporal. */
export interface FeeRule {
  id: string;
  provider: Provider;
  /** % sobre el bruto (0.0499 = 4,99%). */
  percent: number;
  /** Monto fijo por transacción (ARS). */
  fixed: number;
  /** Vigencia desde (ISO date, inclusive). */
  from: string;
  /** Vigencia hasta (ISO date, exclusivo) o null = vigente. */
  to: string | null;
}

/** Costo variable configurable. */
export interface VariableCost {
  id: string;
  label: string;
  type: 'per_order' | 'per_unit' | 'percent';
  /** Monto (per_order/per_unit) o fracción (percent, 0.005 = 0,5%). */
  value: number;
}

/** Config financiera persistida (WP option hs_finance_config). */
export interface FinanceConfig {
  feeRules: FeeRule[];
  variableCosts: VariableCost[];
  /** Overrides de envío (mínimo por ahora). */
  shipping: {
    /** Costo real fijo por envío cuando no hay dato exacto (ARS), o null. */
    flatRealCost: number | null;
  };
}

/** Snapshot de fee EXACTO de una transacción (persistido en meta del pedido). */
export interface GatewayFeeSnapshot {
  provider: Provider;
  transactionId: string;
  grossAmount: number;
  /** Costo económico de la pasarela (processing + financing). */
  gatewayFee: number;
  /** Neto acreditado por la pasarela. */
  netReceived: number;
  /** Desglose crudo que devolvió la pasarela (fee_details, etc.). */
  breakdown: { type: string; amount: number }[];
  /** Deducciones que NO son costo económico (retenciones/impuestos): gross − net − gatewayFee. */
  otherCashDeduction: number;
  currency: string;
  syncedAt: string;
  source: 'exact';
}

/** Resultado del cálculo de fee de un pedido. */
export interface OrderFee {
  provider: Provider;
  group: ProviderGroup;
  /** Costo económico de la pasarela (lo que resta a Contribution Profit). */
  economicCost: number;
  /** Neto efectivamente acreditado (para Net Collected / cash). */
  netReceived: number;
  /** Deducciones de caja no económicas (retenciones), 0 si no aplica. */
  otherCashDeduction: number;
  source: DataSource;
}
