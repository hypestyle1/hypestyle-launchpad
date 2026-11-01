import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ effect: undefined as any, setLive: vi.fn(), state: false, queryOptions: undefined as any, queryData: undefined as any, error: false, refetch: vi.fn() }));
vi.mock('react', () => ({ useState: () => [mocks.state, mocks.setLive], useEffect: (effect: any) => { mocks.effect = effect; } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: any) => { mocks.queryOptions=options; return { data:mocks.queryData,isError:mocks.error,refetch:mocks.refetch }; } }));
import { cyberTransitionDelay, useCyberCatalogTransition } from '@/hooks/useCyberCatalogTransition';
const start=Date.parse('2026-11-01T19:00:00-03:00');
afterEach(()=> { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.state=false; mocks.queryData=undefined; mocks.error=false; });
describe('transición de precios Cyber en una pestaña abierta',()=>{
  it('espera la frontera del servidor y cancela el timer al desmontar',()=>{
    vi.useFakeTimers();
    vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
    vi.stubGlobal('document',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
    expect(cyberTransitionDelay(start-1000)).toBe(1000);
    expect(useCyberCatalogTransition(true,start-1000).preview).toBe(true);
    expect(mocks.queryOptions.enabled).toBe(false);
    const cleanup=mocks.effect();
    vi.advanceTimersByTime(1049);expect(mocks.setLive).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(mocks.setLive).toHaveBeenCalledWith(true);
    cleanup();
  });
  it('retira preview y catálogo cacheado mientras carga la lectura efectiva',()=>{
    mocks.state=true;
    const state=useCyberCatalogTransition(true,start-1000);
    expect(state.preview).toBe(false);expect(state.updating).toBe(true);expect(state.products).toBeUndefined();
    expect(mocks.queryOptions.queryKey).toEqual(['cyber-products-live']);
    expect(mocks.queryOptions.staleTime).toBe(0);
  });
  it('muestra únicamente la respuesta de Woo autorizada por hora del servidor',()=>{
    mocks.state=true;
    mocks.queryData={active:true,products:[{slug:'regular-tee-black',price:25900}],serverTime:start};
    const state=useCyberCatalogTransition(true,start-1000);
    expect(state.preview).toBe(false);expect(state.updating).toBe(false);expect(state.products?.[0].price).toBe(25900);
  });
  it('ante fallo no vuelve a presentar el snapshot como precio efectivo',()=>{
    mocks.state=true;mocks.error=true;
    const state=useCyberCatalogTransition(true,start-1000);
    expect(state.preview).toBe(false);expect(state.updating).toBe(true);expect(state.error).toBe(true);
  });
});
