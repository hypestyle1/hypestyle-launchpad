import type { FinanceConfig, FeeRule, Provider } from './types';

// Config financiera por defecto. Es SÓLO el fallback inicial hasta que la config
// editable (WP option hs_finance_config, vía hypestyle/v1/finance-config) esté
// desplegada y cargada. NO están desperdigados: viven acá, en una sola fuente,
// y se sobreescriben con lo que el operador configure en Finanzas → Configuración.
//
// Los porcentajes son estimaciones iniciales razonables de plaza (AR, 2026) y
// están marcados como 'configured' en toda la UI. Ajustables sin tocar código
// una vez conectada la persistencia.

const rule = (provider: Provider, percent: number, fixed = 0): FeeRule => ({
  id: `default_${provider}`,
  provider, percent, fixed,
  from: '2026-01-01',
  to: null,
});

export const DEFAULT_FINANCE_CONFIG: FinanceConfig = {
  feeRules: [
    rule('mercadopago_card', 0.0499),   // tarjeta — se reemplaza por el fee EXACTO cuando hay snapshot
    rule('mercadopago_wallet', 0.0299), // dinero en cuenta / wallet
    rule('gocuotas', 0.06),             // cuotas — placeholder hasta fuente exacta
    rule('talo', 0.0),                  // transferencia CVU — 0% explícito (configured), no asumido
    rule('paypal', 0.054, 0),           // internacional
    rule('manual', 0.0),                // cargado a mano — sin fee
    rule('mayorista', 0.0),             // suele ser transferencia — sin fee
    rule('other', 0.0),
  ],
  variableCosts: [
    // Vacío por defecto: el operador agrega packaging/bolsa/etc. en Configuración.
  ],
  shipping: { flatRealCost: null },
};

/** Mezcla la config guardada con los defaults (para tolerar configs parciales). */
export function mergeFinanceConfig(saved: Partial<FinanceConfig> | null | undefined): FinanceConfig {
  if (!saved) return DEFAULT_FINANCE_CONFIG;
  return {
    feeRules: Array.isArray(saved.feeRules) && saved.feeRules.length ? saved.feeRules : DEFAULT_FINANCE_CONFIG.feeRules,
    variableCosts: Array.isArray(saved.variableCosts) ? saved.variableCosts : DEFAULT_FINANCE_CONFIG.variableCosts,
    shipping: { ...DEFAULT_FINANCE_CONFIG.shipping, ...(saved.shipping || {}) },
  };
}
