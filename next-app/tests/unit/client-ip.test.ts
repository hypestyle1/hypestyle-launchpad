import { describe, it, expect } from 'vitest';
import { parseClientIp, esIpValida } from '@/lib/client-ip';

/**
 * La IP del visitante sale de los headers que escribe Vercel. La auditoría del
 * 17/10 encontró 931 pedidos sin IP; estas funciones son la base de la
 * trazabilidad nueva — un parseo permisivo guardaría basura en los pedidos y
 * uno estricto dejaría todo vacío como hasta ahora.
 */
describe('parseClientIp', () => {
  it('prefiere x-real-ip cuando es válida', () => {
    expect(parseClientIp('190.190.1.2', '10.0.0.1, 190.190.1.2')).toBe('190.190.1.2');
  });

  it('cae al primer valor de x-forwarded-for', () => {
    expect(parseClientIp(null, '181.45.33.9, 76.76.21.21')).toBe('181.45.33.9');
  });

  it('IPv6 pasa', () => {
    expect(parseClientIp('2800:810:4a9:7e0::1', null)).toBe('2800:810:4a9:7e0::1');
  });

  it('sin headers (local, tests) → null', () => {
    expect(parseClientIp(null, null)).toBeNull();
    expect(parseClientIp('', '')).toBeNull();
  });

  it('basura con forma de header no pasa', () => {
    expect(parseClientIp('unknown', 'spoofed<script>, 1.2.3.4')).toBeNull();
    expect(parseClientIp('999.1.1.1', null)).toBeNull();
  });
});

describe('esIpValida', () => {
  it.each(['0.0.0.0', '255.255.255.255', '181.47.0.1'])('acepta %s', (ip) => {
    expect(esIpValida(ip)).toBe(true);
  });
  it.each(['256.1.1.1', '1.2.3', 'abc', '1.2.3.4.5', ''])('rechaza %s', (ip) => {
    expect(esIpValida(ip)).toBe(false);
  });
});
