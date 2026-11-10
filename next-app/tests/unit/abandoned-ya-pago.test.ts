import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { pagoDeLaMismaPersona, type PedidoPersona } from '@/lib/abandoned-ya-pago';

/**
 * El mail de carrito abandonado no le escribe a quien ya compró por otro lado.
 * Caso real del Cyber 2026: #4308/#4309/#4310 fallaron por GOcuotas y la misma
 * persona pagó #4311 minutos después; #4369 falló y pagó por transferencia (#4371).
 */

const fallido = (extra: Partial<PedidoPersona> = {}): PedidoPersona => ({
  id: 4308, number: '4308', status: 'failed', date_created: '2026-11-04T19:42:00',
  billing: { email: 'gonza@example.com', phone: '5493856402648' },
  meta_data: [{ key: '_billing_dni', value: '40111222' }],
  ...extra,
});
const pagado = (extra: Partial<PedidoPersona> = {}): PedidoPersona => ({
  id: 4311, number: '4311', status: 'processing', date_created: '2026-11-04T19:51:00',
  billing: { email: 'otro@example.com', phone: '' }, meta_data: [],
  ...extra,
});

describe('pagoDeLaMismaPersona', () => {
  it('mismo mail', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ billing: { email: 'GONZA@example.com ' } })])?.id).toBe(4311);
  });
  it('mismo teléfono escrito distinto (0385 15… contra 549385…)', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ billing: { email: 'x@y.com', phone: '0385 15 640-2648' } })])?.id).toBe(4311);
  });
  it('mismo DNI con otro mail y otro teléfono', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ meta_data: [{ key: '_billing_dni', value: '40.111.222' }] })])?.id).toBe(4311);
  });
  it('transferencia en revisión (on-hold) cuenta como pagado', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ status: 'on-hold', billing: { email: 'gonza@example.com' } })])).not.toBeNull();
  });
  it('otra persona → null', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado()])).toBeNull();
  });
  it('un pago de un día anterior no cuenta: es otra compra, el carrito nuevo sí quedó abandonado', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ date_created: '2026-11-03T10:00:00', billing: { email: 'gonza@example.com' } })])).toBeNull();
  });
  it('un pedido que no está pagado no cuenta', () => {
    expect(pagoDeLaMismaPersona(fallido(), [pagado({ status: 'failed', billing: { email: 'gonza@example.com' } })])).toBeNull();
  });
  it('el mismo pedido no se cuenta a sí mismo', () => {
    expect(pagoDeLaMismaPersona(fallido(), [fallido({ status: 'processing' })])).toBeNull();
  });
  it('teléfonos o DNI vacíos o cortos no hacen match entre desconocidos', () => {
    const a = fallido({ billing: { email: 'a@a.com', phone: '' }, meta_data: [{ key: '_billing_dni', value: '1' }] });
    const b = pagado({ billing: { email: 'b@b.com', phone: '' }, meta_data: [{ key: '_billing_dni', value: '1' }] });
    expect(pagoDeLaMismaPersona(a, [b])).toBeNull();
  });
});

// ─── La ruta ──────────────────────────────────────────────────────────────────

let llamadas: { method: string; url: string }[] = [];
let pagadosOk = true;
const hace = (h: number) => new Date(Date.now() - h * 3600_000).toISOString().slice(0, 19);

beforeEach(() => {
  llamadas = [];
  pagadosOk = true;
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 's3cret');
  vi.stubEnv('ABANDONED_ENABLED', 'true');
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    llamadas.push({ method, url: u });
    if (u.includes('status=pending')) {
      return { ok: true, json: async () => [
        // Reintentó y pagó: no tiene que recibir mail.
        { id: 1, number: '1', status: 'pending', date_created: hace(8), billing: { email: 'pago@x.com', phone: '1145678900' }, meta_data: [] },
        // No compró: sí.
        { id: 2, number: '2', status: 'pending', date_created: hace(8), billing: { email: 'nocompro@x.com', phone: '1122223333' }, meta_data: [] },
      ] };
    }
    if (u.includes('status=failed')) return { ok: true, json: async () => [] };
    if (u.includes('status=processing,completed,on-hold')) {
      if (!pagadosOk) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => [
        { id: 3, number: '3', status: 'processing', date_created: hace(7.9), billing: { email: 'otro@mail.com', phone: '011 15 4567 8900' }, meta_data: [] },
      ] };
    }
    if (u.includes('send-order-emails')) return { ok: true, json: async () => ({ ok: true }) };
    return { ok: true, json: async () => ({}) };
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const req = () => new NextRequest('http://localhost/api/admin/abandoned-sweep?secret=s3cret');

describe('GET /api/admin/abandoned-sweep', () => {
  it('no le manda el mail a quien ya pagó otro pedido (match por teléfono)', async () => {
    const { GET } = await import('@/app/api/admin/abandoned-sweep/route');
    const res = await GET(req());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ya_pagaron).toEqual([{ pedido: '1', pago: '3' }]);
    const mails = llamadas.filter(l => l.url.includes('send-order-emails'));
    expect(mails).toHaveLength(1);
    expect(mails[0].url).toContain('order_id=2');
  });

  it('si no puede leer los pagados no manda nada', async () => {
    pagadosOk = false;
    const { GET } = await import('@/app/api/admin/abandoned-sweep/route');
    const res = await GET(req());
    expect(res.status).toBe(502);
    expect(llamadas.some(l => l.url.includes('send-order-emails'))).toBe(false);
  });
});
