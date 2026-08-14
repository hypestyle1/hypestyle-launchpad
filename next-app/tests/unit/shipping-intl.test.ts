import { describe, it, expect } from 'vitest';
import {
  quoteIntlShipping,
  zoneForCountry,
  volumeForCategory,
  INTL_RATES,
} from '@/lib/shipping-intl';

/**
 * El escalón lo decide el VOLUMEN, no el peso: en Woo casi todos los productos
 * tienen 0,25 kg cargado. Los casos de "qué entra en un Pak" salen del
 * tarifario de Boxfly y están documentados en el módulo.
 */

const tee = (quantity: number) => ({ category: 'Tee', quantity });
const hoodie = (quantity: number) => ({ category: 'hoodie', quantity });

describe('zoneForCountry', () => {
  it('mapea los países del tarifario a su zona', () => {
    expect(zoneForCountry('US')).toBe('america');
    expect(zoneForCountry('ES')).toBe('europa');
    expect(zoneForCountry('JP')).toBe('asia');
    expect(zoneForCountry('AU')).toBe('oceania');
  });

  it('acepta el código en minúscula', () => {
    expect(zoneForCountry('us')).toBe('america');
  });

  it('manda a la zona más cara lo que el tarifario no cubre', () => {
    // Deliberado: conviene cobrar de más y devolver que cotizar por debajo.
    expect(zoneForCountry('ZA')).toBe('oceania');
    expect(zoneForCountry('')).toBe('oceania');
  });
});

describe('volumeForCategory', () => {
  it('entiende el vocabulario del cliente y el crudo de Woo', () => {
    // Si solo entendiera uno, el precio mostrado y el cobrado saldrían distintos.
    expect(volumeForCategory('Tee')).toBe(volumeForCategory('remera'));
    expect(volumeForCategory('Top')).toBe(volumeForCategory('musculosa'));
    expect(volumeForCategory('Jort')).toBe(volumeForCategory('short'));
  });

  it('resuelve "Pantalón" con acento y con mayúsculas', () => {
    expect(volumeForCategory('Pantalón')).toBe(4800);
    expect(volumeForCategory('PANTALON')).toBe(4800);
  });

  it('asume una prenda media si la categoría es desconocida', () => {
    expect(volumeForCategory('sombrero')).toBe(3600);
    expect(volumeForCategory(undefined)).toBe(3600);
  });
});

describe('quoteIntlShipping — escalón Pak', () => {
  it('5 remeras entran justo en el Pak', () => {
    const q = quoteIntlShipping('US', [tee(5)]);
    expect(q.tier).toBe('pak');
    expect(q.volumetricKg).toBe(2.4);
    expect(q.cost).toBe(INTL_RATES.america.pak);
    expect(q.packages).toBe(1);
  });

  it('1 buzo + 2 remeras entran justo en el Pak', () => {
    const q = quoteIntlShipping('ES', [hoodie(1), tee(2)]);
    expect(q.tier).toBe('pak');
    expect(q.volumetricKg).toBe(2.4);
    expect(q.cost).toBe(INTL_RATES.europa.pak);
  });

  it('1 buzo solo entra en el Pak', () => {
    const q = quoteIntlShipping('US', [hoodie(1)]);
    expect(q.tier).toBe('pak');
  });

  it('cobra la tarifa de la zona, no una fija', () => {
    const uno = [tee(1)];
    expect(quoteIntlShipping('US', uno).cost).toBe(INTL_RATES.america.pak);
    expect(quoteIntlShipping('ES', uno).cost).toBe(INTL_RATES.europa.pak);
    expect(quoteIntlShipping('AU', uno).cost).toBe(INTL_RATES.oceania.pak);
  });
});

describe('quoteIntlShipping — escalón caja', () => {
  it('6 remeras pasan a caja', () => {
    const q = quoteIntlShipping('US', [tee(6)]);
    expect(q.tier).toBe('box');
    expect(q.volumetricKg).toBe(2.88);
    expect(q.cost).toBe(INTL_RATES.america.box);
    expect(q.packages).toBe(1);
  });

  it('pasa a caja por peso real aunque el volumen entre en el Pak', () => {
    // Un accesorio chico pero pesado: 1200 cm³ (0,24 kg volumétricos) y 2 kg
    // reales. El tope de 1,5 kg reales del Pak manda.
    const q = quoteIntlShipping('US', [
      { category: 'accesorio', weightKg: 2, quantity: 1 },
    ]);
    expect(q.tier).toBe('box');
    expect(q.actualKg).toBe(2);
  });

  it('parte en varias cajas arriba de 5 kg facturables', () => {
    // 12 hoodies = 86.400 cm³ = 17,28 kg volumétricos → 4 cajas.
    const q = quoteIntlShipping('US', [hoodie(12)]);
    expect(q.tier).toBe('box');
    expect(q.volumetricKg).toBe(17.28);
    expect(q.packages).toBe(4);
    expect(q.cost).toBe(INTL_RATES.america.box * 4);
    expect(q.label).toContain('4 parcels');
  });

  it('factura por el mayor entre peso real y volumétrico', () => {
    // 8 kg reales en poco volumen: manda el peso real → 2 cajas.
    const q = quoteIntlShipping('US', [
      { category: 'accesorio', weightKg: 8, quantity: 1 },
    ]);
    expect(q.packages).toBe(2);
  });
});

describe('quoteIntlShipping — entradas defensivas', () => {
  it('un carrito vacío no rompe ni cobra de más', () => {
    const q = quoteIntlShipping('US', []);
    expect(q.tier).toBe('pak');
    expect(q.cost).toBe(INTL_RATES.america.pak);
    expect(Number.isFinite(q.cost)).toBe(true);
  });

  it('trata una cantidad inválida como 1 unidad', () => {
    const q = quoteIntlShipping('US', [{ category: 'Tee', quantity: 0 }]);
    expect(q.volumetricKg).toBe(quoteIntlShipping('US', [tee(1)]).volumetricKg);
  });

  it('usa el peso por defecto si Woo no trae ninguno', () => {
    expect(quoteIntlShipping('US', [tee(4)]).actualKg).toBe(1);
  });

  it('nunca devuelve un costo de 0', () => {
    // El bug que este módulo vino a arreglar: INTL_RATE era una constante en 0
    // y el cliente pagaba la mercadería sin saber el costo del envío.
    for (const country of ['US', 'ES', 'JP', 'AU', 'ZA']) {
      expect(quoteIntlShipping(country, [tee(1)]).cost).toBeGreaterThan(0);
      expect(quoteIntlShipping(country, [hoodie(20)]).cost).toBeGreaterThan(0);
    }
  });
});
