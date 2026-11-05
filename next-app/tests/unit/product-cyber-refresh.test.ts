import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({effect:undefined as any,options:[] as any[],refetch:vi.fn(),clock:undefined as any,updatedAt:0}));
vi.mock('react',()=>({useEffect:(f:any)=>{mocks.effect=f;},useRef:(v:any)=>({current:v})}));
vi.mock('@tanstack/react-query',()=>({useQuery:(opts:any)=>{mocks.options.push(opts);return opts.queryKey[0]==='product'?{refetch:mocks.refetch,dataUpdatedAt:mocks.updatedAt}:{data:mocks.clock};}}));
vi.mock('@/lib/product-detail',()=>({fetchProductDetail:vi.fn()}));
import { useProduct, PRODUCT_STALE_MS } from '@/hooks/useProduct';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();mocks.options=[];mocks.clock=undefined;mocks.updatedAt=0;});
describe('ficha abierta al comenzar Cyber',()=>{
  it('consulta al llegar a las 19 con reloj del servidor, sin depender del foco',()=>{
    vi.useFakeTimers();
    mocks.clock={serverTime:'2026-11-01T21:59:59Z',desde:'2026-11-01T22:00:00Z'};
    useProduct('worn-varsity-club-white-tee');
    const cleanup=mocks.effect();
    vi.advanceTimersByTime(1049);expect(mocks.refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(mocks.refetch).toHaveBeenCalledOnce();
    cleanup();
  });
  it('refresca al recibir hora de servidor posterior a la apertura si el dato es de antes',()=>{
    mocks.clock={serverTime:'2026-11-01T22:00:01Z',desde:'2026-11-01T22:00:00Z'};
    useProduct('athletic-dept-white-tee');mocks.effect();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
  it('NO refresca si el dato en pantalla ya es posterior a la frontera (incidente MySQL 4/11)',()=>{
    mocks.clock={serverTime:'2026-11-04T15:00:00Z',desde:'2026-11-01T22:00:00Z'};
    mocks.updatedAt=Date.parse('2026-11-04T14:59:00Z');
    useProduct('athletic-dept-white-tee',{slug:'x'} as any,mocks.updatedAt);mocks.effect();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
  it('refresca justo al terminar el Cyber',()=>{
    vi.useFakeTimers();
    mocks.clock={serverTime:'2026-11-09T02:59:30Z',desde:'2026-11-01T22:00:00Z'};
    mocks.updatedAt=Date.parse('2026-11-09T02:59:00Z');
    useProduct('athletic-dept-white-tee');const cleanup=mocks.effect();
    vi.advanceTimersByTime(30_049);expect(mocks.refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(mocks.refetch).toHaveBeenCalledOnce();
    cleanup();
  });
  it('solo consulta Woo, con lectura fresh; no modifica precios ni fechas',async()=>{
    const {fetchProductDetail}=await import('@/lib/product-detail');
    useProduct('athletic-dept-white-tee');await mocks.options[0].queryFn();
    expect(fetchProductDetail).toHaveBeenCalledWith('athletic-dept-white-tee',{fresh:true});
    // Al volver a la pestaña re-pide solo si el dato está viejo (antes: siempre).
    expect(mocks.options[0].refetchOnWindowFocus).toBe(true);
  });
  it('durante el Cyber refresca cada 3 min (antes 30 s) y fuera del Cyber no sondea',()=>{
    vi.useFakeTimers();
    useProduct('a');const opts=mocks.options[0];
    vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));expect(opts.refetchInterval()).toBe(PRODUCT_STALE_MS);
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));expect(opts.refetchInterval()).toBe(false);
    expect(PRODUCT_STALE_MS).toBeLessThanOrEqual(180_000);
  });
  it('pasa la edad del dato del servidor; sin timestamp lo trata como viejo',()=>{
    useProduct('a',{slug:'a'} as any,123);expect(mocks.options[0].initialDataUpdatedAt).toBe(123);
    useProduct('a',{slug:'a'} as any);expect(mocks.options[2].initialDataUpdatedAt).toBe(0);
  });
});
