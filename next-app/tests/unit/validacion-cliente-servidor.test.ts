import { describe, it, expect, afterEach } from 'vitest';
import {
  validarClienteServidor,
  normalizarTelefono,
  opcionesDesdePayload,
  metaValidacion,
  resumenParaLog,
  modoValidacion,
} from '@/lib/validacion-cliente-servidor';
import { validarInfo, sugerirEmail, type DatosInfo } from '@/lib/checkout-validacion';

/**
 * Corpus del validador de servidor (auditoría del 25/10, §10).
 *
 * Dos propiedades son las que importan de verdad, y cada una tiene su bloque al
 * final del archivo:
 *
 * 1. Nadie que haya pasado el formulario del navegador puede ser rechazado por
 *    el servidor (salvo "nombre sin ninguna letra", que es la única regla más
 *    estricta y está documentada).
 * 2. El conjunto de reglas que bloquean es exactamente el acordado: cuatro.
 *    Todo lo demás se registra y el pedido se crea igual.
 */

const AR = { internacional: false, requiereCp: true, requiereDireccion: true };
const INTL = { internacional: true, requiereCp: true, requiereDireccion: true };

const BASE = {
  email: 'cliente@gmail.com',
  nombre: 'Valentín',
  apellido: 'Pozzi',
  dni: '30111222',
  direccion: 'Av. Siempre Viva 742',
  cp: '1425',
  ciudad: 'CABA',
  provincia: 'CABA',
  telefono: '1145678900',
};

const val = (parche: Record<string, unknown>, opts = AR) =>
  validarClienteServidor({ ...BASE, ...parche }, opts);

/** Códigos de las reglas que bloquearían el pedido. */
const bloquean = (parche: Record<string, unknown>, opts = AR) => val(parche, opts).reglasQueBloquean;
/** Códigos de todas las reglas que dieron, bloqueen o no. */
const reglas = (parche: Record<string, unknown>, opts = AR) => val(parche, opts).reglas;

describe('normalizarTelefono — formatos argentinos reales', () => {
  const casos: [string, string, boolean][] = [
    // entrada                      nsn esperado  móvil
    ['+54 9 11 4567-8900', '1145678900', true],
    ['011 15 4567 8900', '1145678900', true],
    ['11 4567 8900', '1145678900', false],
    ['1145678900', '1145678900', false],
    ['(011) 4567-8900', '1145678900', false],
    ['0054 9 11 15 4567 8900', '1145678900', true],
    // Código de área de 3 dígitos.
    ['0351 15 4567890', '3514567890', true],
    ['+54 9 351 456 7890', '3514567890', true],
    ['351 456 7890', '3514567890', false],
    // Código de área de 4 dígitos: el 15 queda en la posición 4, no en la 3.
    ['03442 15 123456', '3442123456', true],
    ['+54 9 3442 12-3456', '3442123456', true],
    ['3442123456', '3442123456', false],
    ['02226 15 123456', '2226123456', true],
    ['02284 15 123456', '2284123456', true],
    ['02901 15 123456', '2901123456', true],
    ['+54 9 2901 12-3456', '2901123456', true],
  ];
  for (const [entrada, nsn, movil] of casos) {
    it(`"${entrada}" → ${nsn}${movil ? ' (móvil)' : ''}`, () => {
      const t = normalizarTelefono(entrada, false);
      expect(t.nsnAr).toBe(nsn);
      expect(t.movil).toBe(movil);
      expect(t.e164).toBe(`+54${movil ? '9' : ''}${nsn}`);
      // Diez dígitos de nacional significativo: nunca puede dar por encima del
      // máximo de E.164 y disparar la regla de "demasiados dígitos".
      expect(t.digitos.length).toBe(10);
    });
  }

  it('un número internacional no se toca: se cuentan sus dígitos tal cual', () => {
    for (const n of ['+33 6 12 34 56 78', '+7 912 345 67 89', '+1 (305) 555-0123']) {
      const t = normalizarTelefono(n, true);
      expect(t.nsnAr).toBeNull();
      expect(t.digitos.length).toBeGreaterThanOrEqual(10);
      expect(t.digitos.length).toBeLessThanOrEqual(15);
    }
  });

  it('clasificar mal un código de área nunca bloquea: solo se pierde la sugerencia', () => {
    // El plan de numeración argentino es libre de prefijos (si 221 es de 3
    // cifras, no existe un 2214 de 4), así que la tabla no puede ser ambigua.
    // Pero si alguna vez lo fuera, el 15 no se reconoce, el número queda con 12
    // dígitos y eso está dentro del rango válido: no se bloquea a nadie.
    expect(normalizarTelefono('0299 15 1234567', false).nsnAr).toBe('2991234567'); // 299, de 3 cifras
    // Un área que no existe en ninguna tabla: el 15 no se saca y queda sin reconocer…
    const raro = normalizarTelefono('0777 15 123456', false);
    expect(raro.nsnAr).toBeNull();
    // …pero el número pasa igual: 7 ≤ dígitos ≤ 15.
    expect(bloquean({ telefono: '0777 15 123456' })).toEqual([]);
  });

  it('un formato que no se reconoce deja nsnAr en null y no inventa dígitos', () => {
    const t = normalizarTelefono('4567890', false);
    expect(t.nsnAr).toBeNull();
    expect(t.digitos).toBe('4567890');
  });

  it('no explota con valores que no son texto', () => {
    for (const v of [null, undefined, {}, [], true]) {
      expect(normalizarTelefono(v, false).digitos).toBe('');
    }
    // Un número llega como number si el POST es directo, no desde el formulario.
    expect(normalizarTelefono(1145678900, false).nsnAr).toBe('1145678900');
  });
});

