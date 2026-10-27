import { describe, it, expect } from 'vitest';
import { entregaDeOrden, parseSucursal, esSucursalSinDefinir, compararSucursal } from '@/lib/orders-entrega';

/**
 * Candados del caso #4054: el pedido iba a la sucursal de San Martín 2002 y el
 * panel mostraba la dirección de facturación. Los datos estaban; la pantalla no
 * los decía. Lo que estos tests fijan:
 *
 *   - un pedido a sucursal se reconoce como tal y expone nombre, dirección y código;
 *   - nunca se infiere el destino de la dirección de envío;
 *   - cuando el dato falta, `incompleto` es true y hay un `faltante` para mostrar.
 *
 * Las formas vienen de producción (1.132 pedidos, 25/10/2026).
 */

const meta = (obj: Record<string, string>) => (k: string) => obj[k] ?? '';

describe('#4054: envío a sucursal', () => {
  const linea = [{ method_title: 'Andreani (sucursal)', method_id: 'andreani_flexipaas' }];
  const m4054 = meta({
    _chosen_shipping: 'andreani_pyme_sucursal',
    _shipping_branch: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida',
    _shipping_branch_code: 'HOP8754',
  });

  it('se reconoce como sucursal y trae nombre, dirección y código', () => {
    const e = entregaDeOrden(linea, m4054);
    expect(e.tipo).toBe('sucursal');
    expect(e.etiqueta).toBe('Sucursal Andreani');
    expect(e.sucursal).toEqual({
      nombre: 'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002',
      direccion: 'Gral José de San Martín 2002, Florida',
      codigo: 'HOP8754',
    });
    expect(e.incompleto).toBe(false);
  });

  it('la tarifa alcanza aunque el título de la línea cambie en Ajustes', () => {
    const e = entregaDeOrden([{ method_title: 'Andreani', method_id: 'andreani_flexipaas' }], m4054);
    expect(e.tipo).toBe('sucursal');
    expect(e.sucursal?.codigo).toBe('HOP8754');
  });

  it('expone la tarifa, que es lo que lee el plugin de Andreani', () => {
    expect(entregaDeOrden(linea, m4054).tarifa).toBe('andreani_pyme_sucursal');
  });
});

describe('cuando el dato de la sucursal no alcanza, se declara', () => {
  const linea = [{ method_title: 'Andreani (sucursal)', method_id: 'andreani_flexipaas' }];

  it('a sucursal sin ninguna meta de sucursal: incompleto, y no se inventa', () => {
    const e = entregaDeOrden(linea, meta({ _chosen_shipping: 'andreani_pyme_sucursal' }));
    expect(e.tipo).toBe('sucursal');
    expect(e.sucursal).toBeNull();
    expect(e.incompleto).toBe(true);
    expect(e.faltante).toMatch(/no quedó guardada cuál/);
  });

  it('"A COORDINAR" no es una sucursal: hay que hablar con el cliente', () => {
    const e = entregaDeOrden(linea, meta({
      _chosen_shipping: 'andreani_pyme_sucursal',
      _shipping_branch: 'A COORDINAR — no se encontraron sucursales para el CP',
    }));
    expect(e.sucursal).toBeNull();
    expect(e.incompleto).toBe(true);
    expect(e.faltante).toMatch(/coordinar la sucursal/);
  });

  it('con nombre pero sin código: incompleto, porque Andreani despacha con el código', () => {
    const e = entregaDeOrden(linea, meta({
      _chosen_shipping: 'andreani_pyme_sucursal',
      _shipping_branch: 'PUNTO ANDREANI HOP RIVERA 1023 — Rivera 1023, Villa Celina',
    }));
    expect(e.sucursal?.nombre).toBe('PUNTO ANDREANI HOP RIVERA 1023');
    expect(e.sucursal?.codigo).toBe('');
    expect(e.incompleto).toBe(true);
    expect(e.faltante).toMatch(/código de sucursal/);
  });

  it('esSucursalSinDefinir reconoce la marca del checkout', () => {
    expect(esSucursalSinDefinir('A COORDINAR — prueba')).toBe(true);
    expect(esSucursalSinDefinir('a coordinar')).toBe(true);
    expect(esSucursalSinDefinir('PUNTO ANDREANI HOP PILAR')).toBe(false);
  });
});

