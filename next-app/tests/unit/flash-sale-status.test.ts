import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/flash-sale-status/route';
import { FLASH_SALE_END } from '@/lib/flash-sale';

// El flash sale terminó el 25/06/2026. Fuera de esa ventana la ruta no puede
// pegarle a WooCommerce: la barra está montada en el layout y la consultaba
// cada 30 s por visitante, y Hostinger la registró como origen de 503 el 12/09.
describe('/api/flash-sale-status fuera del sale', () => {
  afterEach(() => vi.restoreAllMocks());

  it('no consulta wc/v3/orders cuando el sale ya terminó', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]'));
    expect(Date.now()).toBeGreaterThan(FLASH_SALE_END.getTime());

    const res = await GET();
    const body = await res.json();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(body).toMatchObject({ count: 0, full: false, active: false });
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });
});
