import { describe, it, expect } from 'vitest';
import { attributionOrderMeta, sanitizeAttribution } from '@/lib/attribution';

const toObj = (meta: { key: string; value: string }[]) => Object.fromEntries(meta.map((m) => [m.key, m.value]));

describe('atribución en el pedido', () => {
  it('pasa los utm del ad a las claves nativas de Woo', () => {
    const meta = toObj(attributionOrderMeta({
      utm_source: 'meta',
      utm_campaign: 'regular-tees-ss27',
      utm_content: '12d',
      fbclid: 'IwAR123',
      landing: '/producto/regular-tees-3-pack',
    }));
    expect(meta).toEqual({
      _wc_order_attribution_source_type: 'utm',
      _wc_order_attribution_utm_source: 'meta',
      _wc_order_attribution_utm_campaign: 'regular-tees-ss27',
      _wc_order_attribution_utm_content: '12d',
      _wc_order_attribution_session_entry: '/producto/regular-tees-3-pack',
      _hs_fbclid: 'IwAR123',
    });
  });

  it('sin utm: referral si vino de otro sitio, typein si entró directo', () => {
    expect(toObj(attributionOrderMeta({ referrer: 'https://l.instagram.com/', landing: '/' }))._wc_order_attribution_source_type).toBe('referral');
    expect(toObj(attributionOrderMeta({ landing: '/' }))._wc_order_attribution_source_type).toBe('typein');
  });

  it('sin datos no agrega nada', () => {
    expect(attributionOrderMeta(undefined)).toEqual([]);
    expect(attributionOrderMeta({})).toEqual([]);
    expect(attributionOrderMeta('basura')).toEqual([]);
  });

  it('descarta lo que no es string, recorta el largo y saca caracteres de control', () => {
    const a = sanitizeAttribution({
      utm_source: 'meta\n\u0000',
      utm_campaign: 'x'.repeat(500),
      utm_medium: 42,
      otra_cosa: 'no va',
    });
    expect(a).toEqual({ utm_source: 'meta', utm_campaign: 'x'.repeat(200) });
  });
});
