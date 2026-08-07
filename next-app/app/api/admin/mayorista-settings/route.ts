import { NextRequest, NextResponse } from 'next/server';
import { getGlobalMinOrder, setGlobalMinOrder } from '@/lib/mayorista-settings';

const ADMIN_SECRET = process.env.WP_SECRET || '';

function authorized(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !!ADMIN_SECRET && key === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const minOrder = await getGlobalMinOrder();
  return NextResponse.json({ minOrder });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { minOrder } = await req.json();
  if (typeof minOrder !== 'number' || minOrder < 0) {
    return NextResponse.json({ message: 'minOrder inválido' }, { status: 400 });
  }
  const ok = await setGlobalMinOrder(minOrder);
  if (!ok) return NextResponse.json({ message: 'No se pudo guardar' }, { status: 502 });
  return NextResponse.json({ ok: true, minOrder });
}
