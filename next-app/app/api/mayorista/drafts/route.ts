import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

// Sin guión bajo: WC descarta en silencio los meta "protegidos" al actualizar
// un customer por REST (mismo gotcha que dni/via_cargo_sucursal en el perfil).
const DRAFTS_META_KEY = 'hy_mayorista_drafts';
const MAX_DRAFTS = 10;
const MAX_ITEMS_PER_DRAFT = 200;

interface DraftItem {
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color?: string;
  quantity: number;
}

export interface Draft {
  id: string;
  name: string;
  items: DraftItem[];
  updatedAt: string;
}

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function readDrafts(customerId: number): Promise<Draft[]> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}?_fields=meta_data`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`WC ${res.status} al leer borradores`);
  const customer = await res.json();
  const raw = ((customer.meta_data ?? []) as { key: string; value: unknown }[])
    .find((m) => m.key === DRAFTS_META_KEY)?.value;
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeDrafts(customerId: number, drafts: Draft[]): Promise<void> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      meta_data: [{ key: DRAFTS_META_KEY, value: JSON.stringify(drafts) }],
    }),
  });
  if (!res.ok) throw new Error(`WC ${res.status} al guardar borradores`);
}

function sanitizeItems(items: unknown): DraftItem[] | null {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS_PER_DRAFT) return null;
  const clean: DraftItem[] = [];
  for (const it of items) {
    if (!it || typeof it.slug !== 'string' || typeof it.size !== 'string') return null;
    const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
    const color = typeof it.color === 'string' ? it.color.trim().slice(0, 60) : '';
    clean.push({
      slug: it.slug,
      name: String(it.name ?? it.slug),
      price: Number(it.price) || 0,
      image: String(it.image ?? ''),
      size: it.size,
      ...(color ? { color } : {}),
      quantity,
    });
  }
  return clean;
}

export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    return NextResponse.json({ drafts: await readDrafts(customerId) });
  } catch (err) {
    console.error('[mayorista/drafts] GET', err);
    return NextResponse.json({ message: 'Error al cargar los borradores' }, { status: 502 });
  }
}

// Crea un borrador nuevo, o actualiza uno existente si viene `id`.
export async function POST(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const items = sanitizeItems(body.items);
    if (!items) return NextResponse.json({ message: 'El borrador está vacío' }, { status: 400 });

    const drafts = await readDrafts(customerId);
    const now = new Date().toISOString();
    const name = String(body.name ?? '').trim().slice(0, 60);

    const existing = body.id ? drafts.find((d) => d.id === body.id) : undefined;
    let draft: Draft;
    if (existing) {
      draft = { ...existing, items, updatedAt: now, ...(name ? { name } : {}) };
      drafts.splice(drafts.indexOf(existing), 1);
    } else {
      if (drafts.length >= MAX_DRAFTS) {
        return NextResponse.json(
          { message: `Podés tener hasta ${MAX_DRAFTS} borradores. Eliminá alguno para guardar uno nuevo.` },
          { status: 400 },
        );
      }
      draft = {
        id: crypto.randomUUID(),
        name: name || `Borrador ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}`,
        items,
        updatedAt: now,
      };
    }

    const next = [draft, ...drafts];
    await writeDrafts(customerId, next);
    return NextResponse.json({ draft, drafts: next });
  } catch (err) {
    console.error('[mayorista/drafts] POST', err);
    return NextResponse.json({ message: 'Error al guardar el borrador' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'Falta el id del borrador' }, { status: 400 });

  try {
    const drafts = await readDrafts(customerId);
    const next = drafts.filter((d) => d.id !== id);
    if (next.length !== drafts.length) await writeDrafts(customerId, next);
    return NextResponse.json({ drafts: next });
  } catch (err) {
    console.error('[mayorista/drafts] DELETE', err);
    return NextResponse.json({ message: 'Error al eliminar el borrador' }, { status: 502 });
  }
}
