import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

// Referencias para los selectores del drawer: responsables (admin-profiles) y
// creadores (CPT existente). Reusa las fuentes reales — no duplica identidades.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';
export const dynamic = 'force-dynamic';

async function wp(path: string) {
  try {
    const r = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${path}?_cb=${Date.now()}`, { headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store' });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const [profiles, creators, campaigns] = await Promise.all([wp('admin-profiles'), wp('creadores'), wp('campaigns')]);
  const responsibles = Array.isArray(profiles?.profiles)
    ? profiles.profiles.map((p: any) => ({ id: String(p.id ?? p.username ?? p.email ?? ''), name: p.name || p.username || p.email || 'Perfil' }))
    : [];
  const creatorList = Array.isArray(creators?.creadores)
    ? creators.creadores.filter((c: any) => (c.estado === 'aprobado' || c.estado === 'potencial')).slice(0, 200).map((c: any) => ({ id: String(c.id), name: c.nombre || c.instagram || `#${c.id}` }))
    : [];
  // Campañas activas primero (04B). Si el backend 1.25.0 no está desplegado, viene vacío.
  const campaignList = Array.isArray(campaigns?.items)
    ? campaigns.items.filter((c: any) => !c.archived).slice(0, 200).map((c: any) => ({ id: String(c.id), name: c.name || `#${c.id}`, status: c.status }))
    : [];
  return NextResponse.json({ responsibles, creators: creatorList, campaigns: campaignList });
}
