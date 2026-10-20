import { describe, it, expect } from 'vitest';
import {
  validarClienteServidor, riesgoCliente, excedeVentana,
  contarPedidosRecientes, decidirBloqueo,
} from '@/lib/checkout-guard';

/**
 * Protección del checkout (auditoría 17/10). El contrato más importante acá
 * es el negativo: datos reales pero feos (apellidos raros, teléfonos con
 * formato) tienen que PASAR — esto frena scripts y basura, no clientes.
 */

const legit = { email: 'juan.perez@gmail.com', nombre: 'Juan', apellido: 'Pérez', telefono: '11 4567 8900', dni: '30111222' };

describe('validarClienteServidor', () => {
  it('un cliente normal pasa', () => {
    expect(validarClienteServidor(legit, false)).toBeNull();
  });

  it('apellidos reales poco comunes pasan (no es un detector de nombres)', () => {
    expect(validarClienteServidor({ ...legit, apellido: 'Szczęsny' }, false)).toBeNull();
    expect(validarClienteServidor({ ...legit, apellido: "O'Brien" }, false)).toBeNull();
    expect(validarClienteServidor({ ...legit, nombre: 'Ng' }, false)).toBeNull();
  });

  it('teléfono con formato (+54 9 11...) pasa', () => {
    expect(validarClienteServidor({ ...legit, telefono: '+54 9 11 4567-8900' }, false)).toBeNull();
  });

  it('email sin forma de email no pasa', () => {
    expect(validarClienteServidor({ ...legit, email: 'noesunmail' }, false)).toBeTruthy();
    expect(validarClienteServidor({ ...legit, email: '' }, false)).toBeTruthy();
  });

  it('nombre o apellido vacíos no pasan', () => {
    expect(validarClienteServidor({ ...legit, nombre: '  ' }, false)).toBeTruthy();
    expect(validarClienteServidor({ ...legit, apellido: '' }, false)).toBeTruthy();
  });

  it('teléfono de 4 dígitos no pasa; internacional es más laxo', () => {
    expect(validarClienteServidor({ ...legit, telefono: '1234' }, false)).toBeTruthy();
    expect(validarClienteServidor({ ...legit, telefono: '212555' }, true)).toBeNull();
  });

  it('DNI solo se valida si viene, y acepta 6-9 dígitos', () => {
    expect(validarClienteServidor({ ...legit, dni: '' }, false)).toBeNull();
    expect(validarClienteServidor({ ...legit, dni: '30.111.222' }, false)).toBeNull();
    expect(validarClienteServidor({ ...legit, dni: 'jejfjdjd' }, false)).toBeTruthy();
  });

  it('campos de 200+ caracteres no pasan', () => {
    expect(validarClienteServidor({ ...legit, nombre: 'a'.repeat(300) }, false)).toBeTruthy();
  });
});

describe('riesgoCliente', () => {
  it('el pedido #3992 de la auditoría habría quedado marcado', () => {
    const r = riesgoCliente({ email: 'sdkskskkdsk@gmail.com', nombre: 'Djskskkf', apellido: 'Shshsjsdu', telefono: '1133332222', dni: '11323232' });
    expect(r.alto).toBe(true);
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  it('un cliente normal no queda marcado', () => {
    expect(riesgoCliente(legit).alto).toBe(false);
  });

  it('un solo dato raro no alcanza para marcar (apellido real difícil)', () => {
    expect(riesgoCliente({ ...legit, apellido: 'Szczepański' }).alto).toBe(false);
  });
});

describe('excedeVentana', () => {
  const v = { max: 3, ventanaMs: 10 * 60_000 };
  it('bajo el límite no excede', () => {
    expect(excedeVentana([1000, 2000], 3000, v)).toBe(false);
  });
  it('al llegar al límite excede', () => {
    expect(excedeVentana([1000, 2000, 3000], 4000, v)).toBe(true);
  });
  it('los eventos viejos salen de la ventana', () => {
    const ahora = 20 * 60_000;
    expect(excedeVentana([1000, 2000, 3000], ahora, v)).toBe(false);
  });
});

describe('contarPedidosRecientes + decidirBloqueo', () => {
  const pedidos = [
    { billing: { email: 'spam@x.com' }, meta_data: [{ key: '_hs_client_ip', value: '1.2.3.4' }] },
    { billing: { email: 'spam@x.com' }, meta_data: [{ key: '_hs_client_ip', value: '1.2.3.4' }] },
    { billing: { email: 'otro@x.com' }, meta_data: [{ key: '_hs_client_ip', value: '1.2.3.4' }] },
    { billing: { email: 'SPAM@X.COM' }, meta_data: [] },
  ];

  it('cuenta por email (case-insensitive) y por IP del meta', () => {
    expect(contarPedidosRecientes(pedidos, { email: 'spam@x.com', ip: '1.2.3.4' })).toEqual({ porEmail: 3, porIp: 3 });
  });

  it('sin IP solo cuenta email; pedidos sin meta de IP no suman a IP', () => {
    expect(contarPedidosRecientes(pedidos, { email: 'otro@x.com', ip: null })).toEqual({ porEmail: 1, porIp: 0 });
  });

  it('decidirBloqueo respeta los límites', () => {
    expect(decidirBloqueo({ porEmail: 5, porIp: 0 }, { email: 5, ip: 8 })).toBeTruthy();
    expect(decidirBloqueo({ porEmail: 4, porIp: 7 }, { email: 5, ip: 8 })).toBeNull();
    // Dos personas distintas en el mismo NAT comprando normal no se traban.
    expect(decidirBloqueo({ porEmail: 1, porIp: 3 }, { email: 5, ip: 8 })).toBeNull();
  });
});
