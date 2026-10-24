import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Candados de confiabilidad de /admin/pedidos (auditoría 22/10 + verificación
 * 24/10). Lo que estos tests impiden que vuelva:
 *
 *  - un error de WooCommerce presentado como "no hay pedidos";
 *  - contadores en cero que en realidad son "no se pudo consultar";
 *  - un estado inventado ('enviado') aceptado por el panel y rechazado por WC;
 *  - la clasificación rótulo/guía duplicada en dos lugares y divergiendo;
 *  - el corte de fecha escondiendo un pedido accionable viejo;
 *  - una lista recortada por el tope de páginas haciéndose pasar por completa.
 */

vi.mock('@/lib/admin-auth', () => ({
  adminSecretMatches: (k: string | null) => k === 'clave-ok',
  ADMIN_SECRET: 'clave-ok',
  adminHeaders: () => ({ 'x-admin-key': 'clave-ok' }),
}));

import { GET as getOrders } from '@/app/api/admin/orders/route';
import { GET as getCounts } from '@/app/api/admin/orders/counts/route';
import { POST as setStatus } from '@/app/api/admin/set-status/route';
import {
  normalizeProcessingOrder, splitProcessing, anomaliasDe,
  fulfillmentStage, andreaniRefs, metaValue, MAX_PAGES,
} from '@/lib/orders-fulfillment';

const meta = (obj: Record<string, unknown>) => Object.entries(obj).map(([key, value]) => ({ key, value }));

/** Pedido crudo de WC con lo mínimo que mira el panel. */
function wcOrder(over: Partial<Record<string, any>> = {}) {
  return {
    id: 4044, number: '4044', date_created: '2026-10-22T14:08:00', date_created_gmt: '2026-10-22T17:08:00',
    status: 'processing', total: '112757.00', shipping_total: '0',
    billing: { first_name: 'Camila', last_name: 'Torres', email: 'camila@test.com', phone: '1155550000' },
    line_items: [{ name: 'Regular Tee', quantity: 1, product_id: 2950, meta_data: [] }],
    shipping_lines: [{ method_title: 'Andreani (estándar)' }],
    payment_method_title: 'MercadoPago', meta_data: [], order_key: 'wc_x', customer_note: '',
    ...over,
  };
}

type Llamada = { url: string; method: string; body?: any };
let llamadas: Llamada[] = [];
/** Cola de respuestas por patrón de URL. */
let responder: (url: string, init?: any) => any;

