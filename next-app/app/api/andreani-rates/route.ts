import { NextRequest, NextResponse } from 'next/server';
import { normalizeCpAr } from '@/lib/postal-code';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Mismo criterio que /api/andreani-branches: el tarifario espera 4 dígitos.
  const cp       = normalizeCpAr(searchParams.get('cp'));
  const provincia = searchParams.get('provincia') || '';
  const valor    = searchParams.get('valor') || '10000';
  const peso     = searchParams.get('peso') || '0.5';

  if (!cp) return NextResponse.json({ error: 'cp requerido' }, { status: 400 });

  try {
    const body = new URLSearchParams({
      action: 'hype_shipping_rates',
      cp, provincia, valor, peso,
    });
    const res = await fetch(`${WP_URL}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[andreani-rates]', err);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}
