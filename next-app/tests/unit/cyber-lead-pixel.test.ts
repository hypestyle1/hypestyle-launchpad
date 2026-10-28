import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El `Lead` de CYBER HYPE: consentimiento, deduplicación y qué se le manda a Meta.
 *
 * Las tres cosas que este archivo deja ancladas, porque son las que no se ven
 * mirando la página:
 *
 *  1. **Consentimiento.** Si la persona eligió "Solo necesarias", no sale nada
 *     — ni por el pixel ni por CAPI. El corte vale para los dos caminos: el
 *     server-side no depende de que `fbq` haya cargado, así que necesita su
 *     propio gate. Y fuera del dominio real tampoco sale nada, para que un
 *     preview o un e2e no le inyecten eventos al pixel de producción.
 *  2. **Deduplicación.** El navegador y el relay mandan el MISMO `event_id`.
 *     Si se separaran, Meta contaría dos veces cada registro y el costo por
 *     registro saldría a la mitad del real.
 *  3. **Sin datos personales.** El consentimiento que dio la persona es para
 *     recibir correos, no para que su dirección viaje a Meta. El evento va solo
 *     con las cookies que el navegador ya tiene.
 *
 * Y el clic al canal de WhatsApp es un evento aparte: un clic no es un alta.
 */

const CONSENT_KEY = 'hy_cookie_consent';

let fbqLlamadas: any[][] = [];
let capiLlamadas: any[] = [];

function prepararVentana(hostname: string) {
  const store: Record<string, string> = {};
  vi.stubGlobal('window', {
    location: { hostname, href: `https://${hostname}/hype72` },
    fbq: (...args: any[]) => { fbqLlamadas.push(args); },
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    },
  });
  vi.stubGlobal('localStorage', (globalThis as any).window.localStorage);
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    capiLlamadas.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    return { ok: true, json: async () => ({}) };
  }));
}

beforeEach(() => {
  fbqLlamadas = [];
  capiLlamadas = [];
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Lead de CYBER HYPE', () => {
  it('pixel y CAPI salen con el MISMO event_id', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbLeadCyber } = await import('@/lib/fbpixel');
    fbLeadCyber();

    const lead = fbqLlamadas.find((a) => a[1] === 'Lead');
    expect(lead, 'el pixel no disparó Lead').toBeDefined();
    const idPixel = lead![3]?.eventID;
    expect(idPixel).toBeTruthy();

    const capi = capiLlamadas.find((c) => c.url.includes('/api/capi'));
    expect(capi, 'CAPI no recibió el Lead').toBeDefined();
    expect(capi.body.event_name).toBe('Lead');
    expect(capi.body.event_id).toBe(idPixel);
  });

  it('no le manda el mail a Meta, ni hasheado', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbLeadCyber } = await import('@/lib/fbpixel');
    fbLeadCyber();

    const capi = capiLlamadas.find((c) => c.url.includes('/api/capi'));
    const u = capi.body.user_data ?? {};
    expect(u.em).toBeUndefined();
    expect(u.ph).toBeUndefined();
    expect(JSON.stringify(capi.body)).not.toMatch(/@/);
  });

  it('con "Solo necesarias" no sale nada por ningún camino', async () => {
    prepararVentana('hypestyle.com.ar');
    localStorage.setItem(CONSENT_KEY, 'necessary');
    const { fbLeadCyber } = await import('@/lib/fbpixel');
    fbLeadCyber();

    expect(fbqLlamadas).toHaveLength(0);
    expect(capiLlamadas).toHaveLength(0);
  });

  it('fuera del dominio real no sale nada (preview, e2e, local)', async () => {
    for (const host of ['next-app-git-abc.vercel.app', 'localhost', '127.0.0.1']) {
      fbqLlamadas = []; capiLlamadas = []; vi.resetModules();
      prepararVentana(host);
      const { fbLeadCyber } = await import('@/lib/fbpixel');
      fbLeadCyber();
      expect(fbqLlamadas, host).toHaveLength(0);
      expect(capiLlamadas, host).toHaveLength(0);
    }
  });

  it('el valor va en 0: dejar el mail no es una venta', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbLeadCyber } = await import('@/lib/fbpixel');
    fbLeadCyber();
    const lead = fbqLlamadas.find((a) => a[1] === 'Lead');
    expect(lead![2].value).toBe(0);
  });
});

describe('clic al canal de WhatsApp', () => {
  it('es un evento propio, NO un Lead: un clic no es un alta', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbClickWhatsAppCyber } = await import('@/lib/fbpixel');
    fbClickWhatsAppCyber();

    expect(fbqLlamadas).toHaveLength(1);
    expect(fbqLlamadas[0][0]).toBe('trackCustom');
    expect(fbqLlamadas[0][1]).toBe('ClickWhatsAppCyber');
    // Y nada de Lead ni de CAPI: el sitio no sabe si entró al canal.
    expect(fbqLlamadas.some((a) => a[1] === 'Lead')).toBe(false);
    expect(capiLlamadas).toHaveLength(0);
  });

  it('también respeta "Solo necesarias"', async () => {
    prepararVentana('hypestyle.com.ar');
    localStorage.setItem(CONSENT_KEY, 'necessary');
    const { fbClickWhatsAppCyber } = await import('@/lib/fbpixel');
    fbClickWhatsAppCyber();
    expect(fbqLlamadas).toHaveLength(0);
  });
});
