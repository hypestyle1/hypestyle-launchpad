import { describe, it, expect, afterEach } from 'vitest';
import { ANDREANI_METHOD_ID, esTarifaAndreani, lineasDeEnvio } from '@/lib/andreani-shipping-line';

afterEach(() => { delete process.env.ANDREANI_INSTANCE_ID; });

describe('lineasDeEnvio', () => {
  it('escribe el método de WooCommerce, no la tarifa', () => {
    expect(lineasDeEnvio('andreani_pyme_sucursal', 'Andreani (sucursal)', 5555.74)).toEqual([
      { method_id: 'andreani_flexipaas', instance_id: '1', method_title: 'Andreani (sucursal)', total: '5555.74' },
    ]);
  });
  it('vale para las tres tarifas', () => {
    for (const id of ['andreani_pyme_estándar', 'andreani_pyme_sucursal', 'andreani_pyme_llega hoy']) {
      expect(lineasDeEnvio(id, 'x', 100)[0].method_id).toBe(ANDREANI_METHOD_ID);
    }
  });
  it('con envío gratis crea la línea igual, en 0', () => {
    expect(lineasDeEnvio('andreani_pyme_sucursal', 'Andreani (sucursal)', 0)[0].total).toBe('0');
    expect(lineasDeEnvio('andreani_pyme_sucursal', 'Andreani (sucursal)', undefined)[0].total).toBe('0');
  });
  it('sin tarifa elegida no hay línea', () => {
    expect(lineasDeEnvio(undefined, 'x', 100)).toEqual([]);
    expect(lineasDeEnvio('', 'x', 100)).toEqual([]);
  });
  it('sin label usa la tarifa como título', () => {
    expect(lineasDeEnvio('andreani_pyme_sucursal', undefined, 1)[0].method_title).toBe('andreani_pyme_sucursal');
  });
  it('lo que no es de Andreani pasa como viene y sin instancia', () => {
    expect(lineasDeEnvio('retiro_local', 'Retiro', 0)).toEqual([
      { method_id: 'retiro_local', method_title: 'Retiro', total: '0' },
    ]);
  });
  it('la instancia se puede pisar por variable de entorno', () => {
    process.env.ANDREANI_INSTANCE_ID = ' 7 ';
    expect(lineasDeEnvio('andreani_pyme_sucursal', 'x', 1)[0].instance_id).toBe('7');
  });
});

describe('esTarifaAndreani', () => {
  it('reconoce las tarifas del cotizador', () => {
    expect(esTarifaAndreani('andreani_pyme_estándar')).toBe(true);
    expect(esTarifaAndreani('fedex_international')).toBe(false);
    expect(esTarifaAndreani(null)).toBe(false);
  });
});
