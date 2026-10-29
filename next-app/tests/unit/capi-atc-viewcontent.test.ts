import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * ViewContent y AddToCart por los dos caminos: pixel del browser + /api/capi.
 *
 * Eran los dos únicos eventos del embudo que viajaban SOLO por el navegador, y
 * la auditoría del 27/10/2026 midió el costo: Meta recibía ~1/3 de los reales
 * (bloqueadores, ITP, navegadores in-app). Lo que este archivo deja anclado es
 * lo que no se ve mirando la página:
 *
 *  1. **Deduplicación.** Pixel y CAPI mandan el MISMO `event_id`. Si se
 *     separaran, Meta contaría dos veces cada vista y cada agregado al carrito.
 *  2. **Payload consistente.** Lo que viaja por CAPI es el mismo custom_data
 *     que ve el pixel: content_ids, content_type, value, currency. Si
 *     divergieran, Events Manager mostraría dos eventos distintos con el mismo
 *     id y el diagnóstico de dedup se degradaría.
 *  3. **Sin PII.** En la ficha y la grilla no hay datos de la persona, y el
 *     evento no inventa ninguno: ni mail ni teléfono, tampoco hasheados. Solo
 *     las cookies _fbp/_fbc que el navegador ya tiene.
 *  4. **Gates.** "Solo necesarias" corta los dos caminos, y fuera del dominio
 *     real no sale nada — mismo criterio que el Lead de CYBER HYPE.
 */

const CONSENT_KEY = 'hy_cookie_consent';

let fbqLlamadas: any[][] = [];
let capiLlamadas: any[] = [];

function prepararVentana(hostname: string, cookie = '') {
  const store: Record<string, string> = {};
  vi.stubGlobal('window', {
    location: { hostname, href: `https://${hostname}/producto/regular-tee-black` },
    fbq: (...args: any[]) => { fbqLlamadas.push(args); },
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
    },
  });
  vi.stubGlobal('localStorage', (globalThis as any).window.localStorage);
  vi.stubGlobal('document', { cookie });
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

describe('ViewContent por pixel + CAPI', () => {
  it('pixel y CAPI salen con el MISMO event_id', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbViewContent } = await import('@/lib/fbpixel');
    fbViewContent({ id: 'regular-tee-black', name: 'Regular Tee Black', price: 38000, category: 'tees' });

    const vc = fbqLlamadas.find((a) => a[1] === 'ViewContent');
    expect(vc, 'el pixel no disparó ViewContent').toBeDefined();
    const idPixel = vc![3]?.eventID;
    expect(idPixel).toBeTruthy();

    const capi = capiLlamadas.find((c) => c.url.includes('/api/capi'));
    expect(capi, 'CAPI no recibió el ViewContent').toBeDefined();
    expect(capi.body.event_name).toBe('ViewContent');
    expect(capi.body.event_id).toBe(idPixel);
  });

  it('el custom_data de CAPI es el mismo que ve el pixel', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbViewContent } = await import('@/lib/fbpixel');
    fbViewContent({ id: 'regular-tee-black', name: 'Regular Tee Black', price: 38000, category: 'tees' });

    const vc = fbqLlamadas.find((a) => a[1] === 'ViewContent')![2];
    const capi = capiLlamadas.find((c) => c.url.includes('/api/capi'))!.body;
    expect(capi.custom_data.content_ids).toEqual(vc.content_ids);
    expect(capi.custom_data.content_type).toBe('product');
    expect(capi.custom_data.value).toBe(38000);
    expect(capi.custom_data.currency).toBe('ARS');
    expect(capi.event_source_url).toContain('hypestyle.com.ar');
  });

  it('manda las cookies _fbp/_fbc si existen, y nada de PII', async () => {
    prepararVentana('hypestyle.com.ar', '_fbp=fb.1.1700000000.111; _fbc=fb.1.1700000000.AbCd');
    const { fbViewContent } = await import('@/lib/fbpixel');
    fbViewContent({ id: 'regular-tee-black', price: 38000 });

    const u = capiLlamadas.find((c) => c.url.includes('/api/capi'))!.body.user_data ?? {};
    expect(u.fbp).toBe('fb.1.1700000000.111');
    expect(u.fbc).toBe('fb.1.1700000000.AbCd');
    expect(u.em).toBeUndefined();
    expect(u.ph).toBeUndefined();
    expect(u.fn).toBeUndefined();
    expect(u.ln).toBeUndefined();
  });
});

