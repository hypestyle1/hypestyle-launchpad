import { describe, expect, it } from 'vitest';
import { descuentos, envioNacional, preciosDeLineas, PrecioError } from '@/lib/precio-servidor';
import { totalCobrable } from '@/lib/total-cobrable';
import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';

/**
 * Auditoría de seguridad 28/09, hallazgo C1: el precio, el descuento y el envío
 * de cada pedido los decidía el navegador. Estos tests fijan que ahora los
 * decide el servidor, sin importar lo que venga en el body.
 */
const catalogo = new Map([
  ['remera', 40000],
  ['buzo', 80000],
  [GOAL_DISCOUNT_SLUG, 100000],
]);

describe('preciosDeLineas', () => {
  it('ignora el precio que manda el navegador y usa el de la tienda', () => {
    const l = preciosDeLineas([{ id: 'remera', price: 1, quantity: 2 }], catalogo);
    expect(l).toEqual([{ id: 'remera', price: 40000, quantity: 2 }]);
  });

  it('un producto que no está en el catálogo no se puede comprar', () => {
    expect(() => preciosDeLineas([{ id: 'inventado', price: 1, quantity: 1 }], catalogo)).toThrow(PrecioError);
  });

  it('cantidades raras se rechazan', () => {
    expect(() => preciosDeLineas([{ id: 'remera', quantity: 0 }], catalogo)).toThrow(PrecioError);
    expect(() => preciosDeLineas([{ id: 'remera', quantity: -3 }], catalogo)).toThrow(PrecioError);
    expect(() => preciosDeLineas([{ id: 'remera', quantity: 1000 }], catalogo)).toThrow(PrecioError);
  });

  it('gift card: vale el monto elegido solo si es uno permitido', () => {
    expect(preciosDeLineas([{ id: 'gift-card', price: 150000, quantity: 1 }], catalogo)[0].price).toBe(150000);
    expect(() => preciosDeLineas([{ id: 'gift-card', price: 1, quantity: 1 }], catalogo)).toThrow(PrecioError);
    expect(() => preciosDeLineas([{ id: 'gift-card', price: 123456, quantity: 1 }], catalogo)).toThrow(PrecioError);
  });

  it('LA NUESTRA toma el descuento por gol activo aunque el catálogo esté cacheado', () => {
    const [l] = preciosDeLineas([{ id: GOAL_DISCOUNT_SLUG, price: 1, quantity: 1 }], catalogo, { precioGol: 85000 });
    expect(l.price).toBe(85000);
    const [sin] = preciosDeLineas([{ id: GOAL_DISCOUNT_SLUG, price: 1, quantity: 1 }], catalogo, { precioGol: null });
    expect(sin.price).toBe(100000);
  });
});

describe('descuentos', () => {
  const base = { metodo: 'tarjeta', internacional: false, campeonActivo: false, tresPorDosActivo: false };
  const lineas = [
    { id: 'remera', price: 40000, quantity: 2 },
    { id: 'buzo', price: 80000, quantity: 1 },
    { id: 'gift-card', price: 100000, quantity: 1 },
  ];

  it('sin promos ni transferencia no hay descuento', () => {
    expect(descuentos(lineas, base)).toEqual({ monto: 0, etiqueta: undefined });
  });

  it('transferencia: 10% solo sobre lo físico, no sobre la gift card', () => {
    expect(descuentos(lineas, { ...base, metodo: 'transferencia' })).toEqual({ monto: 16000, etiqueta: 'Transferencia (10%)' });
  });

  it('3x2: la más barata gratis, sumado a la transferencia', () => {
    const d = descuentos(lineas, { ...base, metodo: 'transferencia', tresPorDosActivo: true });
    expect(d).toEqual({ monto: 40000 + 16000, etiqueta: '3x2 + Transferencia (10%)' });
  });

  it('CAMPEON50 tiene prioridad y no se suma con el 3x2', () => {
    const d = descuentos(lineas, { ...base, campeonActivo: true, tresPorDosActivo: true });
    expect(d).toEqual({ monto: 80000, etiqueta: 'CAMPEON50' });
  });

  it('internacional: ni promos locales ni 10% de transferencia', () => {
    const d = descuentos(lineas, { ...base, metodo: 'transferencia', internacional: true, tresPorDosActivo: true });
    expect(d.monto).toBe(0);
  });
});

describe('envioNacional', () => {
  const tarifas = [
    { id: 'andreani_sucursal', label: 'Andreani (sucursal)', cost: 5555.6 },
    { id: 'andreani_estandar', label: 'Andreani (estándar)', cost: 8331 },
  ];

  it('usa el costo del tarifario, no el del navegador', () => {
    const e = envioNacional({ tarifas, tarifaId: 'andreani_estandar', costoCliente: 0, subtotalFisico: 50000, cuponEnvioGratis: false });
    expect(e).toMatchObject({ verificado: true, costo: 8331 });
  });

  it('una tarifa que no está entre las opciones se rechaza', () => {
    expect(() => envioNacional({ tarifas, tarifaId: 'gratis_inventado', costoCliente: 0, subtotalFisico: 50000, cuponEnvioGratis: false }))
      .toThrow(PrecioError);
  });

  it('sin tarifa elegida usa la de sucursal (el checkout lo permite con envío gratis)', () => {
    const e = envioNacional({ tarifas, tarifaId: null, costoCliente: 0, subtotalFisico: 50000, cuponEnvioGratis: false });
    expect(e).toMatchObject({ verificado: true, costo: 5556 });
  });

  it('cupón de envío gratis: cero', () => {
    const e = envioNacional({ tarifas, tarifaId: 'andreani_estandar', costoCliente: 999, subtotalFisico: 50000, cuponEnvioGratis: true });
    expect(e.costo).toBe(0);
  });

  it('si Andreani no responde, se usa lo que vio el cliente (nunca negativo) y queda sin verificar', () => {
    expect(envioNacional({ tarifas: null, tarifaId: 'x', costoCliente: 6000, subtotalFisico: 50000, cuponEnvioGratis: false }))
      .toMatchObject({ verificado: false, costo: 6000 });
    expect(envioNacional({ tarifas: null, tarifaId: 'x', costoCliente: -500, subtotalFisico: 50000, cuponEnvioGratis: false }).costo).toBe(0);
  });

  it('solo gift cards: no hay envío', () => {
    expect(envioNacional({ tarifas, tarifaId: null, costoCliente: 5000, subtotalFisico: 0, cuponEnvioGratis: false }).costo).toBe(0);
  });
});

describe('totalCobrable', () => {
  it('cobra el total del pedido', () => {
    expect(totalCobrable({ status: 'pending', total: '122256.00' })).toEqual({ ok: true, total: 122256 });
  });
  it('no cobra pedidos ya pagos, cancelados ni sin total', () => {
    expect(totalCobrable({ status: 'processing', total: '100' }).ok).toBe(false);
    expect(totalCobrable({ status: 'cancelled', total: '100' }).ok).toBe(false);
    expect(totalCobrable({ status: 'pending', total: '0' }).ok).toBe(false);
    expect(totalCobrable(null).ok).toBe(false);
  });
});
