import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('@/lib/products-server',()=>({fetchAllProductsStrict:mocks.fetch}));
import { GET } from '@/app/api/cyber-products-live/route';
afterEach(()=>{vi.useRealTimers();vi.resetAllMocks();});
describe('lectura de precios efectivos sin caché',()=>{
  it('no adelanta ofertas antes de las 19:00',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T18:59:59-03:00'));
    const response=await GET();expect((await response.json()).active).toBe(false);expect(mocks.fetch).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('desde las 19 consulta Woo sin la caché de 60 segundos',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T19:00:00-03:00'));
    mocks.fetch.mockResolvedValue([{slug:'regular-tee-black',price:25900}]);
    const response=await GET();expect(await response.json()).toMatchObject({active:true,products:[{price:25900}]});
    expect(mocks.fetch).toHaveBeenCalledWith(true);expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('falla explícitamente si Woo no responde, sin reutilizar precios de preview',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T19:00:00-03:00'));mocks.fetch.mockRejectedValue(new Error('offline'));
    const response=await GET();expect(response.status).toBe(503);expect((await response.json()).products).toBeUndefined();
  });
});
