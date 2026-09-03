import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * fulfillOrder es el único punto que manda la confirmación de compra de los
 * métodos asíncronos (PayPal, GOcuotas, MercadoPago vía confirm-paid). La regla
 * que se prueba: el flag `_hype_confirmation_sent` se graba SOLO si el mail
 * salió. El 02/09/2026 el flag se grababa aunque send-confirmation fallara y
 * los pedidos quedaban "confirmados" sin que nadie recibiera nada, sin rastro
 * y sin reintento posible.
 */

const FLAG = '_hype_confirmation_sent';

function setup(opts: { sendResponse: () => Promise<any> | any; status?: string; alreadySent?: boolean }) {
  const wcWrites: { method: string; path: string; body: any }[] = [];
  let sendCalls = 0;

  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';

    if (u.includes('/api/send-confirmation')) {
      sendCalls++;
      return opts.sendResponse();
    }
    if (u.includes('/wp-json/wc/v3/orders/') && method === 'GET') {
      return {
        ok: true,
        json: async () => ({
          id: 3043, number: '3043', order_key: 'wc_order_x',
          status: opts.status || 'processing',
          meta_data: opts.alreadySent ? [{ key: FLAG, value: '2026-09-03T00:00:00Z' }] : [],
          line_items: [{ name: 'Zip Hoodie Camo - M', quantity: 1, total: '100', meta_data: [] }],
          billing: { email: 'x@y.com', first_name: 'Mateo', last_name: 'P', city: 'CABA', state: 'B', country: 'AR' },
          total: '100',
        }),
      };
    }
    if (u.includes('/wp-json/wc/v3/orders/')) {
      wcWrites.push({ method, path: u.split('/wp-json/wc/v3/')[1], body: JSON.parse(init?.body || '{}') });
      return { ok: true, json: async () => ({}) };
    }
    throw new Error('fetch inesperado: ' + u);
  }));

  return { wcWrites, sendCalls: () => sendCalls };
}

async function run() {
  vi.resetModules();
  vi.stubEnv('WP_SECRET', 'secret');
  const { fulfillOrder } = await import('@/lib/order-fulfill');
  return fulfillOrder(3043, 'mercadopago');
}

const flagWrites = (w: { body: any }[]) =>
  w.filter(x => (x.body.meta_data || []).some((m: any) => m.key === FLAG));
const noteWrites = (w: { path: string }[]) => w.filter(x => x.path.endsWith('/notes'));

describe('fulfillOrder', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('graba el flag cuando el mail salió', async () => {
    const s = setup({ sendResponse: () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }) });
    const r = await run();
    expect(r).toEqual({ ok: true, reason: 'sent' });
    expect(s.sendCalls()).toBe(1);
    expect(flagWrites(s.wcWrites)).toHaveLength(1);
    expect(noteWrites(s.wcWrites)).toHaveLength(0);
  });

  it('NO graba el flag si send-confirmation responde error, y deja nota en el pedido', async () => {
    const s = setup({ sendResponse: () => ({ ok: false, status: 500, json: async () => ({ error: 'Brevo error' }) }) });
    const r = await run();
    expect(r).toEqual({ ok: false, reason: 'mail-failed' });
    expect(flagWrites(s.wcWrites)).toHaveLength(0);
    const notes = noteWrites(s.wcWrites);
    expect(notes).toHaveLength(1);
    expect(notes[0].body.note).toMatch(/NO enviado/);
    expect(notes[0].body.note).toMatch(/Brevo error/);
  });

  it('NO graba el flag si el fetch a send-confirmation explota (timeout, red)', async () => {
    const s = setup({ sendResponse: () => { throw new Error('fetch failed'); } });
    const r = await run();
    expect(r).toEqual({ ok: false, reason: 'mail-failed' });
    expect(flagWrites(s.wcWrites)).toHaveLength(0);
    expect(noteWrites(s.wcWrites)).toHaveLength(1);
  });

  it('un 200 sin ok:true en el cuerpo también cuenta como fallo', async () => {
    const s = setup({ sendResponse: () => ({ ok: true, status: 200, json: async () => ({ skipped: 'payment-pending' }) }) });
    const r = await run();
    expect(r.ok).toBe(false);
    expect(flagWrites(s.wcWrites)).toHaveLength(0);
  });

  it('con el flag ya puesto no manda nada', async () => {
    const s = setup({ alreadySent: true, sendResponse: () => ({ ok: true, json: async () => ({ ok: true }) }) });
    const r = await run();
    expect(r).toEqual({ ok: true, reason: 'already-sent' });
    expect(s.sendCalls()).toBe(0);
    expect(s.wcWrites).toHaveLength(0);
  });
});
