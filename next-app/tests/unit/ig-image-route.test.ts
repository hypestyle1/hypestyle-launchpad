import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

/**
 * /api/ig-image/[id]: miniaturas del feed de Instagram. Solo sirve posts del
 * feed actual (no es un proxy abierto) y solo en los anchos de la tira.
 */
vi.mock('@/lib/instagram', () => ({
  getInstagramPosts: async () => [{ id: '111', permalink: 'https://instagram.com/p/x', imageUrl: 'https://cdn.example/foto.jpg', caption: null, isVideo: false }],
}));

let pedidas: string[] = [];
beforeEach(async () => {
  pedidas = [];
  const original = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: '#888' } }).jpeg().toBuffer();
  vi.stubGlobal('fetch', vi.fn(async (url: any) => { pedidas.push(String(url)); return { ok: true, arrayBuffer: async () => original }; }));
});
afterEach(() => vi.unstubAllGlobals());

const get = async (id: string, w: string) => {
  const { GET } = await import('@/app/api/ig-image/[id]/route');
  return GET(new NextRequest(`http://localhost/api/ig-image/${id}?w=${w}`), { params: { id } });
};

describe('GET /api/ig-image/[id]', () => {
  it('devuelve la miniatura cuadrada en webp al ancho pedido, cacheable en la CDN', async () => {
    const res = await get('111', '480');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(res.headers.get('cache-control')).toMatch(/s-maxage=86400/);
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([480, 480, 'webp']);
    expect(pedidas).toEqual(['https://cdn.example/foto.jpg']);
  });
  it('un id que no está en el feed da 404 y no pide nada afuera', async () => {
    expect((await get('999', '480')).status).toBe(404);
    expect(pedidas).toEqual([]);
  });
  it('un ancho fuera de la lista da 400', async () => {
    expect((await get('111', '3000')).status).toBe(400);
    expect((await get('111', 'abc')).status).toBe(400);
  });
});
