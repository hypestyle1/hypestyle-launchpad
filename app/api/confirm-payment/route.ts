import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();

export async function POST(req: NextRequest) {
  try {
    const { payment_id, order_id, status } = await req.json();

    if (!payment_id || !order_id || status !== 'approved') {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hypestyle-Secret': WP_SECRET,
        'Authorization': `Bearer ${WP_SECRET}`,
      },
      body: JSON.stringify({ payment_id, order_id: parseInt(String(order_id), 10) }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch (err) {
    console.error('[confirm-payment]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
