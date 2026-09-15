import type { BriefConfig } from './types';

// Umbrales del MVP. Se ajustan después de una semana de uso: si los mismos
// items aparecen todos los días, se suben los pisos; no se agregan reglas.
export const DEFAULT_CONFIG: BriefConfig = {
  floorMinARS: 50_000,
  floorRevenuePct: 0.01,
  maxItems: 5,
  maxPerDomain: 2,
  ops: {
    labelHours: 48,           // pagado y sin rótulo hace más de esto → señal
    criticalLabelHours: 120,  // el más viejo pasa esto → crítico
    labelMaxDays: 30,         // más viejo que esto no es urgencia de hoy: es un pedido sin cerrar
    pendingMinARS: 50_000,    // pendientes de pago que valen la pena perseguir
    pendingMaxHours: 120,     // transferencias y cuotas se resuelven en días; más viejo que esto ya es carrito abandonado
    pendingMinMinutes: 60,    // más nuevo que esto todavía puede estar pagando
  },
  stock: {
    topN: 10,                 // productos del ranking de 30 días que se miran
    sizesPerProduct: 4,       // S/M/L/XL en 98 de 105 variables (auditoría 30/08)
    lostDays: 7,              // horizonte de venta perdida estimada
  },
  wpUrl: (process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com').replace(/\/$/, ''),
  ads: {
    days: 3,                  // días completos hacia atrás (hoy queda afuera: Meta lo reporta parcial)
    minSpendARS: 15_000,      // gasto mínimo del conjunto en la ventana para opinar (~$5k/día)
    projectDays: 30,          // el impacto es lo que quemaría en este plazo si sigue igual
  },
};
