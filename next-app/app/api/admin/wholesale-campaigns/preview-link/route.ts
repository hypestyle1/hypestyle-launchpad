import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { signPreviewToken } from '@/lib/mayorista-preview-token';

// Link para ver una campaña en borrador en el portal como si estuviera
// vigente (2 h, solo para quien tiene el link).
//   GET ?id=<campaignId> → { url }

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  const token = signPreviewToken(id);
  return NextResponse.json({ url: `${SITE_URL.replace(/\/$/, '')}/mayoristas?preview=${encodeURIComponent(token)}`, expiresInMinutes: 120 });
}
