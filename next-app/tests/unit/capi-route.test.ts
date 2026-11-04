import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Allowlist de /api/capi — la mitad server-side de los eventos de Meta.
 *
 * Por qué este archivo existe: el `Lead` del registro de CYBER HYPE salía por
 * el pixel del browser y por CAPI con el mismo `event_id`, pero `Lead` no
 * estaba en la allowlist de la ruta. La mitad server-side moría acá con un 400
 * que `sendCapi` se traga en silencio (es medición: nunca propaga errores), así
 * que no había forma de notarlo hasta mirar Events Manager. Justo la mitad que
 * no se puede bloquear — la que existe porque el audit del 14/08/2026 midió 43
 * InitiateCheckout del pixel contra 150 pedidos en Woo.
 *
 * Un test sobre la allowlist es barato y cubre los cuatro eventos a la vez.
 */

const GRAPH = 'https://graph.facebook.com';

let llamadas: string[] = [];

beforeEach(() => {
  llamadas = [];
  process.env.META_CAPI_TOKEN = 'test-token';
  vi.stubGlobal('fetch', vi.fn(async (url: any) => {
    llamadas.push(String(url));
    return { ok: true, text: async () => '', json: async () => ({}) };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function post(body: any) {
  const { POST } = await import('@/app/api/capi/route');
  const req = new NextRequest('http://localhost/api/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req);
}

const evento = (event_name: string) => ({
  event_name,
  event_id: 'abc-123',
  // El gate por host: solo el dominio real. Un preview de Vercel o los e2e no
  // le mandan nada al pixel de producción (audit del 17/09/2026).
  event_source_url: 'https://hypestyle.com.ar/cyberhype',
  custom_data: { content_name: 'cyber-hype', value: 0, currency: 'ARS' },
});

describe('allowlist de /api/capi', () => {
  it('deja pasar los seis eventos del embudo, ViewContent y AddToCart incluidos', async () => {
    for (const name of ['ViewContent', 'AddToCart', 'InitiateCheckout', 'AddPaymentInfo', 'CompleteRegistration', 'Lead']) {
      llamadas = [];
      const res = await post(evento(name));
      expect(res.status, name).toBe(200);
      expect(llamadas.some((u) => u.startsWith(GRAPH)), name).toBe(true);
    }
  });

  it('Purchase sigue afuera: ese sale de WooCommerce con el pago confirmado', async () => {
    const res = await post(evento('Purchase'));
    expect(res.status).toBe(400);
    expect(llamadas.length).toBe(0);
  });

  it('un evento inventado no llega al pixel', async () => {
    const res = await post(evento('CualquierCosa'));
    expect(res.status).toBe(400);
    expect(llamadas.length).toBe(0);
  });

  it('el Lead viaja con el event_id del browser: sin él, Meta contaría dos', async () => {
    const res = await post({ ...evento('Lead'), event_id: undefined });
    expect(res.status).toBe(400);
    expect(llamadas.length).toBe(0);
  });

  it('el Lead de un preview o de localhost no llega al pixel de producción', async () => {
    for (const url of ['https://next-app-git-abc.vercel.app/cyberhype', 'http://127.0.0.1:3100/cyberhype']) {
      llamadas = [];
      const res = await post({ ...evento('Lead'), event_source_url: url });
      expect(res.status, url).toBe(204);
      expect(llamadas.length, url).toBe(0);
    }
  });
});
