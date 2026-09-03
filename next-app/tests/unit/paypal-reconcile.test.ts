import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * La reconciliación es la red que atrapa los pagos que se caen entre la
 * aprobación en PayPal y la captura. Lo que se prueba acá es la tabla de
 * decisión, porque cada rama mueve plata:
 *
 *   COMPLETED → el dinero ya entró: marcar pagado, NO volver a capturar.
 *   APPROVED  → el cliente aprobó y la captura murió: capturar y marcar.
 *   otro      → el cliente nunca aprobó: no tocar nada.
 *
 * Y la regla de autoridad: el pedido de WooCommerce lo dice el reference_id de
 * PayPal. Si no coincide con el pedido que se está mirando, no se cobra.
 */

const SECRET = 'test-cron-secret';

interface Scenario {
  /** Pedidos pending que devuelve WooCommerce. */
  wcOrders: any[];
  /** Estado de cada orden en PayPal, por id. */
  paypal: Record<string, { status: string; reference_id?: string }>;
}

function setup(s: Scenario) {
  const captured: string[] = [];
  const wcWrites: { path: string; body: any }[] = [];

  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';

    if (u.includes('/v1/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'tok' }) };

    const cap = u.match(/\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (cap) {
      captured.push(cap[1]);
      const pp = s.paypal[cap[1]];
      return { ok: true, text: async () => JSON.stringify({ status: 'COMPLETED', purchase_units: [{ reference_id: pp.reference_id }] }) };
    }
    const ord = u.match(/\/v2\/checkout\/orders\/([^/]+)$/);
    if (ord) {
      const pp = s.paypal[ord[1]];
      if (!pp) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, json: async () => ({ id: ord[1], status: pp.status, purchase_units: [{ reference_id: pp.reference_id }] }) };
    }

    // WooCommerce
    if (u.includes('/wp-json/wc/v3/orders') && method === 'GET' && u.includes('status=pending')) {
      return { ok: true, json: async () => s.wcOrders };
    }
    if (u.includes('/wp-json/wc/v3/orders/') && method === 'GET') {
      const id = Number(u.match(/orders\/(\d+)/)![1]);
      const o = s.wcOrders.find(x => x.id === id);
      return { ok: true, json: async () => ({ ...o, line_items: [], billing: { email: 'x@y.com' }, total: '100' }) };
    }
    if (u.includes('/wp-json/wc/v3/')) {
      wcWrites.push({ path: u.split('/wp-json/wc/v3/')[1], body: JSON.parse(init?.body || '{}') });
      return { ok: true, json: async () => ({}) };
    }
    // send-confirmation
    return { ok: true, json: async () => ({ ok: true }) };
  }));

  return { captured, wcWrites };
}

async function run(query = '', live = true) {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.stubEnv('PAYPAL_RECONCILE_LIVE', live ? '1' : '');
  vi.stubEnv('PAYPAL_CLIENT_ID', 'id');
  vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret');
  vi.stubEnv('WC_CONSUMER_KEY', 'ck');
  vi.stubEnv('WC_CONSUMER_SECRET', 'cs');
  const { GET } = await import('@/app/api/paypal-reconcile/route');
  const res = await GET(new NextRequest(`https://hypestyle.com.ar/api/paypal-reconcile?secret=${SECRET}${query}`));
  return { status: res.status, body: await res.json() };
}

