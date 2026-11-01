import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const { setState, replace } = vi.hoisted(() => ({ setState: vi.fn(), replace: vi.fn() }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [initial === '' ? 'test-only' : initial, setState],
  useEffect: vi.fn(),
  useRef: () => ({ current: { select: vi.fn() } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/components/cyber/CyberWordmark', () => ({ default: () => null }));
import AccesoPage from '@/app/acceso/page';

function findForm(node: ReactElement<any>): ReactElement<any> | undefined {
  if (node.type === 'form') return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child && typeof child === 'object') {
      const found = findForm(child);
      if (found) return found;
    }
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('mensaje del gate', () => {
  it.each([
    [500, { ok: false }, 'No se pudo verificar. Probá de nuevo.'],
    [401, { ok: false }, 'Esa clave no es.'],
    [503, { ok: false }, 'El acceso no está configurado. Contactanos para que lo revisemos.'],
  ])('distingue HTTP %s', async (status, body, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
    await findForm(AccesoPage())!.props.onSubmit({ preventDefault: vi.fn() });
    expect(setState).toHaveBeenCalledWith(message);
    expect(replace).not.toHaveBeenCalled();
    if (status !== 401) expect(setState).not.toHaveBeenCalledWith('Esa clave no es.');
  });
  it('despues del login carga la tienda con la cookie nueva, sin reutilizar router cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    const locationReplace = vi.fn();
    vi.stubGlobal('window', { location: { replace: locationReplace } });
    await findForm(AccesoPage())!.props.onSubmit({ preventDefault: vi.fn() });
    expect(locationReplace).toHaveBeenCalledWith('/');
  });
});
