import { NextResponse } from 'next/server';
import { MAYORISTA_COOKIE } from '@/lib/mayorista-auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MAYORISTA_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
