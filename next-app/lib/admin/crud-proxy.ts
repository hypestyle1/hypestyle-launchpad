import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

// Proxy CRUD genérico hacia los CPT admin de WP (content/campaigns/collaborations).
// Misma auth (x-admin-key → X-Hypestyle-Secret server-to-server), mismo manejo de
// 404 (backend no desplegado), 409 (conflicto de concurrencia) y trash (?hard=1).
// Persistencia siempre server-side; nunca localStorage.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';
const H = { 'X-Hypestyle-Secret': WP_SECRET };

export const authed = (req: NextRequest) => adminSecretMatches(req.headers.get('x-admin-key'));
const noauth = () => NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

export async function wpList(req: NextRequest, resource: string) {
  if (!authed(req)) return noauth();
  const qs = req.nextUrl.searchParams.toString();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${resource}?${qs}&_cb=${Date.now()}`, { headers: H, cache: 'no-store' });
  if (res.status === 404) return NextResponse.json({ items: [], total: 0, notDeployed: true });
  if (!res.ok) return NextResponse.json({ error: 'WP error' }, { status: 502 });
  return NextResponse.json(await res.json());
}

export async function wpCreate(req: NextRequest, resource: string) {
  if (!authed(req)) return noauth();
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${resource}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...H }, body: JSON.stringify(body),
  });
  if (res.status === 404) return NextResponse.json({ error: 'Backend 04B (PHP 1.25.0) no desplegado.' }, { status: 501 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || 'WP error' }, { status: res.status });
  return NextResponse.json(data, { status: 201 });
}

export async function wpGet(req: NextRequest, resource: string, id: string) {
  if (!authed(req)) return noauth();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${resource}/${id}?_cb=${Date.now()}`, { headers: H, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}

export async function wpUpdate(req: NextRequest, resource: string, id: string) {
  if (!authed(req)) return noauth();
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${resource}/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...H }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  // 409 = conflicto de concurrencia (expectedUpdatedAt no coincide).
  if (!res.ok) return NextResponse.json({ error: data.message || 'WP error', conflict: res.status === 409 }, { status: res.status });
  return NextResponse.json(data);
}

export async function wpDelete(req: NextRequest, resource: string, id: string) {
  if (!authed(req)) return noauth();
  const hard = req.nextUrl.searchParams.get('hard') === '1' ? '?hard=1' : '';
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/${resource}/${id}${hard}`, { method: 'DELETE', headers: H });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.ok ? 200 : res.status });
}
