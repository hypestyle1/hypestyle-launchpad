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

// ─── Snapshot v2 (Fase 1, 09/2026) ────────────────────────────────────────────
//
// Extiende el snapshot v1 SIN romperlo: todos los campos v1 (`gatewayFee`,
// `netReceived`, `breakdown`, `otherCashDeduction`, `source: 'exact'`) siguen
// presentes con la misma semántica, así el engine (`computeOrderFee`) y el
// parser (`parseGatewaySnapshot`) leen v1 y v2 por igual. Lo nuevo separa lo
// que v1 mezclaba: comisión vs financiación, y las retenciones impositivas como
// línea propia con nombre, régimen y jurisdicción.
//
// Dos conceptos que NO se mezclan (decisión de negocio 10/09/2026):
//   - `netCashReceived`: caja. Lo que MP informa como acreditado. Ya descuenta
//     comisión, financiación, retenciones y refunds. Es el valor canónico.
//   - `taxWithholdings[]`: se persisten como "tax withholding" y nada más. La
//     clasificación contable (gasto / pago a cuenta / crédito fiscal) se decide
//     después con el contador; acá no se etiqueta.

/** Calidad del dato financiero. `real` = lo informó la pasarela; `calculated` =
 *  se reconstruyó por fórmula porque la pasarela no informó el neto. Los otros
 *  dos niveles (`estimated`, `missing`) viven en el engine para pedidos SIN
 *  snapshot y se mapean desde `DataSource` ('configured' → estimated). */
export type SnapshotQuality = 'real' | 'calculated';

/** Una retención impositiva tal como la aplicó la pasarela sobre este pago. */
export interface TaxWithholding {
  /** Nombre crudo del cargo (ej. `tax_withholding_sirtac_noinsc-buenos_aires`). */
  name: string;
  /** Régimen, si se pudo inferir del nombre/metadata (ej. `sirtac_noinsc`). */
  regime: string | null;
  /** Jurisdicción, si la pasarela la informa (ej. `buenos_aires`). */
  jurisdiction: string | null;
  amount: number;
  /** Id del cargo en la pasarela (ej. `177835956882-003`), para auditoría. */
  sourceId: string | null;
}

/** Cargo normalizado (fee o tax) con su origen, para auditoría del desglose. */
export interface SnapshotCharge {
  sourceId: string | null;
  name: string;
  kind: 'gateway' | 'financing' | 'other_fee' | 'tax';
  amount: number;
  /** Parte devuelta al vendedor si hubo refund del cargo. */
  refunded: number;
  origin: 'charges_details' | 'fee_details';
}

/** Discrepancia entre el neto informado y el reconstruido. Nunca se oculta. */
export interface SnapshotDiscrepancy {
  reportedNet: number;
  calculatedNet: number;
  /** reportedNet − calculatedNet. */
  delta: number;
  notes: string[];
}

export interface GatewayFeeSnapshotV2 extends GatewayFeeSnapshot {
  version: 2;

  // Identidad
  paymentId: string;
  externalReference: string | null;
  merchantOrderId: string | null;
  collectorId: string | null;

  // Clasificación
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  installments: number | null;
  status: string | null;
  statusDetail: string | null;

  // Montos
  gross: number;
  totalPaid: number | null;
  feeGateway: number;
  feeFinancing: number;
  feeOther: number;
  taxWithholdings: TaxWithholding[];
  taxWithholdingTotal: number;
  refunded: number;
  /** Cargos devueltos al vendedor (refund de fees). Entra como ajuste positivo. */
  adjustments: number;
  /** Caja: neto acreditado según la pasarela (canónico). */
  netCashReceived: number;
  /** Control: gross − fees − financing − taxes − other − refunded + adjustments. */
  calculatedNet: number;
  discrepancy: SnapshotDiscrepancy | null;
  charges: SnapshotCharge[];

  // Fechas: timestamps ORIGINALES de la pasarela, con su offset. La conversión
  // a America/Argentina/Buenos_Aires se hace al agregar, no acá.
  dateCreated: string | null;
  dateApproved: string | null;
  moneyReleaseDate: string | null;
  moneyReleaseStatus: string | null;

  // Calidad / origen
  quality: SnapshotQuality;
  /** Avisos del normalizador (cargo desconocido, fee_details ≠ charges, etc.). */
  warnings: string[];
}

/** Estado del último intento de sync (meta `_hs_gateway_fee_sync`). Existe para
 *  que un fallo quede visible en el pedido y no sólo en un log efímero. */
export interface GatewaySyncStatus {
  at: string;
  ok: boolean;
  provider: Provider;
  paymentId: string | null;
  error: string | null;
  /** Cómo se resolvió el paymentId: transaction_id del pedido o búsqueda por external_reference. */
  resolvedBy: 'transaction_id' | 'external_reference' | null;
}
