import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { altaNewsletterBody } from '@/lib/newsletter-subscribe';

/**
 * Las DOS altas que comparten /api/newsletter-subscribe.
 *
 * Lo que no puede pasar:
 *   - que el alta del popup del sitio deje de recibir su bienvenida con HYPE10
 *     (es el flujo de siempre y hay 20 % de los pedidos que usan ese cupón);
 *   - que el "Avisame" de /hype72 dispare esa bienvenida — ni el mail, ni el
 *     cupón: durante el evento ese 10 % se acumula con los packs y con el 10 %
 *     de transferencia;
 *   - que el alta de HYPE 72 quede con SIGNUP_DATE, que es el atributo con el
 *     que welcome-sweep decide a quién le manda los pasos 2 y 3.
 */

const CONTACTS = 'https://api.brevo.com/v3/contacts';
const SMTP = 'https://api.brevo.com/v3/smtp/email';

type Call = { url: string; method: string; body: any };
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  process.env.BREVO_HYPE72_LIST_ID = '9';
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    calls.push({
      url: String(url),
      method: init?.method || 'GET',
      body: init?.body ? JSON.parse(init.body) : null,
    });
    return { ok: true, json: async () => ({}), text: async () => '' };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BREVO_HYPE72_LIST_ID;
});

function req(body: unknown) {
  return new NextRequest('http://localhost/api/newsletter-subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** La request de alta de contacto (hay otras: la creación de atributos). */
const altaContacto = () => calls.find((c) => c.url === CONTACTS && c.method === 'POST');
const mailsEnviados = () => calls.filter((c) => c.url === SMTP);

describe('lib/newsletter-subscribe · payload', () => {
  it('el alta del popup no manda origen: el payload queda igual al de siempre', () => {
    expect(altaNewsletterBody('a@b.com', 'mujer')).toEqual({ email: 'a@b.com', preferencia: 'mujer' });
    expect(altaNewsletterBody('a@b.com')).toEqual({ email: 'a@b.com', preferencia: null });
  });

  it('el alta de HYPE 72 va marcada con origen', () => {
    expect(altaNewsletterBody('a@b.com', null, 'hype72')).toEqual({
      email: 'a@b.com', preferencia: null, origen: 'hype72',
    });
  });
});

describe('POST /api/newsletter-subscribe · alta normal del sitio', () => {
  it('entra a la lista de newsletter y recibe la bienvenida con HYPE10', async () => {
    const { POST } = await import('@/app/api/newsletter-subscribe/route');
    const res = await POST(req({ email: 'popup@test.com', preferencia: 'mujer' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, listId: 3, bienvenida: true });

    const alta = altaContacto()!;
    expect(alta.body.listIds).toEqual([3]);
    expect(alta.body.attributes.PREFERENCIA).toBe('mujer');
    // Los dos atributos con los que welcome-sweep sigue la secuencia.
    expect(alta.body.attributes.SIGNUP_DATE).toBeTruthy();
    expect(alta.body.attributes.WELCOME_STEP).toBe(1);
    expect(alta.body.attributes.HYPE72).toBeUndefined();

    const mails = mailsEnviados();
    expect(mails).toHaveLength(1);
    expect(mails[0].body.tags).toEqual(['welcome-step-1']);
    expect(mails[0].body.htmlContent).toContain('HYPE10');
  });

  it('un origen desconocido se trata como el alta normal (no abre una puerta nueva)', async () => {
    const { POST } = await import('@/app/api/newsletter-subscribe/route');
    await POST(req({ email: 'raro@test.com', origen: 'cualquier-cosa' }));
    expect(altaContacto()!.body.listIds).toEqual([3]);
    expect(altaContacto()!.body.attributes.SIGNUP_DATE).toBeTruthy();
    expect(mailsEnviados()).toHaveLength(1);
  });
});

describe('POST /api/newsletter-subscribe · "Avisame" de HYPE 72', () => {
  it('captura el mail en la lista del evento y NO manda la bienvenida ni el cupón', async () => {
    const { POST } = await import('@/app/api/newsletter-subscribe/route');
    const res = await POST(req({ email: 'evento@test.com', origen: 'hype72' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, listId: 9, bienvenida: false });

    const alta = altaContacto()!;
    expect(alta.body.email).toBe('evento@test.com');
    expect(alta.body.listIds).toEqual([9]);
    // La etiqueta del segmento, para poder mandar el envío del evento solo a estos.
    expect(alta.body.attributes.HYPE72).toBe('yes');
    expect(alta.body.attributes.HYPE72_DATE).toBeTruthy();
    // Sin estos dos, welcome-sweep lo saltea aunque el contacto cayera en la lista 3.
    expect(alta.body.attributes.SIGNUP_DATE).toBeUndefined();
    expect(alta.body.attributes.WELCOME_STEP).toBeUndefined();

    // Ni un solo mail: el cupón HYPE10 no sale de acá.
    expect(mailsEnviados()).toHaveLength(0);
  });

  it('sin la lista del evento cargada no se pierde el mail, pero sigue sin bienvenida', async () => {
    delete process.env.BREVO_HYPE72_LIST_ID;
    const { POST } = await import('@/app/api/newsletter-subscribe/route');
    const res = await POST(req({ email: 'sinlista@test.com', origen: 'hype72' }));
    expect(await res.json()).toMatchObject({ ok: true, listId: 3, bienvenida: false });

    const alta = altaContacto()!;
    expect(alta.body.attributes.HYPE72).toBe('yes');
    expect(alta.body.attributes.SIGNUP_DATE).toBeUndefined();
    expect(mailsEnviados()).toHaveLength(0);
  });

  it('un mail inválido se rechaza antes de pegarle a Brevo', async () => {
    const { POST } = await import('@/app/api/newsletter-subscribe/route');
    const res = await POST(req({ email: 'no-es-un-mail', origen: 'hype72' }));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});