describe('el resto de los caminos de entrega', () => {
  it('domicilio: ninguna meta de sucursal, y no se marca incompleto', () => {
    const e = entregaDeOrden(
      [{ method_title: 'Andreani (estándar)', method_id: 'andreani_flexipaas' }],
      meta({ _chosen_shipping: 'andreani_pyme_estándar' }),
    );
    expect(e.tipo).toBe('domicilio');
    expect(e.sucursal).toBeNull();
    expect(e.incompleto).toBe(false);
  });

  it('"Andreani (llega hoy)" también es domicilio', () => {
    expect(entregaDeOrden([{ method_title: 'Andreani (llega hoy)' }], meta({})).tipo).toBe('domicilio');
  });

  it('DHL y FedEx son internacional', () => {
    expect(entregaDeOrden([{ method_title: 'International Shipping — DHL Express' }], meta({})).tipo).toBe('internacional');
    expect(entregaDeOrden([{ method_title: 'FedEx International — Americas' }], meta({})).tipo).toBe('internacional');
  });

  it('sin línea de envío: no se afirma retiro ni canje, se pide confirmarlo', () => {
    const e = entregaDeOrden([], meta({}));
    expect(e.tipo).toBe('sin_envio');
    expect(e.incompleto).toBe(true);
    expect(e.faltante).toMatch(/retiro, canje o entrega en mano/);
  });

  it('mayorista con Via Cargo: sucursal de un tercero, con su destino', () => {
    const e = entregaDeOrden([], meta({ _envio_metodo: 'via_cargo', _envio_destino: 'Via Cargo Olavarría centro' }));
    expect(e.tipo).toBe('sucursal_tercero');
    expect(e.destino).toBe('Via Cargo Olavarría centro');
    expect(e.incompleto).toBe(false);
  });

  it('mayorista con Via Cargo y sin destino: incompleto', () => {
    const e = entregaDeOrden([], meta({ _envio_metodo: 'via_cargo' }));
    expect(e.incompleto).toBe(true);
    expect(e.faltante).toMatch(/sucursal de via cargo/i);
  });

  it('mayorista a domicilio de Andreani no pide destino', () => {
    const e = entregaDeOrden([], meta({ _envio_metodo: 'andreani_domicilio' }));
    expect(e.tipo).toBe('domicilio');
    expect(e.incompleto).toBe(false);
  });

  it('una orden mayorista vieja con sólo _via_cargo_sucursal se sigue leyendo', () => {
    const e = entregaDeOrden([], meta({ _via_cargo_sucursal: 'Comodoro centro' }));
    expect(e.tipo).toBe('sucursal_tercero');
    expect(e.destino).toBe('Comodoro centro');
  });
});

describe('parseSucursal', () => {
  it('parte nombre y dirección por el guión largo', () => {
    expect(parseSucursal('NOMBRE — Calle 1, Ciudad', 'X1')).toEqual({ nombre: 'NOMBRE', direccion: 'Calle 1, Ciudad', codigo: 'X1' });
  });
  it('sin guión, todo es nombre', () => {
    expect(parseSucursal('SUCURSAL PILAR', '')).toEqual({ nombre: 'SUCURSAL PILAR', direccion: '', codigo: '' });
  });
  it('vacío es null, no un objeto con campos vacíos', () => {
    expect(parseSucursal('', 'X1')).toBeNull();
    expect(parseSucursal('   ', '')).toBeNull();
  });
});

describe('sucursal elegida vs destino de la guía', () => {
  // Pares reales del cruce del 25/10/2026 (82 pedidos a sucursal con guía).
  it('reconoce la misma sucursal escrita de las dos formas', () => {
    expect(compararSucursal(
      'PUNTO ANDREANI HOP DEL CARMEN 1515 — Del Carmen 1515, Cañuelas',
      'Punto Andreani Hop Del Carmen 1515',
    )).toBe('coincide');
    expect(compararSucursal(
      'PUNTO ANDREANI HOP AVENIDA SAN MARTÍN 285 — Avenida San Martín 285, Ingeniero Jacobacci',
      'Punto Andreani Hop Avenida San Martín 285',
    )).toBe('coincide');
    expect(compararSucursal(
      'ANDREANI RIO GALLEGOS — Zapiola 530, Río Gallegos',
      'Rio Gallegos (centro)',
    )).toBe('coincide');
  });

  it('marca difiere cuando el destino es otra sucursal', () => {
    expect(compararSucursal(
      'PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín 2002, Florida',
      'Mendoza (av San Martin)',
    )).toBe('difiere');
    expect(compararSucursal(
      'PUNTO ANDREANI HOP RIVERA 1023 — Rivera 1023, Villa Celina',
      'Punto Andreani Hop Quesada 5027',
    )).toBe('difiere');
  });

  it('sin uno de los dos datos no se afirma nada', () => {
    expect(compararSucursal('', 'Pacheco')).toBe('sin_datos');
    expect(compararSucursal('PUNTO ANDREANI HOP PILAR', '')).toBe('sin_datos');
    expect(compararSucursal('', '')).toBe('sin_datos');
  });

  it('la palabra "sucursal" o "hop" sola no alcanza para que coincidan', () => {
    expect(compararSucursal('SUCURSAL HOP', 'Punto Andreani Hop')).toBe('sin_datos');
  });
});
