import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const cp = new URL(req.url).searchParams.get('cp') || '';
  if (!cp) return NextResponse.json({ branches: [], error: 'cp requerido' }, { status: 400 });

  try {
    const body = new URLSearchParams({ action: 'hype_andreani_branches', cp });
    const res = await fetch(`${WP_URL}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[andreani-branches]', err);
    return NextResponse.json({ branches: [], error: 'Error al obtener sucursales' }, { status: 500 });
  }
}
