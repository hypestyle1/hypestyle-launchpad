import { describe, it, expect } from 'vitest';
import {
  FREE_SHIPPING_THRESHOLD,
  ahorroSucursal,
  alcanzaUmbral,
  costoEnvio,
  envioBonificado,
  incluyeEnvioGratis,
  modoDeTarifa,
  ordenarTarifas,
  tarifaPorDefecto,
  type TarifaEnvio,
} from '@/lib/envio';

// Lo que devolvió el cotizador para CP 1425 el 29/09/2026, en el orden en que llega.
const ESTANDAR: TarifaEnvio = { id: 'andreani_pyme_estándar', label: 'Andreani (estándar)', cost: 8331.43 };
const SUCURSAL: TarifaEnvio = { id: 'andreani_pyme_sucursal', label: 'Andreani (sucursal)', cost: 5555.74 };
const LLEGA_HOY: TarifaEnvio = { id: 'andreani_pyme_llega hoy', label: 'Andreani (llega hoy)', cost: 12742.2 };
const TARIFAS = [ESTANDAR, SUCURSAL, LLEGA_HOY];

const BAJO = { subtotalFisico: 81358 };
const SOBRE = { subtotalFisico: 195000 };

describe('modoDeTarifa', () => {
  it('reconoce la sucursal por id o por label', () => {
    expect(modoDeTarifa(SUCURSAL)).toBe('sucursal');
    expect(modoDeTarifa({ id: 'otra', label: 'Retiro en Sucursal' })).toBe('sucursal');
  });
  it('todo lo demás es domicilio', () => {
    expect(modoDeTarifa(ESTANDAR)).toBe('domicilio');
    expect(modoDeTarifa(LLEGA_HOY)).toBe('domicilio');
  });
});

describe('orden y preselección', () => {
  it('sucursal va primera y después los domicilios por precio', () => {
    expect(ordenarTarifas(TARIFAS).map((t) => t.id)).toEqual([SUCURSAL.id, ESTANDAR.id, LLEGA_HOY.id]);
  });
  it('no toca el arreglo original', () => {
    ordenarTarifas(TARIFAS);
    expect(TARIFAS[0]).toBe(ESTANDAR);
  });
  it('queda elegida la sucursal', () => {
    expect(tarifaPorDefecto(TARIFAS)).toBe(SUCURSAL);
  });
  it('sin sucursal para ese CP, el domicilio más barato', () => {
    expect(tarifaPorDefecto([LLEGA_HOY, ESTANDAR])).toBe(ESTANDAR);
  });
  it('sin tarifas, nada', () => {
    expect(tarifaPorDefecto([])).toBeNull();
  });
});

describe('ahorroSucursal', () => {
  it('es la resta de los dos precios que se ven en pantalla', () => {
    // $ 8.331 − $ 5.556
    expect(ahorroSucursal(TARIFAS)).toBe(2775);
  });
  it('compara contra el domicilio más barato, no contra llega hoy', () => {
    expect(ahorroSucursal([LLEGA_HOY, SUCURSAL, ESTANDAR])).toBe(2775);
  });
  it('es 0 si falta alguna de las dos opciones', () => {
    expect(ahorroSucursal([ESTANDAR, LLEGA_HOY])).toBe(0);
    expect(ahorroSucursal([SUCURSAL])).toBe(0);
  });
  it('es 0 si la sucursal no es más barata', () => {
    expect(ahorroSucursal([SUCURSAL, { ...ESTANDAR, cost: 5000 }])).toBe(0);
  });
});

