import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';

// Alta y edición de perfiles del panel. Solo 'owner': quien puede repartir
// accesos puede dárselos a sí mismo, así que es la sección más sensible.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

const wpHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${WP_SECRET}` };

export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'perfiles'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/admin-profiles`, { headers: wpHeaders, cache: 'no-store' });
  if (!res.ok) {
    console.error('[admin/perfiles] WP error:', res.status);
    return NextResponse.json({ message: 'No se pudieron leer los perfiles' }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const actor = await authorizeAdmin(req, 'perfiles');
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { email, role, name, password } = body as { email?: string; role?: string; name?: string; password?: string };

  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ message: 'Escribí un mail válido' }, { status: 400 });
  }
  // role vacío = quitarle el acceso al panel sin borrar la cuenta ni su
  // historial de ingresos.
  if (role !== '' && role !== 'owner' && role !== 'content') {
    return NextResponse.json({ message: 'Rol inválido' }, { status: 400 });
  }

  // Nadie puede quitarse a sí mismo el acceso: dejaría el panel sin dueño si es
  // el único owner, y es un error caro de deshacer.
  if (actor.session && role === '' ) {
    const yo = actor.session.id;
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/admin-profiles`, { headers: wpHeaders, cache: 'no-store' });
    if (res.ok) {
      const { profiles } = await res.json() as { profiles: { id: number; email: string }[] };
      if (profiles.find(p => p.id === yo)?.email === email) {
        return NextResponse.json({ message: 'No podés quitarte tu propio acceso' }, { status: 400 });
      }
    }
  }

  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/admin-profiles`, {
    method: 'POST',
    headers: wpHeaders,
    body: JSON.stringify({ email, role, name: name ?? '', password: password ?? '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[admin/perfiles] WP error:', res.status, data);
    return NextResponse.json({ message: (data as any)?.message || 'No se pudo guardar el perfil' }, { status: 502 });
  }
  return NextResponse.json(data);
}