describe('nombre y apellido — diversidad real', () => {
  const validos = ['Szczęsny', "O'Brien", "D'Angelo", 'Ñandú', 'Li', 'De la Cruz Martínez', 'Иван', '李', 'Ana-María', 'J. P.'];
  for (const n of validos) {
    it(`"${n}" pasa, en nombre y en apellido`, () => {
      expect(bloquean({ nombre: n })).toEqual([]);
      expect(bloquean({ apellido: n })).toEqual([]);
    });
  }

  it('vacío, solo espacios o sin ninguna letra sí bloquean', () => {
    expect(bloquean({ nombre: '' })).toEqual(['nombre_vacio']);
    expect(bloquean({ nombre: '   ' })).toEqual(['nombre_vacio']);
    expect(bloquean({ nombre: '12345' })).toEqual(['nombre_sin_letras']);
    expect(bloquean({ nombre: '!!!' })).toEqual(['nombre_sin_letras']);
    expect(bloquean({ apellido: '...' })).toEqual(['apellido_sin_letras']);
  });

  it('un nombre con un dígito pegado pasa: tiene letras', () => {
    expect(bloquean({ nombre: 'Ana2' })).toEqual([]);
  });

  it('largo o con caracteres de control se registra, no bloquea', () => {
    expect(reglas({ nombre: 'a'.repeat(61) })).toEqual(['nombre_largo']);
    expect(bloquean({ nombre: 'a'.repeat(61) })).toEqual([]);
    expect(reglas({ nombre: 'Ana\u0000' })).toEqual(['nombre_control']);
    expect(bloquean({ nombre: 'Ana\u0000' })).toEqual([]);
  });

  it('un valor que no es texto cuenta como vacío', () => {
    expect(bloquean({ nombre: ['a'] })).toEqual(['nombre_vacio']);
    expect(bloquean({ nombre: { a: 1 } })).toEqual(['nombre_vacio']);
  });
});

describe('email', () => {
  const validos = ['a@b.cc', 'x@dominio.com.ar', 'x@uba.edu.ar', 'x@fundacion.org', 'x@marca.io', `${'a'.repeat(64)}@gmail.com`];
  for (const e of validos) {
    it(`"${e.length > 30 ? e.slice(0, 12) + '…@gmail.com' : e}" pasa`, () => {
      expect(bloquean({ email: e })).toEqual([]);
    });
  }

  it('sin forma de email bloquea', () => {
    for (const e of ['asdf', 'a@b', 'a@@b.com', 'a b@c.com', '@gmail.com', 'a@.com']) {
      expect(bloquean({ email: e })).toEqual(['email_sin_forma']);
    }
    expect(bloquean({ email: '' })).toEqual(['email_vacio']);
  });

  it('demasiado largo se registra pero no bloquea: la forma es válida', () => {
    const largo = `${'a'.repeat(60)}@${'b'.repeat(200)}.com`;
    expect(largo.length).toBeGreaterThan(254);
    expect(reglas({ email: largo })).toContain('email_largo');
    expect(bloquean({ email: largo })).toEqual([]);
  });

  it('un dominio mal tipeado pasa el validador y lo corrige la sugerencia del navegador', () => {
    // La sugerencia es la única fuente y vive solo en el cliente: el servidor no
    // sugiere nada. Si esto se rompe, se duplicó la funcionalidad.
    expect(bloquean({ email: 'cliente@gmial.com' })).toEqual([]);
    expect(reglas({ email: 'cliente@gmial.com' })).toEqual([]);
    expect(sugerirEmail('cliente@gmial.com')).toBe('cliente@gmail.com');
  });
});

