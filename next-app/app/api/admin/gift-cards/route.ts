import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { armarGiftCards, esGiftCardCoupon, usuariosDe } from '@/lib/gift-cards-admin';

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();

const ORDER_FIELDS = 'id,number,status,date_created,billing,coupon_lines,meta_data';

// _cb saltea el caché de LiteSpeed del server de WP, que devuelve meta vieja
// (el saldo de una tarjeta recién usada).
async function wc(path: string): Promise<any[]> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}&_cb=${Date.now()}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64') },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`WC ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Gift cards emitidas, con su saldo y los pedidos donde se usaron.
export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const coupons: any[] = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await wc(`coupons?per_page=100&page=${page}`);
      coupons.push(...batch.filter(esGiftCardCoupon));
      if (batch.length < 100) break;
    }

    const origenIds = [...new Set(
      coupons
        .map((c) => Number((c.meta_data || []).find((m: any) => m.key === '_hs_gift_order')?.value))
        .filter((n) => Number.isFinite(n) && n > 0),
    )];
    const origenes = origenIds.length
      ? await wc(`orders?include=${origenIds.join(',')}&per_page=100&status=any&_fields=${ORDER_FIELDS}`)
      : [];

    // De a uno: WC responde 500 si se le pega en paralelo.
    const candidatos: any[] = [];
    for (const u of usuariosDe(coupons)) {
      const filtro = /^\d+$/.test(u) ? `customer=${u}` : `search=${encodeURIComponent(u)}`;
      candidatos.push(...await wc(`orders?${filtro}&per_page=100&status=any&_fields=${ORDER_FIELDS}`));
    }

    const cards = armarGiftCards(coupons, origenes, candidatos);
    return NextResponse.json({
      cards,
      totales: {
        emitidas: cards.length,
        sinUsar: cards.filter((c) => c.estado === 'sin_usar').length,
        montoEmitido: cards.reduce((s, c) => s + c.inicial, 0),
        // Lo que todavía se puede canjear: las vencidas ya no cuentan.
        saldoVigente: cards.filter((c) => c.estado !== 'vencida').reduce((s, c) => s + c.saldo, 0),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al leer las gift cards' }, { status: 502 });
  }
}