describe('regla de bonificación', () => {
  it('bajo el umbral con sucursal: paga la sucursal', () => {
    expect(envioBonificado('sucursal', BAJO)).toBe(false);
    expect(costoEnvio(SUCURSAL, TARIFAS, BAJO)).toBe(5555.74);
  });
  it('sobre el umbral con sucursal: gratis', () => {
    expect(envioBonificado('sucursal', SOBRE)).toBe(true);
    expect(costoEnvio(SUCURSAL, TARIFAS, SOBRE)).toBe(0);
  });
  it('bajo el umbral con domicilio: paga el domicilio entero', () => {
    expect(envioBonificado('domicilio', BAJO)).toBe(false);
    expect(costoEnvio(ESTANDAR, TARIFAS, BAJO)).toBe(8331.43);
  });
  it('sobre el umbral con domicilio: paga la diferencia contra la sucursal', () => {
    expect(envioBonificado('domicilio', SOBRE)).toBe(false);
    expect(costoEnvio(ESTANDAR, TARIFAS, SOBRE)).toBe(2775);
    expect(costoEnvio(LLEGA_HOY, TARIFAS, SOBRE)).toBe(12742 - 5556);
  });
  it('el umbral exacto ya bonifica', () => {
    const justo = { subtotalFisico: FREE_SHIPPING_THRESHOLD };
    expect(costoEnvio(SUCURSAL, TARIFAS, justo)).toBe(0);
    expect(costoEnvio(SUCURSAL, TARIFAS, { subtotalFisico: FREE_SHIPPING_THRESHOLD - 1 })).toBe(5555.74);
  });
  it('sobre el umbral y sin sucursal en el CP: se bonifica la opción más barata', () => {
    const sinSucursal = [ESTANDAR, LLEGA_HOY];
    expect(costoEnvio(ESTANDAR, sinSucursal, SOBRE)).toBe(0);
    expect(costoEnvio(LLEGA_HOY, sinSucursal, SOBRE)).toBe(12742 - 8331);
  });
});

describe('cupón de envío gratis', () => {
  const cupon = { cuponEnvioGratis: true };
  it('bajo el umbral cubre los dos modos', () => {
    expect(envioBonificado('sucursal', { ...BAJO, ...cupon })).toBe(true);
    expect(envioBonificado('domicilio', { ...BAJO, ...cupon })).toBe(true);
    expect(costoEnvio(SUCURSAL, TARIFAS, { ...BAJO, ...cupon })).toBe(0);
    expect(costoEnvio(ESTANDAR, TARIFAS, { ...BAJO, ...cupon })).toBe(0);
  });
  it('sobre el umbral también saca la diferencia del domicilio', () => {
    expect(costoEnvio(ESTANDAR, TARIFAS, { ...SOBRE, ...cupon })).toBe(0);
    expect(costoEnvio(LLEGA_HOY, TARIFAS, { ...SOBRE, ...cupon })).toBe(0);
  });
});

describe('envíos al exterior', () => {
  const FEDEX: TarifaEnvio = { id: 'fedex_international', label: 'FedEx International', cost: 85000 };
  const afuera = { subtotalFisico: 500000, internacional: true };
  it('no alcanzan el umbral con ningún monto', () => {
    expect(alcanzaUmbral(afuera)).toBe(false);
    expect(alcanzaUmbral({ subtotalFisico: 500000 })).toBe(true);
  });
  it('pagan el envío entero', () => {
    expect(envioBonificado('domicilio', afuera)).toBe(false);
    expect(costoEnvio(FEDEX, [FEDEX], afuera)).toBe(85000);
  });
  it('el cupón de envío gratis tampoco los bonifica', () => {
    const conCupon = { ...afuera, cuponEnvioGratis: true };
    expect(envioBonificado('domicilio', conCupon)).toBe(false);
    expect(costoEnvio(FEDEX, [FEDEX], conCupon)).toBe(85000);
  });
});

describe('productos con el envío incluido', () => {
  const CON_HOODIE = { subtotalFisico: 110000, productoConEnvioGratis: true };

  it('reconoce los slugs de la lista', () => {
    expect(incluyeEnvioGratis(['regular-tee-black', 'hype-distressed-grey-hoodie'])).toBe(true);
    expect(incluyeEnvioGratis(['regular-tee-black'])).toBe(false);
    expect(incluyeEnvioGratis([])).toBe(false);
  });
  it('la sucursal sale gratis aunque no se llegue al umbral', () => {
    expect(alcanzaUmbral(CON_HOODIE)).toBe(true);
    expect(costoEnvio(SUCURSAL, TARIFAS, CON_HOODIE)).toBe(0);
    expect(envioBonificado('sucursal', CON_HOODIE)).toBe(true);
  });
  it('el domicilio paga la diferencia contra la sucursal', () => {
    expect(costoEnvio(ESTANDAR, TARIFAS, CON_HOODIE)).toBe(8331 - 5556);
    expect(envioBonificado('domicilio', CON_HOODIE)).toBe(false);
  });
  it('al exterior no aplica', () => {
    expect(alcanzaUmbral({ ...CON_HOODIE, internacional: true })).toBe(false);
  });
});
