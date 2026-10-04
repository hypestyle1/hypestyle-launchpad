import { NextResponse } from 'next/server';
import { PRIVATE_ACCESS_COOKIE, PRIVATE_ACCESS_FLAG_COOKIE } from '@/lib/private-access/config';

export const dynamic = 'force-dynamic';

/** POST — cierra el acceso privado en este navegador (borra las dos cookies). */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  res.cookies.set({ name: PRIVATE_ACCESS_COOKIE, value: '', path: '/', maxAge: 0 });
  res.cookies.set({ name: PRIVATE_ACCESS_FLAG_COOKIE, value: '', path: '/', maxAge: 0 });
  return res;
}
