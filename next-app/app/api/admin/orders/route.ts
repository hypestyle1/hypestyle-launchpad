import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { esSoloDigital, fulfillmentStage, andreaniRefs, MAX_PAGES, CONCURRENCIA, mapLimit } from '@/lib/orders-fulfillment';
import { esEstadoWcValido, esEstadoAccionable } from '@/lib/wc-order-status';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

/** Corte histórico para estados terminales y vistas transversales (performance). */
const CORTE_DEFAULT = '2026-05-10T00:00:00';

/** Filtros que no son estados de Woo: los resuelve este route. */
const FILTROS_PROPIOS = new Set(['any', 'canje', 'mayorista']);

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

// Para comparar búsquedas: minúsculas y sin tildes ("Pré" matchea "pre").
function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function mapOrder(o: any) {
  const meta = (o.meta_data as any[]) || [];
  const mv = (k: string) => meta.find((m: any) => m.key === k)?.value || '';
  // La clasificación rótulo/guía/digital sale de lib/orders-fulfillment, la misma
  // que usan los contadores, la cola POD y el Founder Brief. Antes este archivo
  // tenía su propia copia de las claves de Andreani: coincidían de casualidad y
  // el día que alguien agregara una clave en un solo lado el badge iba a decir
  // una cosa y la lista otra.
  const stage = fulfillmentStage(o.meta_data, o.line_items);
  const { tracking, rotulo, pedidoId } = andreaniRefs(o.meta_data);
  return {
    id:            o.id,
    number:        o.number,
    date:          o.date_created,
    status:        o.status,
    isMayorista:   mv('_es_mayorista') === 'true',
    customer:      {
      first_name: o.billing.first_name,
      last_name:  o.billing.last_name,
      email:      o.billing.email,
      phone:      o.billing.phone,
    },
    items: (o.line_items as any[]).map((i) => ({
      name:     i.name,
      quantity: i.quantity,
      size:     (i.meta_data as any[])?.find((m: any) =>
        ['talle', 'pa_talle', 'size', 'pa_size'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalName:   (i.meta_data as any[])?.find((m: any) =>
        ['nombre dorsal', 'player name'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalNumber: (i.meta_data as any[])?.find((m: any) =>
        ['número dorsal', 'numero dorsal', 'number'].includes((m.key || '').toLowerCase())
      )?.value || '',
    })),
    total:                parseFloat(o.total),
    shipping_total:       parseFloat(o.shipping_total),
    payment_method_title: o.payment_method_title,
    /** Título del método de envío, o '' si el pedido no tiene envío (canje, retiro, carga manual). */
    shippingMethod:       String((o.shipping_lines || [])[0]?.method_title || '').trim(),
    tracking,
    andreani:      rotulo || pedidoId,
    // Empaquetado = rótulo generado en Andreani, pero todavía sin guía real (para
    // eso hace falta pagar el envío en su portal). Enviado = ya tiene guía, prueba
    // de que entró al circuito. Tener guía NO prueba entrega: eso sólo lo sabe la
    // API de tracking de Andreani.
    packaged:      stage === 'con_rotulo' || stage === 'con_guia',
    shipped:       stage === 'con_guia',
    // Sólo gift cards: el código sale por mail, no hay nada que empaquetar.
    digital:       esSoloDigital(o.line_items),
    stage,
    notified:      String(mv('_tracking_notified')).trim(),
    order_key:     o.order_key,
    customer_note: o.customer_note || '',
  };
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const sp     = req.nextUrl.searchParams;
  const page   = sp.get('page')   || '1';
  const status = sp.get('status') || 'any';
  const search = sp.get('search') || '';

  // Un estado que WC no conoce vuelve 400 y antes salía como un 502 opaco que el
  // panel dibujaba como "No hay pedidos" (le pasaba al filtro "Enviado", un
  // estado que nunca estuvo registrado). Se corta acá con un mensaje claro.
  if (!FILTROS_PROPIOS.has(status) && !esEstadoWcValido(status)) {
    return NextResponse.json({ error: `El estado "${status}" no existe en WooCommerce` }, { status: 400 });
  }

  // El corte de fecha sólo vale para histórico. Un estado accionable es cola de
  // trabajo: si un pedido viejo revive (cambio, reclamo, repago) tiene que seguir
  // apareciendo, y nadie va a acordarse de mover la constante.
  const after = sp.get('after') ?? (esEstadoAccionable(status) ? '' : CORTE_DEFAULT);

  // Un término numérico es un # de pedido (acá number = post_id): se trae directo
  // por id, al instante y sin el search de WC, que es lento y matchea cualquier
  // campo indexado (dirección, teléfono, DNI) — buscar "3352" devolvía pedidos
  // ajenos. Encuentra el pedido sin importar el tab ni la fecha.
  const q = search.trim();
  if (/^#?\d+$/.test(q)) {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${q.replace('#', '')}?_cb=${Date.now()}`, {
      headers: { Authorization: wcAuth() },
      next:    { revalidate: 0 },
    });
    if (res.status === 404) return NextResponse.json({ orders: [], total: 0, totalPages: 1, page: 1, parcial: false });
    if (!res.ok) return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });
    return NextResponse.json({ orders: [mapOrder(await res.json())], total: 1, totalPages: 1, page: 1, parcial: false });
  }

  // Una búsqueda por texto también es global: no la limita el tab ni el corte de
  // fecha. Antes se buscaba dentro del estado del tab y con `after` puesto, así
  // que buscar a un cliente parado en "Por empaquetar" no encontraba su pedido ya
  // empaquetado, y en "Todos" no encontraba nada anterior al 10/05.
  //
  // Una sola consulta a WC con su parámetro `search` (medido en producción:
  // 1,0-1,9 s) en vez de bajar cientos de pedidos para filtrarlos acá.
  if (q) {
    const params = new URLSearchParams({
      per_page: '100', page: '1', orderby: 'date', order: 'desc',
      search: q, _cb: String(Date.now()),
    });
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() },
      next:    { revalidate: 0 },
    });
    if (!res.ok) return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });

    const raw = await res.json() as any[];
    const coincidenciasWc = parseInt(res.headers.get('X-WP-Total') || '0', 10);
    const nq = norm(q);
    // El search de WC matchea también dirección, teléfono, DNI e ítems; acá la
    // lista se limita a nombre y email del cliente.
    const orders = raw
      .filter((o) => norm(`${o.billing?.first_name || ''} ${o.billing?.last_name || ''} ${o.billing?.email || ''}`).includes(nq))
      .map(mapOrder);

    return NextResponse.json({
      orders, total: orders.length, totalPages: 1, page: 1,
      // Con más de 100 coincidencias en WC quedaron pedidos que no se miraron:
      // una lista recortada no puede verse igual que una lista completa.
      parcial: coincidenciasWc > raw.length,
      coincidenciasWc,
      revisados: raw.length,
    });
  }

  // 'canje' y 'mayorista' no son estados de Woo: son cortes transversales que se
  // resuelven acá sobre todos los estados y llegan al cliente ya filtrados.
  // 'canje' = pedidos de $0 (regalos, canjes de creadores, cargas manuales).
  // 'mayorista' = meta _es_mayorista; antes se filtraba en el cliente sobre UNA
  // página de 'any', así que un mayorista viejo simplemente no aparecía.
  const esCanje     = status === 'canje';
  const esMayorista = status === 'mayorista';
  const transversal = esCanje || esMayorista;

  const fetchPage = (p: string) => {
    const params = new URLSearchParams({
      per_page: '100',
      page:     p,
      orderby: 'date',
      order:   'desc',
      _cb:     String(Date.now()), // evita el caché de LiteSpeed en el server de WP (devuelve meta_data vieja)
      ...(after && { after }),
      ...(!FILTROS_PROPIOS.has(status) && { status }),
    });
    return fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() },
      next:    { revalidate: 0 },
    });
  };

  // Los tabs "Por empaquetar"/"Empaquetado"/"Enviado sin marcar" piden 'processing'
  // y recién filtran por rótulo/guía en el cliente. Si acá se pagina, los pedidos
  // sin empaquetar quedan dispersos entre páginas y los más viejos enterrados al
  // fondo (así se traspapelaron #3103, #3127 y #3261 durante semanas). Para
  // 'processing' y para los cortes transversales se traen TODAS las páginas.
  const paginado = status !== 'processing' && !transversal;

  const res = await fetchPage(paginado ? page : '1');

  if (!res.ok) {
    return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });
  }

  let raw          = await res.json() as any[];
  const total      = parseInt(res.headers.get('X-WP-Total')      || '0');
  let   totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
  // parcial = la lista que devolvemos no es todo lo que hay. Se declara: una
  // lista recortada y una lista completa no pueden verse igual.
  let parcial = false;

  if (!paginado && totalPages > 1) {
    const aTraer = Math.min(totalPages, MAX_PAGES);
    parcial = totalPages > MAX_PAGES;
    try {
      // De a CONCURRENCIA páginas: pedirle las 12 páginas de 'any' de una sola
      // vez hacía que WP cerrara la conexión (502 intermitente en el tab Canje).
      const resto = await mapLimit(
        Array.from({ length: aTraer - 1 }, (_, i) => String(i + 2)),
        CONCURRENCIA,
        (p) => fetchPage(p).then(r => {
          if (!r.ok) throw new Error(`WC ${r.status}`);
          return r.json() as Promise<any[]>;
        }),
      );
      raw = raw.concat(...resto);
      // Dedupe por id: si un pedido cambia de estado mientras paginamos, el
      // offset se corre y puede repetirse una fila.
      const porId = new Map<number, any>();
      for (const o of raw) porId.set(Number(o.id), o);
      raw = [...porId.values()];
      if (!parcial && raw.length < total) parcial = true;
      totalPages = 1;
    } catch {
      return NextResponse.json({ error: 'WC error al traer todas las páginas' }, { status: 502 });
    }
  }

  if (esCanje)     raw = raw.filter((o) => !(parseFloat(o.total) > 0));
  if (esMayorista) raw = raw.filter((o) => (o.meta_data || []).some((m: any) => m.key === '_es_mayorista' && m.value === 'true'));

  const orders = raw.map(mapOrder);

  return NextResponse.json({
    orders,
    // Con un corte transversal el total de WC incluye lo descartado; si entró
    // todo en una página, el conteo real es lo que queda.
    total: transversal && totalPages === 1 ? orders.length : total,
    totalPages,
    page: paginado ? parseInt(page) : 1,
    parcial,
  });
}
