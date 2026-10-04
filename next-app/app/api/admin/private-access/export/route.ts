import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { membersToCsv } from '@/lib/private-access/import';
import { wpGet } from '@/lib/private-access/store';
import { wpError } from '@/lib/private-access/admin';

export const dynamic = 'force-dynamic';

/** GET → CSV con todos los miembros (descarga). */
export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const r = await wpGet<{ members: any[] }>('/members/export');
  if (r.ok === false) return wpError(r);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + membersToCsv(r.data.members), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mejores-amigos-${day}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