describe('teléfono', () => {
  it('los formatos que la gente escribe de verdad pasan', () => {
    for (const t of ['+54 9 11 4567-8900', '011 15 4567 8900', '1145678900', '03442 15 123456', '0351 15 4567890']) {
      expect(bloquean({ telefono: t })).toEqual([]);
      expect(reglas({ telefono: t })).toEqual([]);
    }
  });

  it('internacionales pasan con el mínimo global, no con el argentino', () => {
    for (const t of ['+33 6 12 34 56 78', '+7 912 345 67 89', '+1 (305) 555-0123']) {
      expect(bloquean({ telefono: t }, INTL)).toEqual([]);
      expect(reglas({ telefono: t }, INTL)).toEqual([]);
    }
  });

  it('menos de 7 dígitos o vacío bloquean', () => {
    expect(bloquean({ telefono: '12345' })).toEqual(['telefono_corto']);
    expect(bloquean({ telefono: '0' })).toEqual(['telefono_corto']);
    expect(bloquean({ telefono: '' })).toEqual(['telefono_vacio']);
    expect(bloquean({ telefono: 'no tengo' })).toEqual(['telefono_vacio']);
  });

  it('más de 15 dígitos se registra, no bloquea', () => {
    expect(reglas({ telefono: '1234567890123456' })).toEqual(['telefono_largo']);
    expect(bloquean({ telefono: '1234567890123456' })).toEqual([]);
  });

  it('entre 7 y 9 dígitos en AR se registra como incompleto, sin bloquear', () => {
    expect(reglas({ telefono: '4567890' })).toEqual(['telefono_ar_incompleto']);
    expect(bloquean({ telefono: '4567890' })).toEqual([]);
    // El mismo número en un pedido internacional no dispara nada.
    expect(reglas({ telefono: '4567890' }, INTL)).toEqual([]);
  });

  it('1133332222 (el caso del pedido 3992) pasa el validador', () => {
    // Datos plausibles: la validación de datos no es una defensa anti-abuso.
    // Esto corresponde a la capa de abuso, que es otro PR.
    expect(bloquean({ telefono: '1133332222' })).toEqual([]);
    expect(reglas({ telefono: '1133332222' })).toEqual([]);
  });
});

describe('DNI — solo nacional, la ausencia nunca interviene', () => {
  it('válidos y ausente pasan', () => {
    for (const d of ['30111222', '1234567', '123456789', '30.111.222', '', undefined]) {
      expect(reglas({ dni: d })).toEqual([]);
    }
  });

  it('fuera de rango se registra, no bloquea', () => {
    expect(reglas({ dni: '12345' })).toEqual(['dni_fuera_de_rango']);
    expect(bloquean({ dni: '12345' })).toEqual([]);
    expect(reglas({ dni: '1234567890' })).toEqual(['dni_fuera_de_rango']);
  });

  it('"abc" no tiene dígitos: cuenta como ausente', () => {
    expect(reglas({ dni: 'abc' })).toEqual([]);
  });

  it('en un pedido internacional no se mira', () => {
    expect(reglas({ dni: '12345' }, INTL)).toEqual([]);
  });
});

describe('código postal', () => {
  it('los 4 dígitos y el CPA completo pasan', () => {
    for (const cp of ['1425', 'C1425ABC', '1425 ', ' 1425']) {
      expect(bloquean({ cp })).toEqual([]);
    }
  });

  it('un CP que no se puede leer bloquea', () => {
    for (const cp of ['142', 'abcd', '12', 'XX']) {
      expect(bloquean({ cp })).toEqual(['cp_invalido']);
    }
  });

  it('vacío bloquea solo si el pedido tiene envío', () => {
    expect(bloquean({ cp: '' })).toEqual(['cp_vacio']);
    expect(bloquean({ cp: '' }, { ...AR, requiereCp: false })).toEqual([]);
  });

  it('internacional: un ZIP con letras no se toca', () => {
    for (const cp of ['SW1A 1AA', '75008', '10001-2345']) {
      expect(reglas({ cp }, INTL)).toEqual([]);
    }
    // Vacío internacional se registra, no bloquea.
    expect(bloquean({ cp: '' }, INTL)).toEqual([]);
  });
});

describe('dirección', () => {
  it('vacía se registra solo cuando hay envío a domicilio, y nunca bloquea', () => {
    expect(reglas({ direccion: '' })).toEqual(['direccion_vacia']);
    expect(bloquean({ direccion: '' })).toEqual([]);
    expect(reglas({ direccion: '' }, { ...AR, requiereDireccion: false })).toEqual([]);
  });
});

