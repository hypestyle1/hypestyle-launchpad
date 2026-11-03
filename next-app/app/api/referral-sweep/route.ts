import { NextResponse } from 'next/server';

// Barrido diario del programa de referidos, disparado por el cron de Vercel
// (ver vercel.json). Es la tercera pata de la emisión del premio: aunque
// WP-Cron y Action Scheduler fallen, esto emite lo vencido y manda los
// recordatorios de vencimiento. El endpoint del PHP es idempotente.

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function GET() {
  if (!WP_SECRET) return NextResponse.json({ error: 'WP_SECRET no configurado' }, { status: 500 });
  try {
    const r = await fetch(`${WP_URL}/wp-json/hypestyle/v1/referral-sweep`, {
      method: 'POST',
      headers: {
        'X-Hypestyle-Secret': WP_SECRET,
        'Authorization': `Bearer ${WP_SECRET}`,
      },
      cache: 'no-store',
      // El WP de Hostinger puede tardar: margen amplio, corre sin nadie esperando.
      signal: AbortSignal.timeout(120000),
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: 'Sin conexión con el servidor' }, { status: 502 });
  }
}
