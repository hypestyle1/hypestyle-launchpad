import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

// Clave del panel admin. Es la misma que el resto de /admin ya usa con el header
// x-admin-key (la que el operador tipea al entrar y queda en sessionStorage), no
// un literal en el código: el secreto viejo 'hs2026' estaba hardcodeado y además
// terminaba en el bundle del cliente, así que cualquiera podía leerlo del JS
// servido y pegarle a los endpoints admin sin sesión.
//
// ADMIN_SECRET permite separar la clave del panel de WP_SECRET si algún día hace
// falta; mientras no esté seteada se usa WP_SECRET, que ya está cargado en Vercel.
export const ADMIN_SECRET = (process.env.ADMIN_SECRET || process.env.WP_SECRET || '')
  .replace(/^﻿/, '')
  .trim();

export function adminSecretMatches(provided: string | null | undefined): boolean {
  // Fail closed: sin secreto configurado no se autoriza a nadie. El patrón viejo
  // (`if (ADMIN_SECRET && key !== ADMIN_SECRET)`) dejaba el endpoint ABIERTO si la
  // variable de entorno faltaba o venía vacía.
  if (!ADMIN_SECRET || !provided) return false;
  const a = Buffer.from(ADMIN_SECRET);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAdminRequest(req: NextRequest): boolean {
  return adminSecretMatches(req.headers.get('x-admin-key'));
}

// Header listo para las llamadas server-to-server entre rutas internas
// (cancel-order → send-order-emails, abandoned-sweep → send-order-emails).
export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'x-admin-key': ADMIN_SECRET, ...(extra || {}) };
}

/* ─── Convivencia con los perfiles ────────────────────────────────────────
 * La clave compartida sigue valiendo mientras se migra: hay ~20 pantallas y
 * varias llamadas server-to-server que la usan. Un pedido autorizado es el que
 * trae la clave (acceso completo, como siempre) o una sesión de perfil válida
 * con permiso sobre la sección que está tocando.
 *
 * Cuando ya nadie use la clave para entrar a mano, se apaga y queda solo como
 * credencial de máquina. */

import { ADMIN_COOKIE, verifyAdminSession, puede, type Seccion, type AdminSession } from './admin-profiles';

export interface AdminActor {
  /** Sesión del perfil, o null si entró con la clave compartida. */
  session: AdminSession | null;
  /** true cuando vino con la clave: acceso completo, sin identidad. */
  viaSharedKey: boolean;
}

export async function resolveAdminActor(req: NextRequest): Promise<AdminActor | null> {
  if (adminSecretMatches(req.headers.get('x-admin-key'))) {
    return { session: null, viaSharedKey: true };
  }
  const session = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
  return session ? { session, viaSharedKey: false } : null;
}

/** Autoriza sobre una sección puntual. La clave compartida pasa siempre. */
export async function authorizeAdmin(req: NextRequest, seccion: Seccion): Promise<AdminActor | null> {
  const actor = await resolveAdminActor(req);
  if (!actor) return null;
  if (actor.viaSharedKey) return actor;
  return puede(actor.session!.role, seccion) ? actor : null;
}
