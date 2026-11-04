import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),cached:vi.fn()}));
vi.mock('@/lib/products-server',()=>({fetchAllProductsStrict:mocks.fetch}));
vi.mock('@/lib/catalog',()=>({SLUGS_INTERNOS:new Set(['gift-card','sleeveless-ranglan','par-de-medias-hype'])}));
// unstable_cache: se registra que la lectura compartida pasa por la caché y se ejecuta la función real.
vi.mock('next/cache',()=>({unstable_cache:(fn:any,key:any,opts:any)=>(...a:any[])=>{mocks.cached(key,opts);return fn(...a);}}));
import { GET } from '@/app/api/cyber-products-live/route';
afterEach(()=>{vi.useRealTimers();vi.resetAllMocks();});
describe('lectura de precios efectivos Cyber',()=>{
  it('no adelanta ofertas antes de las 19:00',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T18:59:59-03:00'));
    const response=await GET();expect((await response.json()).active).toBe(false);expect(mocks.fetch).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('en la apertura (19:00) consulta Woo fresco y sin caché',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-01T19:00:00-03:00'));
    mocks.fetch.mockResolvedValue([{slug:'regular-tee-black',price:25900},{slug:'gift-card',price:50000}]);
    const response=await GET();expect(await response.json()).toMatchObject({active:true,products:[{price:25900}]});
    expect(mocks.fetch).toHaveBeenCalledWith(true);expect(mocks.cached).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('después de la apertura: una lectura fresca compartida por minuto + CDN 30 s (incidente MySQL 4/11)',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-04T12:08:00-03:00'));
    mocks.fetch.mockResolvedValue([{slug:'regular-tee-black',price:25900},{slug:'gift-card',price:50000}]);
    const response=await GET();expect(await response.json()).toMatchObject({active:true,products:[{slug:'regular-tee-black'}]});
    expect(mocks.fetch).toHaveBeenCalledWith(true);
    expect(mocks.cached).toHaveBeenCalledWith(['cyber-products-live-v1'],{revalidate:60});
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=30');
  });
  it('falla explícitamente si Woo no responde, sin reutilizar precios de preview ni cachear el error',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-04T12:08:00-03:00'));mocks.fetch.mockRejectedValue(new Error('offline'));
    const response=await GET();expect(response.status).toBe(503);expect((await response.json()).products).toBeUndefined();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