describe('customer ausente', () => {
  it('no es una regla: se marca aparte para que la ruta responda 422 y no 500', () => {
    for (const c of [undefined, null, 'texto', 42, []]) {
      expect(validarClienteServidor(c, AR).customerAusente).toBe(true);
    }
    expect(validarClienteServidor(BASE, AR).customerAusente).toBe(false);
  });
});

describe('opcionesDesdePayload — las mismas condiciones que el formulario', () => {
  it('carrito de solo gift cards: no se piden CP ni dirección', () => {
    const o = opcionesDesdePayload({ items: [{ id: 'gift-card', quantity: 1 }] }, false);
    expect(o.requiereCp).toBe(false);
    expect(o.requiereDireccion).toBe(false);
  });

  it('una gift card más una remera sí es un envío físico', () => {
    const o = opcionesDesdePayload({ items: [{ id: 'gift-card' }, { id: 'remera-test' }] }, false);
    expect(o.requiereCp).toBe(true);
    expect(o.requiereDireccion).toBe(true);
  });

  it('el regalo por compra no cuenta para decidir', () => {
    const o = opcionesDesdePayload({ items: [{ id: 'gift-card' }, { id: 'regalo', isGift: true }] }, false);
    expect(o.requiereCp).toBe(false);
  });

  it('retiro en sucursal: no se pide dirección, el CP sí', () => {
    for (const payload of [
      { items: [{ id: 'remera-test' }], shippingMethodId: 'andreani_sucursal' },
      { items: [{ id: 'remera-test' }], shippingLabel: 'Andreani (Sucursal)' },
      { items: [{ id: 'remera-test' }], shippingBranchCode: 'ABC123' },
    ]) {
      const o = opcionesDesdePayload(payload, false);
      expect(o.requiereDireccion).toBe(false);
      expect(o.requiereCp).toBe(true);
    }
  });

  it('un carrito vacío no fuerza nada: lo resuelven las otras validaciones', () => {
    expect(opcionesDesdePayload({ items: [] }, false).requiereCp).toBe(true);
    expect(opcionesDesdePayload({}, false).requiereCp).toBe(true);
  });
});

describe('observabilidad sin datos personales', () => {
  it('el log solo lleva códigos de regla', () => {
    const r = val({ email: 'asdf', telefono: '123' });
    const linea = resumenParaLog(r, 'observar');
    expect(linea).toContain('email_sin_forma');
    expect(linea).toContain('telefono_corto');
    expect(linea).not.toContain('asdf');
    expect(linea).not.toContain('123');
    expect(linea).not.toContain(BASE.email);
  });

  it('la meta del pedido solo lleva códigos de regla', () => {
    const m = metaValidacion(val({ email: 'asdf' }));
    expect(m!.key).toBe('_hs_validacion');
    expect(m!.value).toContain('email_sin_forma');
    expect(m!.value).not.toContain('asdf');
    expect(m!.value.length).toBeLessThanOrEqual(190);
  });

  it('un pedido sin hallazgos no lleva meta: sale igual que hoy', () => {
    expect(metaValidacion(val({}))).toBeNull();
  });

  it('el cuerpo del 422 no devuelve ningún dato recibido', () => {
    const r = val({ email: 'asdf', nombre: '12345' });
    expect(Object.keys(r.errores).sort()).toEqual(['email', 'nombre']);
    expect(JSON.stringify(r.errores)).not.toContain('asdf');
    expect(JSON.stringify(r.errores)).not.toContain('12345');
  });
});

describe('modo de operación', () => {
  const previo = process.env.CHECKOUT_VALIDACION;
  afterEach(() => {
    if (previo === undefined) delete process.env.CHECKOUT_VALIDACION;
    else process.env.CHECKOUT_VALIDACION = previo;
  });

  it('sin la variable arranca en observar', () => {
    delete process.env.CHECKOUT_VALIDACION;
    expect(modoValidacion()).toBe('observar');
  });

  it('cualquier valor que no sea "bloquear" es observar', () => {
    for (const v of ['', 'observar', 'off', 'true', 'BLOQUEAR_NO']) {
      process.env.CHECKOUT_VALIDACION = v;
      expect(modoValidacion()).toBe('observar');
    }
  });

  it('"bloquear", en cualquier caja y con espacios, activa el bloqueo', () => {
    for (const v of ['bloquear', 'BLOQUEAR', ' Bloquear ']) {
      process.env.CHECKOUT_VALIDACION = v;
      expect(modoValidacion()).toBe('bloquear');
    }
  });
});