function wcRes(data: any, { ok = true, status = 200, total = Array.isArray(data) ? data.length : 1, pages = 1 } = {}) {
  return {
    ok, status,
    headers: new Headers({ 'X-WP-Total': String(total), 'X-WP-TotalPages': String(pages) }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

beforeEach(() => {
  llamadas = [];
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    llamadas.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : undefined });
    return responder(String(url), init);
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const reqOrders = (qs: string, key = 'clave-ok') =>
  new NextRequest(`http://localhost/api/admin/orders?${qs}`, { headers: { 'x-admin-key': key } });
const reqCounts = (key = 'clave-ok') =>
  new NextRequest('http://localhost/api/admin/orders/counts', { headers: { 'x-admin-key': key } });

/* ─────────────── 1. un error nunca es una lista vacía ─────────────── */

describe('un fallo de WooCommerce no se puede ver como "no hay pedidos"', () => {
  it('502 de WC → la ruta devuelve error, no orders: []', async () => {
    responder = () => wcRes({ message: 'boom' }, { ok: false, status: 502 });
    const res = await getOrders(reqOrders('status=processing&page=1'));
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toBeTruthy();
    expect(body.orders).toBeUndefined(); // nada que el cliente pueda confundir con "vacío"
  });

  it('una página intermedia que falla aborta: no devuelve media lista como completa', async () => {
    responder = (url) => url.includes('page=3')
      ? wcRes({}, { ok: false, status: 500 })
      : wcRes([wcOrder()], { total: 250, pages: 3 });
    const res = await getOrders(reqOrders('status=processing&page=1'));
    expect(res.status).toBe(502);
    expect((await res.json()).orders).toBeUndefined();
  });

  it('un estado que WC no conoce se rechaza con 400 y mensaje, sin pegarle a WC', async () => {
    responder = () => wcRes([]);
    const res = await getOrders(reqOrders('status=enviado&page=1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no existe/i);
    expect(llamadas).toHaveLength(0);
  });

  it('403 sin clave', async () => {
    responder = () => wcRes([]);
    expect((await getOrders(reqOrders('status=processing', 'mala'))).status).toBe(403);
  });
});

describe('contadores: cero y "no se pudo consultar" son distintos', () => {
  it('si WC falla, los contadores vienen en null y con el error, no en cero', async () => {
    responder = () => wcRes({}, { ok: false, status: 502 });
    const body = await (await getCounts(reqCounts())).json();
    expect(body.ok).toBe(false);
    expect(body.errores.length).toBeGreaterThan(0);
    expect(body.porEmpaquetar).toBeNull();
    expect(body.pendientes).toBeNull();
    expect(body.completados).toBeNull();
  });

  it('un estado que vuelve mal no arrastra a los demás (allSettled)', async () => {
    responder = (url) => url.includes('status=pending')
      ? wcRes({}, { ok: false, status: 500 })
      : wcRes([], { total: 7 });
    const body = await (await getCounts(reqCounts())).json();
    expect(body.pendientes).toBeNull();
    expect(body.errores.join(' ')).toMatch(/pendientes/);
    expect(body.fallidos).toBe(7); // los que sí respondieron conservan su número
    expect(body.ok).toBe(false);
  });

  it('cero de verdad es cero, con ok: true', async () => {
    responder = () => wcRes([], { total: 0 });
    const body = await (await getCounts(reqCounts())).json();
    expect(body.ok).toBe(true);
    expect(body.errores).toEqual([]);
    expect(body.porEmpaquetar).toBe(0);
    expect(body.pendientes).toBe(0);
  });

  it('X-WP-Total ausente es un error, no un cero', async () => {
    responder = (url) => url.includes('status=processing')
      ? wcRes([])
      : { ok: true, status: 200, headers: new Headers(), json: async () => [], text: async () => '[]' };
    const body = await (await getCounts(reqCounts())).json();
    expect(body.ok).toBe(false);
    expect(body.errores.join(' ')).toMatch(/X-WP-Total/);
  });

  it('on-hold y failed tienen contador propio (antes no existían en ningún lado)', async () => {
    responder = () => wcRes([], { total: 3 });
    const body = await (await getCounts(reqCounts())).json();
    expect(body.enEspera).toBe(3);
    expect(body.fallidos).toBe(3);
    expect(body).not.toHaveProperty('despachados'); // contaba un estado inexistente: siempre 0
  });
});

/* ─────────────── 2. el estado 'enviado' no se puede escribir ─────────────── */

describe("set-status rechaza 'enviado' antes de llegar a WooCommerce", () => {
  const req = (body: unknown) => new NextRequest('http://localhost/api/admin/set-status', {
    method: 'POST', headers: { 'x-admin-key': 'clave-ok', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('400 con mensaje claro y ni un PUT a WC', async () => {
    responder = () => wcRes({});
    const res = await setStatus(req({ orderId: 4044, status: 'enviado' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no existe en WooCommerce/);
    expect(llamadas).toHaveLength(0);
  });

  it('un estado real sí llega a WC', async () => {
    responder = () => wcRes({ status: 'completed' });
    const res = await setStatus(req({ orderId: 4044, status: 'completed' }));
    expect(res.status).toBe(200);
    expect(llamadas[0].method).toBe('PUT');
    expect(llamadas[0].body).toEqual({ status: 'completed' });
  });
});

/* ─────────────── 3. una sola clasificación ─────────────── */

describe('paridad contadores ↔ lista (la clasificación vive en un solo lugar)', () => {
  const fixture = [
    wcOrder({ id: 1, number: '1', meta_data: [] }),                                                  // sin rótulo
    wcOrder({ id: 2, number: '2', meta_data: [] }),                                                  // sin rótulo
    wcOrder({ id: 3, number: '3', meta_data: meta({ _order_andreani_pedido_id: 'abc' }) }),           // rótulo
    wcOrder({ id: 4, number: '4', meta_data: meta({ _tracking_number: '36000312345' }) }),           // guía
    wcOrder({ id: 5, number: '5', meta_data: meta({ _order_andreani_numero_interno: '#5-x', _tracking_number: '36000399' }) }), // guía gana
    wcOrder({ id: 6, number: '6', line_items: [{ name: 'Gift Card', quantity: 1, product_id: 3012, meta_data: [] }] }),         // digital
  ];

  it('los dos caminos cuentan exactamente lo mismo', async () => {
    responder = () => wcRes(fixture, { total: fixture.length });
    const lista = (await (await getOrders(reqOrders('status=processing&page=1'))).json()).orders;

    const porLista = {
      sinEmpaquetar: lista.filter((o: any) => !o.packaged && !o.digital).length,
      empaquetados:  lista.filter((o: any) => o.packaged && !o.shipped).length,
      enviados:      lista.filter((o: any) => o.shipped).length,
    };
    const porContador = splitProcessing(fixture.map(normalizeProcessingOrder));

    expect(porLista).toEqual(porContador);
    expect(porLista).toEqual({ sinEmpaquetar: 2, empaquetados: 1, enviados: 2 });
  });

  it('la lista expone el mismo `stage` que usan los contadores', async () => {
    responder = () => wcRes(fixture, { total: fixture.length });
    const lista = (await (await getOrders(reqOrders('status=processing&page=1'))).json()).orders;
    for (const o of lista) {
      expect(o.stage).toBe(fulfillmentStage(fixture.find(f => f.id === o.id)!.meta_data, fixture.find(f => f.id === o.id)!.line_items));
    }
  });

  it('metaValue/andreaniRefs ignoran valores en blanco', () => {
    expect(metaValue(meta({ _tracking_number: '   ' }), ['_tracking_number'])).toBe('');
    expect(andreaniRefs(meta({ _order_andreani_pedido_id: 'p1', _order_andreani_numero_interno: '#4-a' })))
      .toEqual({ tracking: '', rotulo: '#4-a', pedidoId: 'p1' });
  });
});

/* ─────────────── 4. corte de fecha ─────────────── */

describe('el corte de fecha no toca los estados accionables', () => {
  it('processing / pending / on-hold / failed se piden sin `after`', async () => {
    for (const status of ['processing', 'pending', 'on-hold', 'failed']) {
      llamadas = [];
      responder = () => wcRes([], { total: 0 });
      await getOrders(reqOrders(`status=${status}&page=1`));
      expect(llamadas[0].url, status).not.toMatch(/after=/);
    }
  });

  it('los terminales y "Todos" conservan el corte (son histórico, no cola)', async () => {
    for (const status of ['completed', 'cancelled', 'refunded', 'any']) {
      llamadas = [];
      responder = () => wcRes([], { total: 0 });
      await getOrders(reqOrders(`status=${status}&page=1`));
      expect(llamadas[0].url, status).toMatch(/after=2026-05-10/);
    }
  });

  it('un `after` explícito sigue respetándose', async () => {
    responder = () => wcRes([], { total: 0 });
    await getOrders(reqOrders('status=processing&page=1&after=2026-01-01T00:00:00'));
    expect(llamadas[0].url).toMatch(/after=2026-01-01/);
  });

  it('los contadores de accionables también van sin corte', async () => {
    responder = () => wcRes([], { total: 0 });
    await getCounts(reqCounts());
    const accionables = llamadas.filter(l => /status=(processing|pending|on-hold|failed)/.test(l.url));
    expect(accionables.length).toBeGreaterThanOrEqual(4);
    for (const l of accionables) expect(l.url).not.toMatch(/after=/);
  });
});

/* ─────────────── 5. carga incompleta declarada ─────────────── */

describe('una lista recortada nunca se presenta como completa', () => {
  it('pasar el tope de páginas marca parcial', async () => {
    responder = () => wcRes([wcOrder()], { total: (MAX_PAGES + 5) * 100, pages: MAX_PAGES + 5 });
    const body = await (await getOrders(reqOrders('status=processing&page=1'))).json();
    expect(body.parcial).toBe(true);
  });

  it('si WC dice que hay más de lo que juntamos, marca parcial', async () => {
    responder = () => wcRes([wcOrder()], { total: 500, pages: 2 });
    const body = await (await getOrders(reqOrders('status=processing&page=1'))).json();
    expect(body.parcial).toBe(true);
  });

  it('lista completa → parcial false', async () => {
    responder = () => wcRes([wcOrder()], { total: 1, pages: 1 });
    const body = await (await getOrders(reqOrders('status=processing&page=1'))).json();
    expect(body.parcial).toBe(false);
    expect(body.orders).toHaveLength(1);
  });

  it('un pedido repetido entre páginas no se duplica en la lista', async () => {
    responder = () => wcRes([wcOrder({ id: 77, number: '77' })], { total: 2, pages: 2 });
    const body = await (await getOrders(reqOrders('status=processing&page=1'))).json();
    expect(body.orders).toHaveLength(1);
  });
});

/* ─────────────── 6. búsqueda y cortes transversales ─────────────── */

describe('búsqueda y filtros transversales', () => {
  it('buscar un # encuentra el pedido en cualquier estado y desde cualquier tab', async () => {
    responder = (url) => url.includes('/orders/1277')
      ? wcRes(wcOrder({ id: 1277, number: '1277', status: 'completed' }))
      : wcRes([], { total: 0 });
    for (const tab of ['processing', 'pending', 'any', 'canje', 'mayorista']) {
      const body = await (await getOrders(reqOrders(`status=${tab}&page=1&search=1277`))).json();
      expect(body.orders, tab).toHaveLength(1);
      expect(body.orders[0].number, tab).toBe('1277');
    }
  });

  it('un # que no existe es una lista vacía legítima, no un error', async () => {
    responder = () => wcRes({ code: 'woocommerce_rest_shop_order_invalid_id' }, { ok: false, status: 404 });
    const res = await getOrders(reqOrders('status=processing&page=1&search=999999'));
    expect(res.status).toBe(200);
    expect((await res.json()).orders).toEqual([]);
  });

  it('mayorista se resuelve en el server sobre todas las páginas, no en una sola', async () => {
    const mayo = wcOrder({ id: 3812, number: '3812', meta_data: meta({ _es_mayorista: 'true' }) });
    responder = (url) => url.includes('page=2')
      ? wcRes([mayo], { total: 2, pages: 2 })
      : wcRes([wcOrder({ id: 1, number: '1' })], { total: 2, pages: 2 });
    const body = await (await getOrders(reqOrders('status=mayorista&page=1'))).json();
    expect(llamadas.some(l => l.url.includes('page=2'))).toBe(true); // trajo todas las páginas
    expect(body.orders.map((o: any) => o.number)).toEqual(['3812']); // y filtró por meta
  });

  it('canje son los de $0 en cualquier estado', async () => {
    responder = () => wcRes([
      wcOrder({ id: 1, number: '1', total: '0.00' }),
      wcOrder({ id: 2, number: '2', total: '25705.00' }),
    ], { total: 2 });
    const body = await (await getOrders(reqOrders('status=canje&page=1'))).json();
    expect(body.orders.map((o: any) => o.number)).toEqual(['1']);
    expect(body.total).toBe(1);
  });
});

/* ─────────────── 7. anomalías ─────────────── */

describe('anomalías: lo que no reclama ninguna cola', () => {
  it('detecta el total negativo (#2491 lleva así desde el 05/08/2026)', () => {
    const o = normalizeProcessingOrder({ id: 2491, number: '2491', total: '-3800.00', line_items: [{ product_id: 2950 }] });
    expect(anomaliasDe([o])).toEqual([{ id: 2491, number: '2491', tipo: 'total_negativo', detalle: 'total -3800' }]);
  });

  it('detecta pedidos sin productos', () => {
    const o = normalizeProcessingOrder({ id: 10, number: '10', total: '5000', line_items: [] });
    expect(anomaliasDe([o])).toEqual([{ id: 10, number: '10', tipo: 'sin_items', detalle: 'el pedido no tiene productos' }]);
  });

  it('un pedido normal no genera ruido', () => {
    const o = normalizeProcessingOrder({ id: 1, number: '1', total: '25705', line_items: [{ product_id: 2950 }] });
    expect(anomaliasDe([o])).toEqual([]);
  });

  it('los contadores publican las anomalías de la carga', async () => {
    responder = (url) => url.includes('status=processing')
      ? wcRes([wcOrder({ id: 2491, number: '2491', total: '-3800.00' })], { total: 1 })
      : wcRes([], { total: 0 });
    const body = await (await getCounts(reqCounts())).json();
    expect(body.anomalias).toEqual([{ id: 2491, number: '2491', tipo: 'total_negativo', detalle: 'total -3800' }]);
  });
});

/* ─────────────── 8. sin envío: existe y se puede ver ─────────────── */

describe('pedidos sin método de envío (canje, retiro, carga manual)', () => {
  it('la lista expone shippingMethod vacío: nunca van a tener rótulo', async () => {
    responder = () => wcRes([
      wcOrder({ id: 4034, number: '4034', shipping_lines: [] }),
      wcOrder({ id: 4044, number: '4044' }),
    ], { total: 2 });
    const orders = (await (await getOrders(reqOrders('status=processing&page=1'))).json()).orders;
    expect(orders.find((o: any) => o.number === '4034').shippingMethod).toBe('');
    expect(orders.find((o: any) => o.number === '4044').shippingMethod).toBe('Andreani (estándar)');
  });

  it('normalizeProcessingOrder cuenta los ítems y el método de envío', () => {
    const o = normalizeProcessingOrder({ id: 4034, number: '4034', total: '0', shipping_lines: [], line_items: [{ product_id: 1 }, { product_id: 2 }] });
    expect(o.shippingMethod).toBe('');
    expect(o.items).toBe(2);
  });
});
