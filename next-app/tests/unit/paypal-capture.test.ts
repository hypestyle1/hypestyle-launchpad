import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * El capture pasó a aceptar el pedido de WooCommerce como OPCIONAL: la vuelta de
 * PayPal no siempre trae los query params que se esperaban, y exigirlos convertía
 * un pago aprobado en un pedido pendiente para siempre.
 *
 * Lo que NO puede aflojarse es quién decide a qué pedido corresponde el pago: eso
 * lo dice el reference_id de la orden de PayPal. El riesgo concreto es pagar un
 * pedido barato propio y hacer que se marque como pagado uno caro ajeno.
 */

function setup(paypal: Record<string, { status: string; reference_id?: string }>) {
  const captured: string[] = [];
  const fulfilled: number[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    if (u.includes('/v1/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'tok' }) };

    const cap = u.match(/\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (cap) {
      captured.push(cap[1]);
      const pp = paypal[cap[1]];
      return { ok: true, text: async () => JSON.stringify({ status: 'COMPLETED', purchase_units: [{ reference_id: pp.reference_id }] }) };
    }
    const ord = u.match(/\/v2\/checkout\/orders\/([^/]+)$/);
    if (ord) {
      const pp = paypal[ord[1]];
      if (!pp) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, json: async () => ({ id: ord[1], status: pp.status, purchase_units: [{ reference_id: pp.reference_id }] }) };
    }
    if (u.includes('/wp-json/wc/v3/orders/') && method === 'GET') {
      const id = Number(u.match(/orders\/(\d+)/)![1]);
      fulfilled.push(id);
      return { ok: true, json: async () => ({ id, status: 'pending', meta_data: [], line_items: [], billing: {}, total: '100' }) };
    }
    return { ok: true, json: async () => ({}) };
  }));
  return { captured, fulfilled };
}

async function post(body: unknown) {
  vi.resetModules();
  vi.stubEnv('PAYPAL_CLIENT_ID', 'id');
  vi.stubEnv('PAYPAL_CLIENT_SECRET', 'secret');
  vi.stubEnv('WC_CONSUMER_KEY', 'ck');
  vi.stubEnv('WC_CONSUMER_SECRET', 'cs');
  const { POST } = await import('@/app/api/paypal-capture/route');
  const res = await POST(new NextRequest('https://hypestyle.com.ar/api/paypal-capture', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  }));
  return { status: res.status, body: await res.json() };
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('paypal-capture', () => {
  it('captura aunque la vuelta no traiga el pedido: lo resuelve por reference_id', async () => {
    const { captured, fulfilled } = setup({ 'PP-1': { status: 'APPROVED', reference_id: '2584' } });
    const { status, body } = await post({ paypalOrderId: 'PP-1' });
    expect(status).toBe(200);
    expect(captured).toEqual(['PP-1']);
    expect(body.wcOrderId).toBe(2584);
    expect(fulfilled).toContain(2584);
  });

  it('sigue rechazando si el pedido declarado no es el de PayPal', async () => {
    const { captured } = setup({ 'PP-1': { status: 'APPROVED', reference_id: '2584' } });
    const { status } = await post({ paypalOrderId: 'PP-1', wcOrderId: 9999 });
    // Se verifica ANTES de capturar: no se cobra nada.
    expect(status).toBe(403);
    expect(captured).toEqual([]);
  });

  it('acepta el pedido declarado cuando coincide', async () => {
    const { captured } = setup({ 'PP-1': { status: 'APPROVED', reference_id: '2584' } });
    const { status, body } = await post({ paypalOrderId: 'PP-1', wcOrderId: 2584 });
    expect(status).toBe(200);
    expect(body.wcOrderId).toBe(2584);
    expect(captured).toEqual(['PP-1']);
  });

  it('no vuelve a capturar una orden ya cobrada, pero sí la registra', async () => {
    const { captured, fulfilled } = setup({ 'PP-1': { status: 'COMPLETED', reference_id: '2584' } });
    const { status } = await post({ paypalOrderId: 'PP-1' });
    expect(status).toBe(200);
    expect(captured).toEqual([]);
    expect(fulfilled).toContain(2584);
  });

  it('pide el paypalOrderId', async () => {
    setup({});
    const { status } = await post({ wcOrderId: 2584 });
    expect(status).toBe(400);
  });

  it('no marca nada si PayPal no conoce la orden', async () => {
    const { fulfilled } = setup({});
    const { status } = await post({ paypalOrderId: 'PP-INEXISTENTE' });
    expect(status).toBe(502);
    expect(fulfilled).toEqual([]);
  });
});