describe('propiedad 1: el servidor no es más estricto que el formulario', () => {
  /**
   * Nadie que pasó el paso 1 en el navegador puede recibir un 422. La única
   * excepción deliberada es "nombre o apellido sin ninguna letra", que el
   * validador del navegador acepta hoy: antes de activar el modo `bloquear` hay
   * que agregarle esa misma regla para que el aviso aparezca en el paso 1.
   */
  const legitimos: { caso: string; datos: Partial<DatosInfo>; intl?: boolean }[] = [
    { caso: 'compra nacional típica', datos: {} },
    { caso: 'apellido doble con tilde', datos: { nombre: 'María José', apellido: 'Gómez Fernández' } },
    { caso: 'apellido polaco', datos: { nombre: 'Wojciech', apellido: 'Szczęsny' } },
    { caso: 'apellido irlandés', datos: { nombre: 'Sean', apellido: "O'Brien" } },
    { caso: 'cliente ruso', datos: { nombre: 'Иван', apellido: 'Петров' } },
    { caso: 'nombre de dos letras', datos: { nombre: 'Li', apellido: 'Wei' } },
    { caso: 'CPA completo', datos: { cp: 'C1425ABC' } },
    { caso: 'móvil con 15', datos: { telefono: '011 15 4567 8900' } },
    { caso: 'móvil con área de 4 dígitos', datos: { telefono: '03442 15 123456' } },
    { caso: 'teléfono en formato internacional', datos: { telefono: '+54 9 11 4567-8900' } },
    { caso: 'dominio .com.ar', datos: { email: 'cliente@dominio.com.ar' } },
    { caso: 'dominio institucional', datos: { email: 'alumno@uba.edu.ar' } },
  ];

  for (const { caso, datos } of legitimos) {
    it(`${caso}: pasa el navegador y pasa el servidor`, () => {
      const info = { ...BASE, ...datos, pais: 'AR', depto: '' } as unknown as DatosInfo;
      const delNavegador = validarInfo(info, {
        soloGift: false, internacional: false, provinciaObligatoria: false, retiraEnSucursal: false,
      });
      expect(delNavegador).toEqual({});
      expect(validarClienteServidor(info, AR).reglasQueBloquean).toEqual([]);
    });
  }

  it('la única regla más estricta que el navegador es "sin letras"', () => {
    const info = { ...BASE, nombre: '12345', pais: 'AR', depto: '' } as unknown as DatosInfo;
    // El navegador lo acepta hoy…
    expect(validarInfo(info, {
      soloGift: false, internacional: false, provinciaObligatoria: false, retiraEnSucursal: false,
    })).toEqual({});
    // …y el servidor lo rechazaría. Por eso el modo `bloquear` espera que el
    // formulario tenga la misma regla primero.
    expect(validarClienteServidor(info, AR).reglasQueBloquean).toEqual(['nombre_sin_letras']);
  });
});

describe('propiedad 2: el conjunto que bloquea es el acordado', () => {
  it('son exactamente las cuatro reglas de la primera activación', () => {
    const todas = [
      val({ email: '' }), val({ email: 'asdf' }),
      val({ nombre: '' }), val({ nombre: '123' }),
      val({ apellido: '' }), val({ apellido: '123' }),
      val({ telefono: '' }), val({ telefono: '123' }),
      val({ cp: '' }), val({ cp: 'abc' }),
      // Todo lo que se registra y no bloquea:
      val({ email: `${'a'.repeat(300)}@gmail.com` }),
      val({ nombre: 'a'.repeat(61) }),
      val({ nombre: 'Ana\u0000' }),
      val({ telefono: '1234567890123456' }),
      val({ telefono: '4567890' }),
      val({ dni: '12345' }),
      val({ direccion: '' }),
    ];
    const queBloquean = new Set(todas.flatMap((r) => r.reglasQueBloquean));
    expect([...queBloquean].sort()).toEqual([
      'apellido_sin_letras', 'apellido_vacio',
      'cp_invalido', 'cp_vacio',
      'email_sin_forma', 'email_vacio',
      'nombre_sin_letras', 'nombre_vacio',
      'telefono_corto', 'telefono_vacio',
    ]);
  });

  it('un pedido con varios campos mal devuelve todos de una vez, no el primero', () => {
    const r = val({ email: 'asdf', nombre: '', telefono: '1' });
    expect(Object.keys(r.errores).sort()).toEqual(['email', 'nombre', 'telefono']);
  });
});
