import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * PayPal es el único método donde el cobro y el registro del cobro son dos pasos
 * separados: el cliente aprueba en paypal.com y recién después nosotros
 * capturamos. Todo lo que se rompa en ese hueco es plata cobrada que nadie
 * registra, o peor, plata aprobada que nunca se cobra — que fue exactamente lo
 * que pasó con los pedidos internacionales de julio/agosto 2026.
 *
 * Estos tests cubren las dos reglas que sostienen el flujo:
 *   1. quién decide a qué pedido de WooCommerce corresponde un pago (PayPal, vía
 *      reference_id — nunca el body de un request nuestro);
 *   2. que "ya estaba capturado" se trate como éxito y no como fallo.
 */

const TOKEN_URL   = '/v1/oauth2/token';
const ORDER_RE    = /\/v2\/checkout\/orders\/([^/]+)$/;
const CAPTURE_RE  = /\/v2\/checkout\/orders\/([^/]+)\/capture$/;

interface Routes {
  order?: (id: string) => { ok: boolean; body: any };
  capture?: (id: string) => { ok: boolean; body: any };
  authOk?: boolean;
}

function mockPayPal(routes: Routes) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    calls.push(`${init?.method || 'GET'} ${u.replace(/^https:\/\/[^/]+/, '')}`);
    if (u.includes(TOKEN_URL)) {
      return routes.authOk === false
        ? { ok: false, status: 401, text: async () => 'unauthorized', json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ access_token: 'tok' }) };
    }
    const cap = u.match(CAPTURE_RE);
    if (cap && init?.method === 'POST') {
      const r = routes.capture!(cap[1]);
      return { ok: r.ok, status: r.ok ? 201 : 422, text: async () => JSON.stringify(r.body) };
    }
    const ord = u.match(ORDER_RE);
    if (ord) {
      const r = routes.order!(ord[1]);
      return { ok: r.ok, status: r.ok ? 200 : 404, json: async () => r.body, text: async () => JSON.stringify(r.body) };
    }
    throw new Error(`URL no esperada en el test: ${u}`);
  }));
  return calls;
}

async function loadPaypalLib() {
  vi.resetModules();
  vi.stubEnv('PAYPAL_CLIENT_ID', 'id');
  vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret');
  return import('@/lib/paypal');
}

beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('paypalAccessToken', () => {
  it('falla con un mensaje propio si faltan las credenciales', async () => {
    vi.resetModules();
    vi.stubEnv('PAYPAL_CLIENT_ID', '');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', '');
    const { paypalAccessToken, paypalConfigured } = await import('@/lib/paypal');
    expect(paypalConfigured()).toBe(false);
    // Sin esto el Basic auth sale como "undefined:undefined" y PayPal contesta
    // 401 — indistinguible desde el panel de "el cliente no terminó de pagar".
    await expect(paypalAccessToken()).rejects.toThrow(/sin credenciales/i);
  });

  it('propaga el 401 de PayPal como error explícito', async () => {
    const { paypalAccessToken } = await loadPaypalLib();
    mockPayPal({ authOk: false });
    await expect(paypalAccessToken()).rejects.toThrow(/401/);
  });
});

describe('getPayPalOrder', () => {
  it('saca el pedido de WooCommerce del reference_id', async () => {
    const { getPayPalOrder } = await loadPaypalLib();
    mockPayPal({
      order: () => ({ ok: true, body: { id: 'PP-1', status: 'APPROVED', purchase_units: [{ reference_id: '2584' }] } }),
    });
    expect(await getPayPalOrder('PP-1', 'tok')).toEqual({ id: 'PP-1', status: 'APPROVED', wcOrderId: 2584 });
  });

  it('devuelve wcOrderId null si el reference_id no es un id válido', async () => {
    const { getPayPalOrder } = await loadPaypalLib();
    mockPayPal({
      order: () => ({ ok: true, body: { id: 'PP-2', status: 'APPROVED', purchase_units: [{ reference_id: 'default' }] } }),
    });
    expect((await getPayPalOrder('PP-2', 'tok'))!.wcOrderId).toBeNull();
  });

  it('devuelve null si PayPal no conoce la orden', async () => {
    const { getPayPalOrder } = await loadPaypalLib();
    mockPayPal({ order: () => ({ ok: false, body: {} }) });
    expect(await getPayPalOrder('PP-X', 'tok')).toBeNull();
  });
});

describe('capturePayPalOrder', () => {
  it('devuelve COMPLETED y el pedido cuando el cobro sale bien', async () => {
    const { capturePayPalOrder } = await loadPaypalLib();
    mockPayPal({
      capture: () => ({ ok: true, body: { status: 'COMPLETED', purchase_units: [{ reference_id: '2584' }] } }),
    });
    expect(await capturePayPalOrder('PP-1', 'tok')).toEqual({ ok: true, status: 'COMPLETED', wcOrderId: 2584 });
  });

  it('expone ORDER_ALREADY_CAPTURED como issue, no como error genérico', async () => {
    // Es el caso de un cobro que YA entró: quien llama tiene que registrarlo,
    // no reintentar ni tratarlo como pago fallido.
    const { capturePayPalOrder } = await loadPaypalLib();
    mockPayPal({
      capture: () => ({ ok: false, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } }),
    });
    expect(await capturePayPalOrder('PP-1', 'tok')).toEqual({ ok: false, error: 'ORDER_ALREADY_CAPTURED' });
  });

  it('no explota si PayPal contesta algo que no es JSON', async () => {
    const { capturePayPalOrder } = await loadPaypalLib();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, text: async () => '<html>bad gateway</html>' })));
    expect(await capturePayPalOrder('PP-1', 'tok')).toEqual({ ok: false, error: 'http 502' });
  });
});
