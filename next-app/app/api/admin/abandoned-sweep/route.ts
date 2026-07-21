import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY    = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC    = process.env.WC_CONSUMER_SECRET || '';
const SECRET    = process.env.CRON_SECRET || 'hs2026';
const MAIL_SECRET = 'hs2026';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

// Secuencia de 3 mails: 3h (aviso original), 24h (recordatorio), 72h (último aviso).
// La ventana MIN-MAX evita blastear backlog viejo al traer los pedidos elegibles;
// qué paso corresponde mandarle a cada uno se decide en JS con STEP_HOURS.
const MIN_HOURS = 3;
const MAX_HOURS = 96; // margen sobre el último paso (72h) para no perder pedidos por el desfasaje del cron horario
const STEP_HOURS = [3, 24, 72]; // horas de antigüedad requeridas para step 1, 2, 3

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
  return data.filter(o => (o.billing?.email || ''));
}

// Step ya mandado para este pedido. Compatibilidad con el flag viejo _hs_abandoned_sent
// (mails mandados antes de que existiera la secuencia): cuenta como step 1 ya enviado.
function lastStepSent(order: any): number {
  const meta = order.meta_data || [];
  const stepMeta = meta.find((m: any) => m.key === '_hs_abandoned_step');
  if (stepMeta) return parseInt(String(stepMeta.value), 10) || 0;
  const legacySent = meta.some((m: any) => m.key === '_hs_abandoned_sent' && String(m.value).trim());
  return legacySent ? 1 : 0;
}

// Próximo paso a mandar (nunca salta pasos), o null si todavía no toca o ya se mandaron los 3.
function dueStep(order: any): number | null {
  const last = lastStepSent(order);
  if (last >= 3) return null;
  const next = last + 1;
  const ageHours = (Date.now() - new Date(order.date_created).getTime()) / 3600_000;
  return ageHours >= STEP_HOURS[next - 1] ? next : null;
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
    const step = dueStep(rep);
    if (step === null) continue; // todavía no toca el próximo paso (o ya se mandaron los 3)
    try {
      const mail = await fetch(
        `${origin}/api/admin/send-order-emails?secret=${MAIL_SECRET}&order_id=${rep.id}&action=abandoned&step=${step}`,
        { cache: 'no-store' }
      ).then(r => r.json());
      if (mail?.ok) {
        for (const o of group) {
          await fetch(`${WP_URL}/wp-json/wc/v3/orders/${o.id}`, {
            method: 'PUT',
            headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ meta_data: [
              { key: '_hs_abandoned_step', value: String(step) },
              { key: '_hs_abandoned_sent', value: new Date().toISOString() },
            ] }),
          });
        }
        sent.push({ email, step, enviado_por: rep.number, pedidos_marcados: group.map(o => o.number) });
      }
    } catch { /* sigue con el resto */ }
  }

  return NextResponse.json({ ok: true, candidatos: orders.length, clientes: byEmail.size, enviados: sent.length, detalle: sent });
}
