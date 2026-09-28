import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * /pagar/<id>: terminar de pagar un pedido que ya existe. Se le pega a la ruta
 * real y a loadRepago con Woo y Mercado Pago simulados. Lo que no puede pasar:
 *   - cobrar un pedido que ya está pagado,
 *   - distinguir "clave incorrecta" de "pedido inexistente",
 *   - cobrar una prenda que ya no hay,
 *   - cobrar un monto distinto al del pedido en Woo,
 *   - mandar un mail o crear un pedido nuevo.
 */

const KEY = 'wc_order_AbCdEf123456';
const DAY = 864e5;

function order(over: Record<string, any> = {}) {
  return {
    id: 3311, number: '3311', status: 'pending', order_key: KEY, currency: 'ARS',
    total: '112000.00', shipping_total: '12000.00', payment_method: 'gocuotas',
    date_created_gmt: new Date(Date.now() - 2 * DAY).toISOString().slice(0, 19),
    billing: { first_name: 'Mateo', email: 'x@y.com', country: 'AR' },
    meta_data: [],
    line_items: [{
      id: 1, name: 'Faith Hoodie', product_id: 2033, variation_id: 2059, quantity: 1,
      subtotal: '100000.00', total: '100000.00', meta_data: [{ key: 'talle', value: 'L' }],
    }],
    fee_lines: [], shipping_lines: [{ method_title: 'Envío a domicilio', total: '12000.00' }], coupon_lines: [],
    ...over,
  };
}

const TRANSFER_FEE = { id: 77, name: 'Transferencia (10%)', total: '-10000.00' };
const inStock = { status: 'publish', stock_status: 'instock', manage_stock: true, stock_quantity: 4 };

function setup(opts: { order?: any; variation?: any; putTotal?: string; putStatus?: string } = {}) {
  const calls: { method: string; url: string; body: any }[] = [];
  const current = opts.order === undefined ? order() : opts.order;

  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ method, url: u, body });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

    if (u.includes('api.mercadopago.com')) return json({ init_point: 'https://mp.test/pagar' }, 201);
    if (u.includes('/wc/v3/orders/') && u.includes('/notes')) return json({}, 201);
    if (u.includes('/wc/v3/orders/') && method === 'GET') return current ? json(current) : json({ code: 'not_found' }, 404);
    if (u.includes('/wc/v3/orders/') && method === 'PUT') {
      // Woo recalcula el total con el fee que se agregó o se sacó.
      let total = Number(current.total);
      const fees = [...(current.fee_lines || [])];
      for (const f of body.fee_lines || []) {
        if (f.name === null) { total -= Number(fees.find(x => x.id === f.id)?.total || 0); }
        else { total += Number(f.total); fees.push({ id: 99, ...f }); }
      }
      return json({
        ...current, ...body, status: opts.putStatus || current.status,
        fee_lines: fees.filter(f => f.name !== null), total: opts.putTotal || total.toFixed(2),
      });
    }
    if (u.includes('/variations/')) return json(opts.variation || inStock);
    if (u.includes('/wc/v3/products/')) return json({ ...inStock, id: 2033, type: 'variable', virtual: false });
    throw new Error('fetch inesperado: ' + u);
  }));

  return {
    calls,
    puts: () => calls.filter(c => c.method === 'PUT'),
    mp: () => calls.filter(c => c.url.includes('mercadopago.com')),
    notes: () => calls.filter(c => c.url.includes('/notes')),
    // Cualquier cosa que cree un pedido o mande un mail.
    forbidden: () => calls.filter(c =>
      (c.method === 'POST' && /\/wc\/v3\/orders(\?|$)/.test(c.url)) ||
      /send-confirmation|send-order-emails|brevo|wp-mail|talo/i.test(c.url)),
  };
}

async function load() {
  vi.resetModules();
  vi.stubEnv('WC_CONSUMER_KEY', 'ck_test');
  vi.stubEnv('WC_CONSUMER_SECRET', 'cs_test');
  vi.stubEnv('MP_ACCESS_TOKEN', 'mp_test');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', 'https://hypestyle.com.ar');
  return {
    lib: await import('@/lib/repago'),
    route: await import('@/app/api/pagar/[id]/route'),
  };
}

