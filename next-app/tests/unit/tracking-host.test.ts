import { describe, it, expect } from 'vitest';
import { isProductionHost, isProductionUrl } from '@/lib/tracking-host';

/**
 * El pixel de Meta, GA4, Clarity y el relay de CAPI solo miden desde el dominio
 * real. El 17/09/2026 se encontró que los e2e (next start en 127.0.0.1:3100) y
 * las corridas locales inflaban el InitiateCheckout del pixel de producción.
 */
describe('tracking-host', () => {
  it('acepta solo el dominio del sitio', () => {
    expect(isProductionHost('hypestyle.com.ar')).toBe(true);
    expect(isProductionHost('www.hypestyle.com.ar')).toBe(true);
    expect(isProductionHost('HypeStyle.com.ar ')).toBe(true);
  });

  it('rechaza local, e2e, previews de Vercel y el WordPress', () => {
    for (const h of ['127.0.0.1', 'localhost', 'next-muxysj6af-hypes-projects.vercel.app',
      'lightpink-rook-704850.hostingersite.com', 'hypestyle.com.ar.evil.com', '', null, undefined]) {
      expect(isProductionHost(h)).toBe(false);
    }
  });

  it('lee el host de un event_source_url', () => {
    expect(isProductionUrl('https://hypestyle.com.ar/checkout/?gocuotas=failed')).toBe(true);
    expect(isProductionUrl('http://127.0.0.1:3100/checkout')).toBe(false);
    expect(isProductionUrl('http://localhost:3000/checkout')).toBe(false);
    expect(isProductionUrl('no es una url')).toBe(false);
    expect(isProductionUrl(undefined)).toBe(false);
  });
});
