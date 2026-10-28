import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * El alta del "Avisame" de CYBER HYPE contra el endpoint real
 * (app/api/newsletter-subscribe), con Brevo stubbeado.
 *
 * Lo que estos tests cuidan, en orden de gravedad:
 *  1. que el alta del evento NO dispare el mail de bienvenida con HYPE10 (ese
 *     10% se suma a los packs del evento: hasta $4.930 por pedido);
 *  2. que entre a la lista propia y, si la variable no está cargada, que el
 *     alta no se pierda ni se cuele en la secuencia de bienvenida;
 *  3. que el alta normal del sitio siga funcionando exactamente igual;
 *  4. duplicados, normalización y contactos dados de baja.
 */

const BREVO_CONTACTS = 'https://api.brevo.com/v3/contacts';
const BREVO_SMTP = 'https://api.brevo.com/v3/smtp/email';

type Llamada = { url: string; method: string; body: any };
let llamadas: Llamada[] = [];
let contactoExistente: any = null;
let respuestaAlta: { ok: boolean; body?: any } = { ok: true };

beforeEach(() => {
  llamadas = [];
  contactoExistente = null;
  respuestaAlta = { ok: true };
  process.env.BREVO_API_KEY = 'test-key';
  process.env.BREVO_CYBER_LIST_ID = '6';
  delete process.env.BREVO_HYPE72_LIST_ID;

  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body) : null;
    llamadas.push({ url: u, method, body });

    // Alta/actualización de atributos custom: siempre OK.
    if (u.includes('/contacts/attributes/')) return { ok: true, json: async () => ({}) };

    // Lectura de un contacto puntual (el chequeo de baja).
    if (method === 'GET' && u.startsWith(BREVO_CONTACTS + '/')) {
      if (!contactoExistente) return { ok: false, status: 404, json: async () => ({ code: 'document_not_found' }) };
      return { ok: true, json: async () => contactoExistente };
    }

    if (u === BREVO_CONTACTS && method === 'POST') {
      return respuestaAlta.ok
        ? { ok: true, json: async () => ({ id: 1 }) }
        : { ok: false, status: 400, json: async () => respuestaAlta.body };
    }

    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function post(body: any) {
  // Por defecto el cuerpo simula a una persona: honeypot vacío y tiempo
  // humano. Los tests de bots lo pisan a propósito.
  if (body && typeof body === 'object' && body.ms === undefined) body = { ms: 9000, ...body };
  // Import dinámico: la ruta lee BREVO_API_KEY al cargar el módulo.
  const { POST } = await import('@/app/api/newsletter-subscribe/route');
  const req = new NextRequest('http://localhost/api/newsletter-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, json: await res.json() };
}

const alta = () => llamadas.find((l) => l.url === BREVO_CONTACTS && l.method === 'POST');
const bienvenida = () => llamadas.find((l) => l.url === BREVO_SMTP);

describe('alta de CYBER HYPE', () => {
  it('no manda el mail de bienvenida ni el cupón HYPE10', async () => {
    const r = await post({ email: 'alguien@gmail.com', preferencia: null, origen: 'cyber' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, estado: 'alta' });
    expect(bienvenida()).toBeUndefined();
  });

  it('entra a la lista propia del evento', async () => {
    process.env.BREVO_CYBER_LIST_ID = '7';
    await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(alta()!.body.listIds).toEqual([7]);
  });

  it('acepta el nombre interno del PR original (hype72)', async () => {
    delete process.env.BREVO_CYBER_LIST_ID;
    process.env.BREVO_HYPE72_LIST_ID = '7';
    await post({ email: 'alguien@gmail.com', origen: 'hype72' });
    expect(alta()!.body.listIds).toEqual([7]);
    expect(bienvenida()).toBeUndefined();
  });

  it('sin la variable NO da de alta en otra lista: falla a la vista', async () => {
    delete process.env.BREVO_CYBER_LIST_ID;
    delete process.env.BREVO_HYPE72_LIST_ID;
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.status).toBe(503);
    expect(r.json).toMatchObject({ ok: false, error: 'config' });
    expect(alta()).toBeUndefined();
  });

  it('nunca escribe SIGNUP_DATE ni WELCOME_STEP (son los que disparan la bienvenida)', async () => {
    await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(alta()!.body.attributes.SIGNUP_DATE).toBeUndefined();
    expect(alta()!.body.attributes.WELCOME_STEP).toBeUndefined();
    expect(bienvenida()).toBeUndefined();
  });

  it('etiqueta el contacto y registra el consentimiento', async () => {
    await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    const attrs = alta()!.body.attributes;
    expect(attrs.HYPE72).toBe('yes');
    expect(attrs.HYPE72_CONSENT).toBe('landing-cyber-v1');
    expect(Date.parse(attrs.HYPE72_DATE)).not.toBeNaN();
  });

  it('es idempotente: el alta repetida va con updateEnabled y no manda nada dos veces', async () => {
    await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(alta()!.body.updateEnabled).toBe(true);
    llamadas = [];
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.status).toBe(200);
    expect(bienvenida()).toBeUndefined();
  });

  it('un duplicado reportado por Brevo no es un error para el usuario', async () => {
    respuestaAlta = { ok: false, body: { code: 'duplicate_parameter' } };
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
  });

  it('un error real de Brevo devuelve 500 (el formulario ofrece reintentar)', async () => {
    respuestaAlta = { ok: false, body: { code: 'unauthorized' } };
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.status).toBe(500);
  });

  it('normaliza espacios y mayúsculas para no duplicar el mismo mail', async () => {
    await post({ email: '  Alguien@Gmail.COM ', origen: 'cyber' });
    expect(alta()!.body.email).toBe('alguien@gmail.com');
  });

  it('rechaza direcciones inválidas sin tocar Brevo', async () => {
    for (const email of ['', 'hola', 'hola@', 'hola@gmail', '@gmail.com', 'a b@gmail.com']) {
      llamadas = [];
      const r = await post({ email, origen: 'cyber' });
      expect(r.status, email).toBe(400);
      expect(llamadas.length, email).toBe(0);
    }
  });

  it('a un contacto dado de baja lo vuelve a suscribir y lo deja marcado', async () => {
    contactoExistente = { email: 'baja@gmail.com', emailBlacklisted: true };
    const r = await post({ email: 'baja@gmail.com', origen: 'cyber' });
    expect(r.json).toEqual({ ok: true, estado: 'alta' });
    expect(alta()!.body.emailBlacklisted).toBe(false);
    expect(alta()!.body.attributes.HYPE72_REOPTIN).toBe('yes');
  });

  it('a quien está suscripto no le toca el estado de suscripción', async () => {
    contactoExistente = { email: 'alguien@gmail.com', emailBlacklisted: false };
    await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect('emailBlacklisted' in alta()!.body).toBe(false);
    expect(alta()!.body.attributes.HYPE72_REOPTIN).toBeUndefined();
  });

  it('la respuesta es idéntica para un alta nueva, una repetida y un re-opt-in', async () => {
    const nueva = await post({ email: 'nueva@gmail.com', origen: 'cyber' });
    contactoExistente = { email: 'repetida@gmail.com', emailBlacklisted: false };
    const repetida = await post({ email: 'repetida@gmail.com', origen: 'cyber' });
    contactoExistente = { email: 'baja@gmail.com', emailBlacklisted: true };
    const reoptin = await post({ email: 'baja@gmail.com', origen: 'cyber' });
    // Ni la lista, ni si existía, ni si estaba dado de baja: desde afuera no se
    // puede averiguar nada del estado de un mail ajeno.
    expect(nueva.json).toEqual({ ok: true, estado: 'alta' });
    expect(repetida.json).toEqual(nueva.json);
    expect(reoptin.json).toEqual(nueva.json);
    expect(nueva.status).toBe(200);
    expect(repetida.status).toBe(200);
    expect(reoptin.status).toBe(200);
  });

  it('un contacto que existe y está suscripto se da de alta normal', async () => {
    contactoExistente = { email: 'alguien@gmail.com', emailBlacklisted: false };
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.json.estado).toBe('alta');
    expect(alta()).toBeDefined();
  });
});


