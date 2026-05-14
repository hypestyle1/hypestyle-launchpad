import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET, 'Authorization': `Bearer ${WP_SECRET}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[create-order proxy]', err);
    return NextResponse.json({ message: 'Error al conectar con WooCommerce' }, { status: 500 });
  }
}
