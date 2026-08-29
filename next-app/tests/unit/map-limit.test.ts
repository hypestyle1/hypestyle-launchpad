import { describe, it, expect } from 'vitest';
import { mapLimit } from '@/lib/map-limit';

describe('mapLimit', () => {
  it('devuelve los resultados en el orden de entrada', async () => {
    const input = [50, 10, 30, 5, 20];
    const out = await mapLimit(input, 2, async (ms) => {
      await new Promise(r => setTimeout(r, ms));
      return ms * 2;
    });
    expect(out).toEqual([100, 20, 60, 10, 40]);
  });

  it('nunca supera la concurrencia pedida', async () => {
    let running = 0;
    let peak = 0;
    await mapLimit(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise(r => setTimeout(r, 5));
      running--;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('propaga el primer error', async () => {
    await expect(
      mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('funciona con lista vacía', async () => {
    expect(await mapLimit([], 3, async (x) => x)).toEqual([]);
  });
});
