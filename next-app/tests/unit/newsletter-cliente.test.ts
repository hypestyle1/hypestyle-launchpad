import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  altaNewsletter,
  interpretarRespuesta,
  mensajeError,
  MENSAJES_ERROR,
  MENSAJES_EXITO,
  type MotivoAlta,
} from '@/lib/newsletter-cliente';
import { registrarCyber } from '@/lib/cyber-registro-cliente';

/**
 * Issue #625: el footer decía "¡Listo!" sin llamar a la API y el popup no
 * miraba la respuesta. Todo formulario de newsletter pasa ahora por
 * lib/newsletter-cliente: estos tests cuidan que un 4xx, un 5xx o un corte de
 * red NUNCA se lean como alta, y que el éxito sí.
 */

type Respuesta = { status: number; body?: unknown; noJson?: boolean };

function mockFetch(r: Respuesta | 'sin-red') {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (r === 'sin-red') throw new TypeError('Failed to fetch');
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => {
        if (r.noJson) throw new SyntaxError('Unexpected token <');
        return r.body;
      },
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const FALLOS: [string, Respuesta | 'sin-red', MotivoAlta][] = [
  ['400 mail inválido', { status: 400, body: { error: 'Invalid email' } }, 'email-invalido'],
  ['429 tope por IP', { status: 429, body: { ok: false, error: 'rate_limited' } }, 'demasiados-intentos'],
  ['500 Brevo caído', { status: 500, body: { ok: false, error: 'Brevo error' } }, 'error'],
  ['503 falta configuración', { status: 503, body: { ok: false, error: 'config' } }, 'error'],
  ['502 con HTML de Vercel', { status: 502, noJson: true }, 'error'],
  ['200 sin ok:true', { status: 200, body: { error: 'algo' } }, 'error'],
  ['200 que no es JSON', { status: 200, noJson: true }, 'error'],
  ['sin red', 'sin-red', 'error'],
];

describe('altaNewsletter — un fallo nunca es "listo"', () => {
  for (const [nombre, resp, motivo] of FALLOS) {
    it(`${nombre} → ${motivo}`, async () => {
      mockFetch(resp);
      const r = await altaNewsletter({ email: 'a@gmail.com', origen: 'footer' });
      expect(r).toEqual({ ok: false, motivo });
    });
  }

  it('alta confirmada → ok', async () => {
    mockFetch({ status: 200, body: { ok: true, estado: 'alta', listId: 3, bienvenida: true } });
    expect(await altaNewsletter({ email: 'a@gmail.com', origen: 'footer' })).toEqual({ ok: true, motivo: 'alta' });
  });

  it('"ya estaba en la lista" cuenta como éxito, con su propio motivo', async () => {
    mockFetch({ status: 200, body: { ok: true, estado: 'ya-suscripto' } });
    expect(await altaNewsletter({ email: 'a@gmail.com', origen: 'popup' })).toEqual({ ok: true, motivo: 'ya-suscripto' });
  });

  it('manda el origen, la preferencia y el mail sin espacios', async () => {
    const fn = mockFetch({ status: 200, body: { ok: true, estado: 'alta' } });
    await altaNewsletter({ email: '  a@gmail.com ', origen: 'popup', preferencia: 'mujer' });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/api/newsletter-subscribe');
    expect(JSON.parse(String(init!.body))).toEqual({ email: 'a@gmail.com', preferencia: 'mujer', origen: 'popup' });
  });
});

describe('interpretarRespuesta', () => {
  it('cualquier status fuera de 2xx es error aunque el cuerpo diga ok', () => {
    expect(interpretarRespuesta(500, { ok: true })).toEqual({ ok: false, motivo: 'error' });
    expect(interpretarRespuesta(301, { ok: true })).toEqual({ ok: false, motivo: 'error' });
  });
});

describe('mensajes', () => {
  it('ningún mensaje de error dice "listo"', () => {
    for (const m of Object.values(MENSAJES_ERROR)) expect(m.toLowerCase()).not.toContain('listo');
  });

  it('los éxitos no tienen mensaje de error y los fallos sí', () => {
    expect(mensajeError('alta')).toBeNull();
    expect(mensajeError('ya-suscripto')).toBeNull();
    for (const m of ['email-invalido', 'demasiados-intentos', 'error'] as const) expect(mensajeError(m)).toBeTruthy();
  });

  it('voz Hype: sin emojis, sin tilde de check y sin signos de exclamación', () => {
    const todos = [...Object.values(MENSAJES_ERROR), ...Object.values(MENSAJES_EXITO)];
    for (const m of todos) expect(m).not.toMatch(/\p{Extended_Pictographic}|✓|!/u);
  });
});

describe('registrarCyber sigue igual sobre el cliente compartido', () => {
  it('manda origen cyber con honeypot, tiempo y UTM', async () => {
    const fn = mockFetch({ status: 200, body: { ok: true, estado: 'alta' } });
    const r = await registrarCyber({ email: 'a@gmail.com', ms: 5000, utm: { utm_source: 'ig' } as never });
    expect(r).toBe('alta');
    expect(JSON.parse(String(fn.mock.calls[0][1]!.body))).toMatchObject({
      email: 'a@gmail.com', origen: 'cyber', empresa: '', ms: 5000, utm_source: 'ig', preferencia: null,
    });
  });

  for (const [nombre, resp, motivo] of FALLOS) {
    it(`${nombre} → ${motivo}`, async () => {
      mockFetch(resp);
      expect(await registrarCyber({ email: 'a@gmail.com' })).toBe(motivo);
    });
  }
});
