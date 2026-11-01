import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({effect:undefined as any,options:[] as any[],refetch:vi.fn(),clock:undefined as any}));
vi.mock('react',()=>({useEffect:(f:any)=>{mocks.effect=f;}}));
vi.mock('@tanstack/react-query',()=>({useQuery:(opts:any)=>{mocks.options.push(opts);return opts.queryKey[0]==='product'?{refetch:mocks.refetch}:{data:mocks.clock};}}));
vi.mock('@/lib/product-detail',()=>({fetchProductDetail:vi.fn()}));
import { useProduct } from '@/hooks/useProduct';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();mocks.options=[];mocks.clock=undefined;});
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
  it('refresca al recibir hora de servidor posterior a la apertura',()=>{
    mocks.clock={serverTime:'2026-11-01T22:00:01Z',desde:'2026-11-01T22:00:00Z'};
    useProduct('athletic-dept-white-tee');mocks.effect();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
  it('solo consulta Woo, con lectura fresh; no modifica precios ni fechas',async()=>{
    const {fetchProductDetail}=await import('@/lib/product-detail');
    useProduct('athletic-dept-white-tee');await mocks.options[0].queryFn();
    expect(fetchProductDetail).toHaveBeenCalledWith('athletic-dept-white-tee',{fresh:true});
    expect(mocks.options[0].refetchOnWindowFocus).toBe('always');
  });
});
