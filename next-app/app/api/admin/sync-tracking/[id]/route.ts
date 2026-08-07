import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

// Proxy del endpoint de WordPress hs/v1/sync-tracking (mu-plugin
// hypestyle-tracking-fix.php): consulta Andreani y guarda la guía en el pedido.
//
// Antes el botón "Auto-sync" de /admin/pedidos/[id] le pegaba a WordPress DIRECTO
// desde el navegador con ?key=hs2026 — o sea que la clave del endpoint quedaba en
// el JS servido a cualquiera. Ahora el navegador solo habla con esta ruta usando
// la sesión admin (x-admin-key), y el secreto compartido con WP nunca sale del
// servidor.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'orderId inválido' }, { status: 400 });
  }
  if (!WP_SECRET) {
    return NextResponse.json({ error: 'WP_SECRET no configurado' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/hs/v1/sync-tracking/${id}?key=${encodeURIComponent(WP_SECRET)}`,
      { cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    console.error('[admin/sync-tracking]', err);
    return NextResponse.json({ error: 'Error al conectar con Andreani' }, { status: 502 });
  }
}
