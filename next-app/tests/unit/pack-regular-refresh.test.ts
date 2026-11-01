import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ effect: undefined as (() => void | (() => void)) | undefined, refetch: vi.fn(), invalidate: vi.fn(), data: undefined as any, options: undefined as any }));
vi.mock('react', () => ({ useEffect: (effect: () => void) => { mocks.effect = effect; } }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: (options: any) => { mocks.options = options; return { data: mocks.data, refetch: mocks.refetch }; },
}));
import { usePackRegularUnidades } from '@/hooks/usePackRegularUnidades';
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('refresco del pack en la frontera horaria', () => {
  it('consulta al servidor al abrir, sin activar el pack por el reloj del navegador', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    mocks.data = { unidades: 3, serverTime: '2026-11-01T21:59:59Z', desde: '2026-11-01T22:00:00Z', hasta: '2026-11-05T03:00:00Z' };
    expect(usePackRegularUnidades()).toBe(3);
    const cleanup = mocks.effect!();
    vi.advanceTimersByTime(1049);
    expect(mocks.refetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['products'] });
    expect(mocks.options.refetchInterval).toBe(15000);
    if (typeof cleanup === 'function') cleanup();
  });
  it('cancela el timer anterior cuando cambia la respuesta', () => {
    vi.useFakeTimers();
    mocks.data = { unidades: 3, serverTime: '2026-11-01T21:59:59Z', desde: '2026-11-01T22:00:00Z', hasta: '2026-11-05T03:00:00Z' };
    usePackRegularUnidades();
    const cleanup = mocks.effect!();
    if (typeof cleanup === 'function') cleanup();
    vi.advanceTimersByTime(2000);
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