describe('AddToCart por pixel + CAPI', () => {
  it('pixel y CAPI salen con el MISMO event_id y el mismo payload', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbAddToCart } = await import('@/lib/fbpixel');
    fbAddToCart({ id: 'regular-tee-black', name: 'Regular Tee Black', price: 38000, quantity: 2 });

    const atc = fbqLlamadas.find((a) => a[1] === 'AddToCart');
    expect(atc, 'el pixel no disparó AddToCart').toBeDefined();
    const idPixel = atc![3]?.eventID;
    expect(idPixel).toBeTruthy();

    const capi = capiLlamadas.find((c) => c.url.includes('/api/capi'));
    expect(capi, 'CAPI no recibió el AddToCart').toBeDefined();
    expect(capi.body.event_name).toBe('AddToCart');
    expect(capi.body.event_id).toBe(idPixel);
    expect(capi.body.custom_data.content_ids).toEqual(['regular-tee-black']);
    expect(capi.body.custom_data.contents).toEqual([{ id: 'regular-tee-black', quantity: 2 }]);
    expect(capi.body.custom_data.value).toBe(76000);
    expect(capi.body.custom_data.currency).toBe('ARS');
  });

  it('cada disparo genera un event_id distinto: dos agregados son dos eventos', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbAddToCart } = await import('@/lib/fbpixel');
    fbAddToCart({ id: 'regular-tee-black', price: 38000 });
    fbAddToCart({ id: 'regular-tee-black', price: 38000 });

    const ids = capiLlamadas.map((c) => c.body.event_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('no manda PII: sin mail ni teléfono, tampoco hasheados', async () => {
    prepararVentana('hypestyle.com.ar');
    const { fbAddToCart } = await import('@/lib/fbpixel');
    fbAddToCart({ id: 'regular-tee-black', price: 38000 });

    const u = capiLlamadas.find((c) => c.url.includes('/api/capi'))!.body.user_data ?? {};
    expect(u.em).toBeUndefined();
    expect(u.ph).toBeUndefined();
  });
});

describe('gates: consentimiento y host', () => {
  it('con "Solo necesarias" no sale nada por ningún camino', async () => {
    prepararVentana('hypestyle.com.ar');
    localStorage.setItem(CONSENT_KEY, 'necessary');
    const { fbViewContent, fbAddToCart } = await import('@/lib/fbpixel');
    fbViewContent({ id: 'regular-tee-black', price: 38000 });
    fbAddToCart({ id: 'regular-tee-black', price: 38000 });

    expect(fbqLlamadas).toHaveLength(0);
    expect(capiLlamadas).toHaveLength(0);
  });

  it('fuera del dominio real no sale nada (preview, e2e, local)', async () => {
    for (const host of ['next-app-git-abc.vercel.app', 'localhost', '127.0.0.1']) {
      fbqLlamadas = []; capiLlamadas = []; vi.resetModules();
      prepararVentana(host);
      const { fbViewContent, fbAddToCart } = await import('@/lib/fbpixel');
      fbViewContent({ id: 'regular-tee-black', price: 38000 });
      fbAddToCart({ id: 'regular-tee-black', price: 38000 });
      expect(fbqLlamadas, host).toHaveLength(0);
      expect(capiLlamadas, host).toHaveLength(0);
    }
  });
});
