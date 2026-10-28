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
  delete process.env.BREVO_CYBER_LIST_ID;
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

async function post(body: unknown) {
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
    expect(r.json).toMatchObject({ ok: true, estado: 'alta', bienvenida: false });
    expect(bienvenida()).toBeUndefined();
  });

  it('entra a la lista propia cuando la variable está cargada', async () => {
    process.env.BREVO_CYBER_LIST_ID = '7';
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(alta()!.body.listIds).toEqual([7]);
    expect(r.json.listId).toBe(7);
  });

  it('acepta el nombre interno del PR original (hype72)', async () => {
    process.env.BREVO_HYPE72_LIST_ID = '7';
    await post({ email: 'alguien@gmail.com', origen: 'hype72' });
    expect(alta()!.body.listIds).toEqual([7]);
    expect(bienvenida()).toBeUndefined();
  });

  it('sin la variable el alta no se pierde: cae en la lista 3 pero sin bienvenida ni SIGNUP_DATE', async () => {
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.json.listId).toBe(3);
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

  it('a un contacto dado de baja se lo dice, y no lo agrega a la lista', async () => {
    contactoExistente = { email: 'baja@gmail.com', emailBlacklisted: true };
    const r = await post({ email: 'baja@gmail.com', origen: 'cyber' });
    expect(r.json).toMatchObject({ ok: true, estado: 'dado-de-baja' });
    expect(alta()).toBeUndefined();
  });

  it('un contacto que existe y está suscripto se da de alta normal', async () => {
    contactoExistente = { email: 'alguien@gmail.com', emailBlacklisted: false };
    const r = await post({ email: 'alguien@gmail.com', origen: 'cyber' });
    expect(r.json.estado).toBe('alta');
    expect(alta()).toBeDefined();
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