describe('defensas del endpoint público', () => {
  it('el honeypot completo se descarta en silencio: no escribe en Brevo y contesta 200', async () => {
    const r = await post({ email: 'bot@gmail.com', origen: 'cyber', empresa: 'Acme SA' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, estado: 'alta' });
    expect(alta()).toBeUndefined();
  });

  it('un submit instantáneo (menos de 1,2 s) se trata como bot', async () => {
    const r = await post({ email: 'bot@gmail.com', origen: 'cyber', ms: 300 });
    expect(r.status).toBe(200);
    expect(alta()).toBeUndefined();
  });

  it('un submit humano entra, aunque sea rápido con autocompletado', async () => {
    await post({ email: 'persona@gmail.com', origen: 'cyber', ms: 1500 });
    expect(alta()).toBeDefined();
  });

  it('sin el campo ms (formulario viejo o cliente propio) el alta entra igual', async () => {
    await post({ email: 'persona@gmail.com', origen: 'cyber', ms: undefined });
    expect(alta()).toBeDefined();
  });

  it('corta a la sexta alta seguida desde la misma IP', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await post({ email: `persona${i}@gmail.com`, origen: 'cyber' });
      expect(r.status, `intento ${i + 1}`).toBe(200);
    }
    const sexta = await post({ email: 'persona6@gmail.com', origen: 'cyber' });
    expect(sexta.status).toBe(429);
    expect(sexta.json).toMatchObject({ ok: false, error: 'rate_limited' });
    expect(sexta.json.retryAfter).toBeGreaterThan(0);
  });

  it('corta al cuarto intento con el mismo mail', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await post({ email: 'mismo@gmail.com', origen: 'cyber' });
      expect(r.status, `intento ${i + 1}`).toBe(200);
    }
    expect((await post({ email: 'mismo@gmail.com', origen: 'cyber' })).status).toBe(429);
  });

  it('el alta normal tiene su propio tope, más holgado: protege los créditos de Brevo', async () => {
    // Cada alta del popup manda el mail de bienvenida, y ese mail sale del
    // mismo cupo que las campañas del evento.
    for (let i = 0; i < 10; i++) {
      const r = await post({ email: `popup${i}@gmail.com` });
      expect(r.status, `alta ${i + 1}`).toBe(200);
    }
    const onceava = await post({ email: 'popup11@gmail.com' });
    expect(onceava.status).toBe(429);
    expect(bienvenida.length).toBeLessThanOrEqual(10);
  });

  it('el tope del evento y el del popup son contadores distintos', async () => {
    for (let i = 0; i < 5; i++) await post({ email: `cy${i}@gmail.com`, origen: 'cyber' });
    expect((await post({ email: 'cy6@gmail.com', origen: 'cyber' })).status).toBe(429);
    expect((await post({ email: 'popup@gmail.com' })).status).toBe(200);
  });

  it('un mail inválido no consume el tope de intentos', async () => {
    for (let i = 0; i < 8; i++) expect((await post({ email: 'roto@', origen: 'cyber' })).status).toBe(400);
    expect((await post({ email: 'persona@gmail.com', origen: 'cyber' })).status).toBe(200);
  });
});

describe('alta normal del sitio (no se toca)', () => {
  it('sin origen va a la lista 3, con SIGNUP_DATE y con la bienvenida', async () => {
    const r = await post({ email: 'alguien@gmail.com', preferencia: 'todo' });
    expect(r.json).toMatchObject({ ok: true, listId: 3, bienvenida: true });
    const attrs = alta()!.body.attributes;
    expect(attrs.WELCOME_STEP).toBe(1);
    expect(Date.parse(attrs.SIGNUP_DATE)).not.toBeNaN();
    expect(attrs.PREFERENCIA).toBe('todo');
    expect(attrs.HYPE72).toBeUndefined();
    expect(bienvenida()!.body.subject).toContain('10% off');
  });

  it('no chequea la baja en el alta normal (una request menos por suscripción)', async () => {
    await post({ email: 'alguien@gmail.com' });
    expect(llamadas.some((l) => l.method === 'GET' && l.url.startsWith(BREVO_CONTACTS + '/'))).toBe(false);
  });
});
