// Estado de conexión de Meta — ÚNICA fuente de verdad, liviana y server-side.
// No infiere "conectado" de un summary pesado (Woo/Finance): sólo mira token +
// cuenta. Distingue disconnected (config/token/auth definitivo) de stale (había
// datos válidos y la API falló temporal) — un fallo temporal NUNCA es disconnected.

import { metaConfigured, metaAccountId, fetchAccount, META_VERSION } from './client';

export type MetaConnectionState = 'connected' | 'disconnected' | 'error' | 'stale';

export interface MetaConnection {
  state: MetaConnectionState;
  reason?: 'not_configured' | 'auth' | 'temporary';
  account: { id: string; name: string; currency: string; timezone: string } | null;
  apiVersion: string;
  lastSync: string | null;   // ISO — cuándo se leyó la cuenta con éxito
}

// Último account bueno por proceso: sólo para diferenciar stale de error. NO es
// el cache de datos (eso es Vercel Data Cache); es una pista best-effort.
let lastGoodAccount: MetaConnection['account'] = null;
let lastGoodAt: string | null = null;

/** ¿El mensaje de error de Meta es de auth/permiso DEFINITIVO (→ disconnected)
 *  o temporal (→ stale/error)? */
export function isAuthError(msg: string): boolean {
  return /token|permission|OAuth|expired|invalid|unauthorized|(^|\b)190\b/i.test(msg);
}

/** Lógica PURA de estado (sin red): dada la config y el resultado de leer la
 *  cuenta, resuelve el estado. Un fallo temporal con dato previo = stale, NUNCA
 *  disconnected. Testeable sin mocks. */
export function resolveMetaState(input: {
  configured: boolean; ok: boolean; isAuth?: boolean; hadPriorSuccess?: boolean;
}): { state: MetaConnectionState; reason?: MetaConnection['reason'] } {
  if (!input.configured) return { state: 'disconnected', reason: 'not_configured' };
  if (input.ok) return { state: 'connected' };
  if (input.isAuth) return { state: 'disconnected', reason: 'auth' };       // credenciales definitivas
  return { state: input.hadPriorSuccess ? 'stale' : 'error', reason: 'temporary' };
}

export async function getMetaConnection(force = false): Promise<MetaConnection> {
  const apiVersion = META_VERSION;
  if (!metaConfigured()) {
    return { state: 'disconnected', reason: 'not_configured', account: null, apiVersion, lastSync: null };
  }
  try {
    const acc = await fetchAccount(force ? { forceFresh: true } : {});
    const account = { id: metaAccountId(), name: acc.name, currency: acc.currency, timezone: acc.timezone };
    lastGoodAccount = account;
    lastGoodAt = new Date().toISOString();
    const { state } = resolveMetaState({ configured: true, ok: true });
    return { state, account, apiVersion, lastSync: lastGoodAt };
  } catch (e: any) {
    const { state, reason } = resolveMetaState({ configured: true, ok: false, isAuth: isAuthError(String(e?.message || e)), hadPriorSuccess: !!lastGoodAccount });
    return { state, reason, account: lastGoodAccount, apiVersion, lastSync: lastGoodAt };
  }
}

/** Para tests / UI: ¿debe mostrarse la data como usable? */
export function isUsable(state: MetaConnectionState): boolean {
  return state === 'connected' || state === 'stale';
}
