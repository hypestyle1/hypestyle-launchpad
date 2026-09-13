// Estado de conexión de GA4 — liviano y server-side, espejo de meta/connection.
// Sólo mira credenciales + propiedad; nunca infiere "conectado" de un reporte
// pesado. Un fallo temporal con dato previo NUNCA es disconnected.

import { ga4Configured, ga4PropertyId, fetchPropertyMetadata } from './client';
import { resolveMetaState, type MetaConnectionState } from '@/lib/meta/connection';

export type Ga4ConnectionState = MetaConnectionState;

export interface Ga4Connection {
  state: Ga4ConnectionState;
  reason?: 'not_configured' | 'auth' | 'temporary';
  propertyId: string | null;
  lastSync: string | null;
}

let lastGoodAt: string | null = null;

/** Errores definitivos de credencial/permiso de Google (→ disconnected). */
export function isGa4AuthError(msg: string): boolean {
  return /PERMISSION_DENIED|UNAUTHENTICATED|invalid_grant|invalid_client|does not have sufficient permissions|not configured|ga4 auth|ga4 40[13]/i.test(msg);
}

export async function getGa4Connection(force = false): Promise<Ga4Connection> {
  const propertyId = ga4PropertyId() || null;
  if (!ga4Configured()) {
    return { state: 'disconnected', reason: 'not_configured', propertyId, lastSync: null };
  }
  try {
    await fetchPropertyMetadata(force);
    lastGoodAt = new Date().toISOString();
    return { state: 'connected', propertyId, lastSync: lastGoodAt };
  } catch (e: any) {
    const { state, reason } = resolveMetaState({ configured: true, ok: false, isAuth: isGa4AuthError(String(e?.message || e)), hadPriorSuccess: !!lastGoodAt });
    return { state, reason, propertyId, lastSync: lastGoodAt };
  }
}
