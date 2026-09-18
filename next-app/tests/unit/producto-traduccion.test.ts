import { describe, it, expect, vi, afterEach } from 'vitest';
import { parsearRespuesta, traducirTextosProducto, esIdiomaTraducible } from '@/lib/producto-traduccion';
import { translate } from '@/lib/i18n';

// Traducción por IA de la descripción de producto. El test no le pega a
// OpenAI: valida el parseo de la respuesta y el contrato del request.

const ORIGINAL = {
  description: 'Mesh Camo Blue – Tee\nPieza única de Hype.\n\nDetalles:\n• Mesh sublimado RealTree™\n• Corte cómodo',
  modelInfo: '<p>El modelo mide <strong>1,80 m</strong> y usa talle L.</p>',
};

afterEach(() => vi.unstubAllGlobals());

describe('parsearRespuesta', () => {
  it('acepta un JSON con descripción y ficha', () => {
    const r = parsearRespuesta(JSON.stringify({ description: 'Mesh Camo Blue – Tee\nCapo unico di Hype.', modelInfo: '<p>Il modello è alto <strong>1,80 m</strong>.</p>' }), ORIGINAL);
    expect(r).toEqual({ description: 'Mesh Camo Blue – Tee\nCapo unico di Hype.', modelInfo: '<p>Il modello è alto <strong>1,80 m</strong>.</p>' });
  });

  it('rechaza JSON roto, descripción vacía o tipos raros', () => {
    expect(parsearRespuesta('esto no es json', ORIGINAL)).toBeNull();
    expect(parsearRespuesta(JSON.stringify({ description: '' }), ORIGINAL)).toBeNull();
    expect(parsearRespuesta(JSON.stringify({ description: 42 }), ORIGINAL)).toBeNull();
    expect(parsearRespuesta('null', ORIGINAL)).toBeNull();
  });

  it('no acepta una ficha del modelo inventada si el producto no tenía', () => {
    const r = parsearRespuesta(JSON.stringify({ description: 'ok', modelInfo: '<p>inventada</p>' }), { description: 'x', modelInfo: '' });
    expect(r).toEqual({ description: 'ok', modelInfo: '' });
  });
});

describe('traducirTextosProducto', () => {
  it('manda el idioma y los textos a OpenAI y devuelve lo parseado', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ description: 'Tradotto', modelInfo: '<p>Modello</p>' }) } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');

    // El módulo lee la clave al cargar: se reimporta con el env ya puesto.
    vi.resetModules();
    const mod = await import('@/lib/producto-traduccion');
    const r = await mod.traducirTextosProducto(ORIGINAL, 'IT');

    expect(r).toEqual({ description: 'Tradotto', modelInfo: '<p>Modello</p>' });
    const [url, init] = (fetchMock.mock.calls[0] as unknown as [string, RequestInit]);
    expect(url).toContain('api.openai.com');
    const body = JSON.parse(String(init.body));
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[1].content).toContain('Italiano');
    expect(body.messages[1].content).toContain('Mesh Camo Blue');
    vi.unstubAllEnvs();
  });

  it('lanza si OpenAI responde error (para que no se cachee)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })));
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.resetModules();
    const mod = await import('@/lib/producto-traduccion');
    await expect(mod.traducirTextosProducto(ORIGINAL, 'EN')).rejects.toThrow(/500/);
    vi.unstubAllEnvs();
  });

  it('sin clave lanza sin llamar a nadie', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(traducirTextosProducto(ORIGINAL, 'EN')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('solo acepta los idiomas del selector distintos de ES', () => {
    for (const l of ['EN', 'PT', 'DE', 'FR', 'IT']) expect(esIdiomaTraducible(l)).toBe(true);
    for (const l of ['ES', 'en', 'JP', '']) expect(esIdiomaTraducible(l)).toBe(false);
  });
});

describe('ficha de producto — diccionario', () => {
  // Categorías de Woo tal como llegan de productCategories. Si Woo suma una
  // categoría en español, hay que sumarla al diccionario o se ve en español.
  const CATEGORIAS_WOO = ['Remera', 'Hoodie', 'Campera', 'Musculosa', 'Pantalón', 'SWEATER', 'Accesorio'];
  it('traduce el tipo de artículo en los cinco idiomas', () => {
    for (const cat of CATEGORIAS_WOO) {
      for (const lang of ['EN', 'PT', 'DE', 'FR', 'IT'] as const) {
        expect(translate(cat, lang), `${cat} en ${lang}`).toBeTruthy();
      }
    }
    expect(translate('Remera', 'IT')).toBe('T-shirt');
    expect(translate('Remera', 'DE')).toBe('T-Shirt');
    expect(translate('Talle único', 'FR')).toBe('Taille unique');
  });

  it('los textos fijos de la ficha tienen traducción', () => {
    for (const k of ['Descripción', 'Agregar al carrito', 'Guía de talles', 'Calce y medidas', 'Envíos y devoluciones', 'Reseñas']) {
      expect(translate(k, 'IT')).not.toBe(k);
    }
  });
});
