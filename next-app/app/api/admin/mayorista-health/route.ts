import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/mayorista-auth';

// Chequeo de salud del acceso mayorista, para /admin/mayoristas.
//
// Existe por un caso real: el login estuvo caído una semana devolviendo 500 con
// cuerpo vacío, y desde el panel se veía todo normal — los mayoristas incluso
// sumaban "ingresos" que en realidad eran intentos fallidos. Nadie se enteró
// hasta que un cliente escribió. Esto convierte ese silencio en un cartel.
//
// Se chequean las dos piezas que pueden faltar sin que nada más se rompa:
// firmar la sesión (MAYORISTA_SESSION_SECRET) y hablar con WordPress
// (WP_SECRET). No hace falta la contraseña de nadie.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const ADMIN_SECRET = process.env.WP_SECRET || '';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();

type Check = { ok: boolean; label: string; detail: string };

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const checks: Check[] = [];

  // 1) ¿Se puede firmar una sesión? Es lo que rompía el login entero.
  try {
    await createSessionToken(1);
    checks.push({ ok: true, label: 'Firma de sesión', detail: 'MAYORISTA_SESSION_SECRET configurada' });
  } catch {
    checks.push({
      ok: false,
      label: 'Firma de sesión',
      detail: 'Falta MAYORISTA_SESSION_SECRET en Vercel — nadie puede iniciar sesión aunque la contraseña sea correcta',
    });
  }

  // 2) ¿Contesta WordPress? Con credenciales falsas esperamos un 401 limpio:
  // eso prueba que la ruta existe y que WP_SECRET es el correcto. Un 401 acá es
  // la respuesta sana, no un error.
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/mayorista-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` },
      body: JSON.stringify({ username: 'hype-healthcheck-inexistente', password: 'hype-healthcheck' }),
      cache: 'no-store',
    });
    if (res.status === 401) {
      checks.push({ ok: true, label: 'Conexión con WordPress', detail: 'La ruta responde y el secreto es válido' });
    } else if (res.status === 403) {
      checks.push({ ok: false, label: 'Conexión con WordPress', detail: 'WP_SECRET rechazado por WordPress' });
    } else {
      checks.push({ ok: false, label: 'Conexión con WordPress', detail: `Respuesta inesperada (${res.status}) — revisar el mu-plugin` });
    }
  } catch {
    checks.push({ ok: false, label: 'Conexión con WordPress', detail: 'WordPress no responde' });
  }

  // 3) Mails de acceso. Que falte no tira el login abajo, pero deja al cliente
  // sin forma de recuperar la clave solo.
  checks.push(
    BREVO_API_KEY
      ? { ok: true, label: 'Mails de acceso', detail: 'BREVO_API_KEY configurada' }
      : { ok: false, label: 'Mails de acceso', detail: 'Falta BREVO_API_KEY — no salen ni la clave nueva ni el link de recuperación' },
  );

  return NextResponse.json({ ok: checks.every((c) => c.ok), checks });
}