async function post(method: string, { id = '3311', key = KEY as string | null } = {}) {
  const { route } = await load();
  const req = new NextRequest(`http://localhost/api/pagar/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { cookie: `hs_pagar_${id}=${key}` } : {}) },
    body: JSON.stringify({ method }),
  });
  const res = await route.POST(req, { params: { id } });
  return { status: res.status, data: await res.json() };
}

vi.setConfig({ testTimeout: 20000 });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('un pedido no se cobra dos veces', () => {
  for (const status of ['processing', 'completed']) {
    it(`pedido ${status}: la página dice que está pagado y no ofrece pagar`, async () => {
      setup({ order: order({ status }) });
      const { lib } = await load();
      const r = await lib.loadRepago(3311, KEY);
      expect(r.ok && r.view.state).toBe('paid');
    });

    it(`pedido ${status}: el endpoint responde 409 sin tocar el pedido ni Mercado Pago`, async () => {
      const s = setup({ order: order({ status }) });
      for (const m of ['tarjeta', 'mercadopago', 'transferencia']) {
        const r = await post(m);
        expect(r.status).toBe(409);
        expect(r.data.error).toBe('paid');
      }
      expect(s.puts()).toHaveLength(0);
      expect(s.mp()).toHaveLength(0);
      expect(s.notes()).toHaveLength(0);
    });
  }

  it('pedido on-hold (pago acreditándose): no se ofrece otro cobro', async () => {
    const s = setup({ order: order({ status: 'on-hold' }) });
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('in-process');
    expect(s.mp()).toHaveLength(0);
  });

  it('si el pedido se pagó entre la lectura y el guardado, no se inicia el cobro', async () => {
    const s = setup({ putStatus: 'processing' });
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('paid');
    expect(s.mp()).toHaveLength(0);
  });

  for (const status of ['cancelled', 'refunded', 'trash']) {
    it(`pedido ${status}: no se puede pagar`, async () => {
      const s = setup({ order: order({ status }) });
      expect((await post('tarjeta')).status).toBe(409);
      expect(s.puts()).toHaveLength(0);
    });
  }
});

describe('clave incorrecta y pedido inexistente', () => {
  it('responden exactamente lo mismo, y sin tocar nada', async () => {
    const a = setup();
    const mala = await post('tarjeta', { key: 'wc_order_OtraClave99999' });
    expect(a.puts()).toHaveLength(0);
    expect(a.mp()).toHaveLength(0);

    const b = setup({ order: null });
    const inexistente = await post('tarjeta');
    expect(b.puts()).toHaveLength(0);

    expect(mala.status).toBe(404);
    expect(inexistente).toEqual(mala);
  });

  it('sin cookie: 404 y ni siquiera consulta a Woo', async () => {
    const s = setup();
    const r = await post('tarjeta', { key: null });
    expect(r.status).toBe(404);
    expect(s.calls).toHaveLength(0);
  });

  it('un id que no es un número: 404', async () => {
    const s = setup();
    expect((await post('tarjeta', { id: '33abc' })).status).toBe(404);
    expect(s.calls).toHaveLength(0);
  });

  it('la página tampoco distingue los dos casos', async () => {
    setup();
    const { lib } = await load();
    expect(await lib.loadRepago(3311, 'wc_order_OtraClave99999')).toEqual({ ok: false });
    setup({ order: null });
    expect(await lib.loadRepago(3311, KEY)).toEqual({ ok: false });
  });

  it('lo que recibe el navegador no incluye la clave ni el mail', async () => {
    setup();
    const { lib } = await load();
    const r = await lib.loadRepago(3311, KEY);
    expect(r.ok).toBe(true);
    const visible = JSON.stringify(r.ok && r.view);
    expect(visible).not.toContain(KEY);
    expect(visible).not.toContain('x@y.com');
  });

  it('la clave no se loguea ni viaja a Mercado Pago', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = setup({ putTotal: '1.00' }); // fuerza el camino que loguea
    await post('tarjeta');
    const s2 = setup();
    await post('tarjeta');
    expect(JSON.stringify([...log.mock.calls, ...err.mock.calls])).not.toContain(KEY);
    expect(JSON.stringify(s2.mp())).not.toContain(KEY);
    expect(JSON.stringify(s.notes())).not.toContain(KEY);
  });
});

describe('talle sin stock', () => {
  const agotado = { status: 'publish', stock_status: 'outofstock', manage_stock: true, stock_quantity: 0 };

  it('la página avisa qué prenda se agotó', async () => {
    setup({ variation: agotado });
    const { lib } = await load();
    const r = await lib.loadRepago(3311, KEY);
    expect(r.ok && r.view.state).toBe('payable');
    expect(r.ok && r.view.stock).toEqual([{ name: 'Faith Hoodie', size: 'L', reason: 'out-of-stock' }]);
  });

  it('el endpoint no deja pagar: 409, sin tocar el pedido ni Mercado Pago', async () => {
    const s = setup({ variation: agotado });
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('stock');
    expect(r.data.stock).toHaveLength(1);
    expect(s.puts()).toHaveLength(0);
    expect(s.mp()).toHaveLength(0);
  });

  it('pidió 2 y queda 1: tampoco se cobra', async () => {
    const o = order();
    o.line_items[0].quantity = 2;
    const s = setup({ order: o, variation: { ...inStock, stock_quantity: 1 } });
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.stock[0].reason).toBe('insufficient');
    expect(s.mp()).toHaveLength(0);
  });

  it('si Woo no responde el stock, no se cobra a ciegas', async () => {
    const s = setup();
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) =>
      String(url).includes('/variations/') ? new Response('error', { status: 500 }) : real(url, init)));
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.stock[0].reason).toBe('unknown');
    expect(s.mp()).toHaveLength(0);
  });

  it('producto variable sin talle guardado: no se cobra', async () => {
    const o = order();
    o.line_items[0].variation_id = 0;
    setup({ order: o });
    expect((await post('tarjeta')).data.stock[0].reason).toBe('no-size');
  });

  it('un regalo por compra agotado no frena el pago', async () => {
    const o = order();
    o.line_items.push({
      id: 2, name: 'Medias — Regalo por compra', product_id: 2261, variation_id: 0, quantity: 1,
      subtotal: '0.00', total: '0.00', meta_data: [{ key: '_hypestyle_purchase_gift', value: 'yes' }],
    } as any);
    const s = setup({ order: o });
    expect((await post('tarjeta')).status).toBe(200);
    expect(s.calls.some(c => c.url.includes('/products/2261'))).toBe(false);
  });
});

describe('pago del mismo pedido', () => {
  it('tarjeta: cobra el total de Woo sobre el mismo pedido y vuelve a /pagar si falla', async () => {
    const s = setup();
    const r = await post('tarjeta');
    expect(r.status).toBe(200);
    expect(r.data.redirect).toBe('https://mp.test/pagar');

    expect(s.puts()).toHaveLength(1);
    expect(s.puts()[0].body).toEqual({ payment_method: 'tarjeta', payment_method_title: 'Tarjeta de crédito / débito (MercadoPago)' });

    const pref = s.mp()[0].body;
    expect(pref.external_reference).toBe('3311');
    expect(pref.items.reduce((t: number, i: any) => t + i.unit_price * i.quantity, 0)).toBe(112000);
    expect(pref.back_urls.success).toBe('https://hypestyle.com.ar/confirmacion/?order=3311');
    expect(pref.back_urls.failure).toBe('https://hypestyle.com.ar/pagar/3311?mp=rechazado');
    expect(pref.notification_url).toMatch(/hypestyle\/v1\/mp-webhook$/);
    expect(s.forbidden()).toHaveLength(0);
  });

  it('pedido failed: también se puede pagar', async () => {
    setup({ order: order({ status: 'failed' }) });
    expect((await post('mercadopago')).status).toBe(200);
  });

  it('transferencia: agrega el 10%, deja el pedido pendiente y devuelve el CVU', async () => {
    const s = setup();
    const r = await post('transferencia');
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(102000);
    expect(r.data.account.cvu).toMatch(/^\d{22}$/);
    expect(r.data.redirect).toBeUndefined();

    const put = s.puts()[0].body;
    expect(put.payment_method).toBe('transferencia');
    expect(put.fee_lines).toEqual([{ name: 'Transferencia (10%)', total: '-10000', tax_class: '' }]);
    expect(put.status).toBeUndefined();
    expect(put.set_paid).toBeUndefined();
    expect(s.mp()).toHaveLength(0);
    expect(s.notes()).toHaveLength(1);
    expect(s.forbidden()).toHaveLength(0);
  });

  it('pedido creado con transferencia que paga con tarjeta: se saca el 10%', async () => {
    const s = setup({ order: order({ total: '102000.00', payment_method: 'talo-pay-cvu-woo', fee_lines: [TRANSFER_FEE] }) });
    const r = await post('tarjeta');
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(112000);
    expect(s.puts()[0].body.fee_lines).toEqual([{ id: 77, name: null }]);
    expect(s.mp()[0].body.items.reduce((t: number, i: any) => t + i.unit_price * i.quantity, 0)).toBe(112000);
  });

  it('elegir transferencia dos veces no descuenta dos veces', async () => {
    const s = setup({ order: order({ total: '102000.00', payment_method: 'transferencia', fee_lines: [TRANSFER_FEE] }) });
    const r = await post('transferencia');
    expect(r.data.total).toBe(102000);
    expect(s.puts()[0].body.fee_lines).toBeUndefined();
  });

  it('si Woo devuelve otro total que el mostrado, no se cobra y queda anotado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = setup({ putTotal: '95000.00' });
    const r = await post('tarjeta');
    expect(r.status).toBe(409);
    expect(r.data.error).toBe('total-mismatch');
    expect(s.mp()).toHaveLength(0);
    expect(s.notes()).toHaveLength(1);
  });

  it('medio de pago desconocido (GOcuotas, PayPal, Talo): 400', async () => {
    const s = setup();
    for (const m of ['gocuotas', 'paypal', 'talo-pay-cvu-woo', '']) expect((await post(m)).status).toBe(400);
    expect(s.calls).toHaveLength(0);
  });
});

describe('reglas del link', () => {
  it('vence a los 30 días', async () => {
    const { lib } = await load();
    const hace = (d: number) => order({ date_created_gmt: new Date(Date.now() - d * DAY).toISOString().slice(0, 19) });
    expect(lib.repagoState(hace(29))).toBe('payable');
    expect(lib.repagoState(hace(31))).toBe('expired');
  });

  it('mayoristas, pedidos del panel e internacionales quedan afuera', async () => {
    const { lib } = await load();
    expect(lib.repagoState(order({ payment_method: 'mayorista' }))).toBe('closed');
    expect(lib.repagoState(order({ meta_data: [{ key: '_es_mayorista', value: '1' }] }))).toBe('closed');
    expect(lib.repagoState(order({ payment_method: 'admin-manual' }))).toBe('closed');
    expect(lib.repagoState(order({ currency: 'USD' }))).toBe('closed');
    expect(lib.repagoState(order({ billing: { country: 'UY' } }))).toBe('closed');
  });

  it('el 10% se calcula sobre los productos, sin envío ni gift cards', async () => {
    const { lib } = await load();
    const o = order({ total: '162000.00' });
    o.line_items.push({ id: 3, name: 'Gift Card Hype', product_id: 3134, variation_id: 0, quantity: 1, subtotal: '50000.00', total: '50000.00', meta_data: [] } as any);
    const plan = lib.transferPlan(o);
    expect(plan.discount).toBe(10000);
    expect(plan.totals).toEqual({ transferencia: 152000, tarjeta: 162000, mercadopago: 162000 });
  });

  it('fee combinado con otra promo: solo transferencia y sin tocar el total', async () => {
    const { lib } = await load();
    const o = order({ total: '90000.00', fee_lines: [{ id: 5, name: '3x2 + Transferencia (10%)', total: '-22000.00' }] });
    expect(lib.transferPlan(o).methods).toEqual(['transferencia']);
    expect(lib.orderUpdateFor(o, 'tarjeta')).toBeNull();
    expect(lib.orderUpdateFor(o, 'transferencia')).toEqual({
      body: { payment_method: 'transferencia', payment_method_title: 'Transferencia bancaria (manual)' },
      expected: 90000,
    });
  });
});

describe('middleware: la clave sale de la URL antes de renderizar', () => {
  async function visit(path: string) {
    const { middleware } = await import('@/middleware');
    return middleware(new NextRequest(`https://hypestyle.com.ar${path}`));
  }

  it('pasa la clave a una cookie httpOnly y redirige a la URL limpia', async () => {
    const res = await visit(`/pagar/3311?key=${KEY}&utm_source=mail`);
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toBe('https://hypestyle.com.ar/pagar/3311?utm_source=mail');
    expect(location).not.toContain(KEY);
    const cookie = res.headers.get('set-cookie') || '';
    expect(cookie).toContain(`hs_pagar_3311=${KEY}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it('una clave con forma rara se descarta igual de la URL y no se guarda', async () => {
    const res = await visit('/pagar/3311?key=%3Cscript%3E');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://hypestyle.com.ar/pagar/3311');
    expect(res.headers.get('set-cookie') || '').not.toContain('hs_pagar_');
  });

  it('sin clave en la URL no redirige', async () => {
    const res = await visit('/pagar/3311');
    expect(res.headers.get('location')).toBeNull();
  });
});
