// Forma de la respuesta de /api/admin/analytics/summary. Vive acá (y no en el
// route) para que la página la importe sin tocar el módulo del handler.

import type { GaReport } from './reports';
import type { PautaJoin } from './join';

export interface AnalyticsSummaryResponse {
  connected: boolean;
  reason?: 'not_configured';
  propertyId?: string;
  range?: { since: string; until: string };
  report?: GaReport;
  /** Usuarios activos en los últimos 30 min; null si el realtime falló. */
  realtimeUsers?: number | null;
  /** Cruce con Meta; null si Meta no está conectado. */
  pauta?: PautaJoin | null;
  metaConnected?: boolean;
  lastUpdated?: string;
  error?: string;
  detail?: string;
}