const pendingOrder = (id: number, paypalOrderId: string | null) => ({
  id,
  status: 'pending',
  payment_method: 'paypal',
  meta_data: paypalOrderId ? [{ key: '_paypal_order_id', value: paypalOrderId }] : [],
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('paypal-reconcile', () => {
  it('rechaza sin el CRON_SECRET', async () => {
    setup({ wcOrders: [], paypal: {} });
    vi.resetModules();
    vi.stubEnv('CRON_SECRET', SECRET);
    const { GET } = await import('@/app/api/paypal-reconcile/route');
    const res = await GET(new NextRequest('https://hypestyle.com.ar/api/paypal-reconcile'));
    expect(res.status).toBe(401);
  });

  it('captura el pago que el cliente aprobó y nunca se cobró', async () => {
    const { captured } = setup({
      wcOrders: [pendingOrder(2584, 'PP-APPROVED')],
      paypal: { 'PP-APPROVED': { status: 'APPROVED', reference_id: '2584' } },
    });
    const { body } = await run();
    expect(captured).toEqual(['PP-APPROVED']);
    expect(body.recuperadosCapturados).toEqual([2584]);
    expect(body.nuncaAprobados).toBe(0);
  });

  it('registra el pago que ya estaba cobrado sin volver a capturarlo', async () => {
    const { captured } = setup({
      wcOrders: [pendingOrder(2600, 'PP-DONE')],
      paypal: { 'PP-DONE': { status: 'COMPLETED', reference_id: '2600' } },
    });
    const { body } = await run();
    // Volver a capturar acá sería intentar cobrar dos veces.
    expect(captured).toEqual([]);
    expect(body.recuperadosYaCobrados).toEqual([2600]);
  });

  it('no toca al que nunca aprobó', async () => {
    const { captured } = setup({
      wcOrders: [pendingOrder(2601, 'PP-WAIT')],
      paypal: { 'PP-WAIT': { status: 'PAYER_ACTION_REQUIRED', reference_id: '2601' } },
    });
    const { body } = await run();
    expect(captured).toEqual([]);
    expect(body.nuncaAprobados).toBe(1);
    expect(body.recuperadosCapturados).toEqual([]);
  });

  it('no cobra si el reference_id apunta a otro pedido', async () => {
    const { captured } = setup({
      wcOrders: [pendingOrder(2602, 'PP-CRUZADO')],
      paypal: { 'PP-CRUZADO': { status: 'APPROVED', reference_id: '9999' } },
    });
    const { body } = await run();
    expect(captured).toEqual([]);
    expect(body.errores).toHaveLength(1);
    expect(body.errores[0]).toMatchObject({ wcOrderId: 2602 });
  });

  it('cuenta aparte los pendientes viejos que no tienen el id de PayPal guardado', async () => {
    setup({ wcOrders: [pendingOrder(2143, null), pendingOrder(2144, null)], paypal: {} });
    const { body } = await run();
    // Son los anteriores al 14/08/2026: no hay forma de preguntarle a PayPal por
    // ellos, hay que buscarlos a mano.
    expect(body.pendientesSinRastro).toBe(2);
    expect(body.revisados).toBe(0);
  });

  it('con dry=1 reporta pero no cobra nada', async () => {
    const { captured } = setup({
      wcOrders: [pendingOrder(2584, 'PP-APPROVED')],
      paypal: { 'PP-APPROVED': { status: 'APPROVED', reference_id: '2584' } },
    });
    const { body } = await run('&dry=1');
    expect(captured).toEqual([]);
    expect(body.dryRun).toBe(true);
    expect(body.recuperadosCapturados).toEqual([2584]);
  });

  it('sin PAYPAL_RECONCILE_LIVE no cobra, sólo informa', async () => {
    // Mergear el PR no puede alcanzar para que el cron empiece a cobrar solo.
    const { captured } = setup({
      wcOrders: [pendingOrder(2584, 'PP-APPROVED')],
      paypal: { 'PP-APPROVED': { status: 'APPROVED', reference_id: '2584' } },
    });
    const { body } = await run('', false);
    expect(captured).toEqual([]);
    expect(body.cobroAutomatico).toBe(false);
    expect(body.dryRun).toBe(true);
    expect(body.recuperadosCapturados).toEqual([2584]);
  });

  it('ignora los pendientes que no son de PayPal', async () => {
    setup({
      wcOrders: [{ id: 2700, status: 'pending', payment_method: 'bacs', meta_data: [] }],
      paypal: {},
    });
    const { body } = await run();
    expect(body.revisados).toBe(0);
    expect(body.pendientesSinRastro).toBe(0);
  });
});
