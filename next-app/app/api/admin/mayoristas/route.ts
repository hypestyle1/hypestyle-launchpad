import { NextRequest, NextResponse } from 'next/server';
import { statusFromMeta } from '@/lib/mayorista-account';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

async function wcFetch(path: string, intentos = 3) {
  let ultimo: Response | null = null;
  for (let i = 0; i < intentos; i++) {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    if (res.ok || res.status < 500) return res;
    ultimo = res;
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  return ultimo as Response;
}

/* ─── Qué cuenta como gastado ─────────────────────────────────────────────
   Lista blanca, no negra. Antes se excluían cancelled/failed/refunded/trash
   y entraba todo lo demás, así que 'pending' y 'on-hold' —pedidos hechos y
   nunca pagados— sumaban al total gastado. En la tienda eso son 231 pedidos
   por unos $28 millones que jamás se cobraron. */
const PAGADOS   = ['completed', 'processing'];
const SIN_PAGAR = ['pending', 'on-hold'];

function metaVal(meta: any[], key: string): string {
  return meta?.find((m: any) => m.key === key)?.value ?? '';
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // WC REST no filtra customers por meta_data — traemos todos (paginado) y
  // nos quedamos con los que pasaron alguna vez por el alta mayorista.
  const all: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await wcFetch(`customers?per_page=100&page=${page}&_fields=id,email,first_name,last_name,billing,date_created,meta_data`);
    if (!res.ok) break;
    const batch = await res.json() as any[];
    all.push(...batch);
    if (batch.length < 100) break;
  }

  const mayoristas = all.filter(c => (c.meta_data ?? []).some((m: any) => m.key === 'es_mayorista'));

  /* Una consulta por cliente significaba 38 pedidos simultáneos a WordPress,
     que respondía 500 a la mitad. Cada fallo se descartaba en silencio y ese
     cliente aparecía en cero, así que los totales del panel cambiaban en cada
     recarga. Ahora se traen los pedidos en tandas paginadas y se agrupan en
     memoria: menos consultas, en serie, y el mismo resultado siempre. */
  const estados = [...PAGADOS, ...SIN_PAGAR].join(',');
  const porCliente = new Map<number, { pagados: any[]; sinPagar: any[] }>();
  let incompleto = false;

  for (let page = 1; page <= 30; page++) {
    const res = await wcFetch(`orders?status=${estados}&per_page=100&page=${page}&orderby=date&order=desc&_fields=id,status,total,date_created,customer_id`);
    if (!res?.ok) { incompleto = true; break; }
    const batch = await res.json() as any[];
    for (const o of batch) {
      const cid = Number(o.customer_id);
      if (!cid) continue; // pedido de invitado: no cuelga de ninguna cuenta
      if (!porCliente.has(cid)) porCliente.set(cid, { pagados: [], sinPagar: [] });
      const bucket = porCliente.get(cid)!;
      if (PAGADOS.includes(o.status)) bucket.pagados.push(o);
      else bucket.sinPagar.push(o);
    }
    if (batch.length < 100) break;
  }

  const withStats = mayoristas.map((c) => {
    const meta = c.meta_data ?? [];
    const suyos = porCliente.get(Number(c.id)) ?? { pagados: [], sinPagar: [] };
    const suma = (list: any[]) => list.reduce((t, o) => t + parseFloat(o.total || '0'), 0);

    const orderCount = suyos.pagados.length;
    const totalSpent = suma(suyos.pagados);
    // Los pedidos hechos y nunca pagados se muestran aparte en vez de
    // desaparecer: es plata a la que se le puede ir a buscar.
    const pendingCount = suyos.sinPagar.length;
    const pendingTotal = suma(suyos.sinPagar);
    const lastOrderAt: string | null = suyos.pagados[0]?.date_created ?? null;

    return {
      id: c.id,
      email: c.email,
      name: `${c.first_name} ${c.last_name}`.trim(),
      company: c.billing?.company || '',
      phone: c.billing?.phone || '',
      city: c.billing?.city || '',
      minOrderOverride: metaVal(meta, 'mayorista_min_order') || null,
      // 'active' se conserva para no romper nada que ya lo lea; 'status' es el
      // que distingue una solicitud pendiente de un acceso revocado — antes
      // ambas caían en el mismo 'false'.
      active: metaVal(meta, 'es_mayorista') === 'yes',
      status: statusFromMeta(metaVal(meta, 'es_mayorista')),
      cuit: metaVal(meta, 'mayorista_cuit'),
      instagram: metaVal(meta, 'mayorista_instagram'),
      localFisico: metaVal(meta, 'mayorista_local_fisico') === 'yes',
      modalidad: metaVal(meta, 'mayorista_modalidad'),
      solicitadoEl: metaVal(meta, 'mayorista_solicitud_fecha') || null,
      aprobadoEl: metaVal(meta, 'mayorista_aprobado_fecha') || null,
      // Origen de la solicitud (lo guarda /api/mayorista/solicitud desde el
      // formulario). 'meta' cuando vino de un ad; vacío = orgánico o directo.
      origen: {
        source: metaVal(meta, 'mayorista_utm_source') || null,
        medium: metaVal(meta, 'mayorista_utm_medium') || null,
        campaign: metaVal(meta, 'mayorista_utm_campaign') || null,
        content: metaVal(meta, 'mayorista_utm_content') || null,
        fbclid: Boolean(metaVal(meta, 'mayorista_fbclid')),
        referrer: metaVal(meta, 'mayorista_referrer') || null,
      },
      createdAt: c.date_created,
      orderCount,
      totalSpent,
      pendingCount,
      pendingTotal,
      lastOrderAt,
      lastLogin: metaVal(meta, 'mayorista_last_login') || null,
      loginCount: Number(metaVal(meta, 'mayorista_login_count')) || 0,
    };
  });

  withStats.sort((a, b) => b.totalSpent - a.totalSpent);

  // Si alguna página de pedidos falló, se dice. Antes los huecos se veían
  // igual que un cliente que nunca compró, y no había forma de distinguirlos.
  return NextResponse.json({ mayoristas: withStats, incompleto });
}
