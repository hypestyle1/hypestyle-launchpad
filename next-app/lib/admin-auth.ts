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
