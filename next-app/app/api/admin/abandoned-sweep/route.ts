import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY    = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC    = process.env.WC_CONSUMER_SECRET || '';
const SECRET    = process.env.CRON_SECRET || 'hs2026';
const MAIL_SECRET = 'hs2026';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// Primer mail de la secuencia: pedidos pending/failed con entre MIN y MAX horas de antigüedad,
// que no se les haya enviado todavía (_hs_abandoned_sent). La ventana evita blastear backlog viejo.
const MIN_HOURS = 3;
const MAX_HOURS = 72;

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 19);

async function eligible(status: string) {
  const after  = iso(MAX_HOURS * 3600_000); // no más viejos que MAX
  const before = iso(MIN_HOURS * 3600_000); // ya pasaron MIN horas
  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?status=${status}&per_page=100&after=${after}&before=${before}&_fields=id,number,billing,meta_data,date_created`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as any[];
  return data.filter(o =>
    (o.billing?.email || '') &&
    !(o.meta_data || []).some((m: any) => m.key === '_hs_abandoned_sent' && String(m.value).trim())
  );
}

export async function GET(req: NextRequest) {
  // Acepta: ?secret=, header x-cron-secret, o el Bearer que Vercel Cron manda con CRON_SECRET.
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (provided !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Interruptor: no manda nada hasta que se setee ABANDONED_ENABLED=true en Vercel.
  // (En pausa hasta arreglar la entregabilidad de Brevo, así no se queman los envíos.)
  if (process.env.ABANDONED_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, disabled: true, message: 'Carrito abandonado en pausa (setear ABANDONED_ENABLED=true para activar).' });
  }

  const orders = [...await eligible('pending'), ...await eligible('failed')];
  const origin = req.nextUrl.origin;

  // Dedup POR CLIENTE: un cliente con varios pedidos sin pagar (ej: 5 reintentos) recibe UN solo mail.
  // Se le manda por el pedido más reciente y se marcan TODOS sus pedidos como enviados.
  const byEmail = new Map<string, any[]>();
  for (const o of orders) {
    const email = (o.billing?.email || '').toLowerCase().trim();
    if (!email) continue;
    let arr = byEmail.get(email);
    if (!arr) { arr = []; byEmail.set(email, arr); }
    arr.push(o);
  }

  const sent: any[] = [];
  for (const [email, group] of byEmail) {
    group.sort((a, b) => String(b.date_created || '').localeCompare(String(a.date_created || '')));
    const rep = group[0]; // el más reciente representa al cliente
    try {
      const mail = await fetch(
        `${origin}/api/admin/send-order-emails?secret=${MAIL_SECRET}&order_id=${rep.id}&action=abandoned`,
        { cache: 'no-store' }
      ).then(r => r.json());
      if (mail?.ok) {
        for (const o of group) {
          await fetch(`${WP_URL}/wp-json/wc/v3/orders/${o.id}`, {
            method: 'PUT',
            headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ meta_data: [{ key: '_hs_abandoned_sent', value: new Date().toISOString() }] }),
          });
        }
        sent.push({ email, enviado_por: rep.number, pedidos_marcados: group.map(o => o.number) });
      }
    } catch { /* sigue con el resto */ }
  }

  return NextResponse.json({ ok: true, candidatos: orders.length, clientes: byEmail.size, enviados: sent.length, detalle: sent });
}
