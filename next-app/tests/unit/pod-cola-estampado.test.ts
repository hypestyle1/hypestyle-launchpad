import { describe, it, expect } from 'vitest';
import { armarCola, estaPorEmpaquetar, talleDeLinea, SIN_TALLE, type PodOrderLike } from '@/lib/pod';

// product_id reales del mapa POD (espejo de HS_STOCK_RECIPES en el mu-plugin).
const OGCJM_BLANCA = 1044;   // pila boxy_blanco
const CHRIST_TEE   = 2029;   // pila boxy_gris_topo
const HSTARS       = 2271;   // pila hoodie_negro
const CHRIST_HOOD  = 2019;   // pila hoodie_negro
const NO_POD       = 726;    // AEROGREY: se vende de stock, no se estampa

function linea(product_id: number, talle: string | null, quantity = 1) {
  return { product_id, quantity, meta_data: talle === null ? [] : [{ key: 'talle', value: talle }] };
}

function orden(id: number, items: ReturnType<typeof linea>[], meta: PodOrderLike['meta_data'] = []): PodOrderLike {
  return { id, number: String(id), meta_data: meta, line_items: items };
}

describe('estaPorEmpaquetar', () => {
  it('cuenta la orden sin rótulo ni guía', () => {
    expect(estaPorEmpaquetar(orden(1, []))).toBe(true);
  });

  it('descarta la que ya tiene rótulo de Andreani', () => {
    expect(estaPorEmpaquetar(orden(1, [], [{ key: '_order_andreani_pedido_id', value: '123' }]))).toBe(false);
  });

  it('descarta la que ya tiene guía', () => {
    expect(estaPorEmpaquetar(orden(1, [], [{ key: '_tracking_number', value: '36000298' }]))).toBe(false);
  });

  it('ignora la meta presente pero vacía', () => {
    expect(estaPorEmpaquetar(orden(1, [], [{ key: '_tracking_number', value: '  ' }]))).toBe(true);
  });
});

describe('talleDeLinea', () => {
  it('lee la meta que deja la variación', () => {
    expect(talleDeLinea({ meta_data: [{ key: 'talle', value: 'l' }] })).toBe('L');
  });

  it('marca SIN_TALLE cuando la línea no quedó atada a ninguna variación', () => {
    expect(talleDeLinea({ meta_data: [] })).toBe(SIN_TALLE);
  });
});

describe('armarCola', () => {
  it('deja afuera lo que no es print on demand', () => {
    const cola = armarCola([orden(1, [linea(NO_POD, 'M')])]);
    expect(cola.total).toBe(0);
    expect(cola.lineas).toEqual([]);
  });

  it('junta el mismo diseño y talle de pedidos distintos', () => {
    const cola = armarCola([
      orden(10, [linea(HSTARS, 'S')]),
      orden(11, [linea(HSTARS, 'S')]),
    ]);
    expect(cola.lineas).toHaveLength(1);
    expect(cola.lineas[0].cantidad).toBe(2);
    expect(cola.lineas[0].pedidos.map(p => p.number)).toEqual(['10', '11']);
  });

  it('separa el mismo diseño en talles distintos', () => {
    const cola = armarCola([orden(10, [linea(HSTARS, 'S'), linea(HSTARS, 'XL')])]);
    expect(cola.lineas.map(l => l.talle)).toEqual(['S', 'XL']);
    expect(cola.total).toBe(2);
  });

  it('respeta la cantidad de la línea', () => {
    const cola = armarCola([orden(10, [linea(OGCJM_BLANCA, 'XL', 2)])]);
    expect(cola.total).toBe(2);
    expect(cola.blanks[0].porTalle.XL).toBe(2);
  });

  it('suma por pila los diseños que comparten blank', () => {
    const cola = armarCola([orden(10, [linea(HSTARS, 'L'), linea(CHRIST_HOOD, 'L')])]);
    const hoodie = cola.blanks.find(b => b.blank === 'hoodie_negro');
    expect(cola.lineas).toHaveLength(2);          // dos diseños distintos
    expect(hoodie?.porTalle.L).toBe(2);           // un solo blank a cubrir
    expect(hoodie?.total).toBe(2);
  });

  it('no mezcla pilas distintas', () => {
    const cola = armarCola([orden(10, [linea(OGCJM_BLANCA, 'M'), linea(CHRIST_TEE, 'M')])]);
    expect(cola.blanks.map(b => b.blank).sort()).toEqual(['boxy_blanco', 'boxy_gris_topo']);
  });

  it('ordena las pilas por volumen y los talles de menor a mayor', () => {
    const cola = armarCola([
      orden(10, [linea(CHRIST_TEE, 'M')]),
      orden(11, [linea(OGCJM_BLANCA, 'XL'), linea(OGCJM_BLANCA, 'S'), linea(OGCJM_BLANCA, 'M')]),
    ]);
    expect(cola.blanks[0].blank).toBe('boxy_blanco');
    expect(cola.lineas.filter(l => l.blank === 'boxy_blanco').map(l => l.talle)).toEqual(['S', 'M', 'XL']);
  });

  it('cuenta aparte las prendas sin talle, que no se pueden mandar a estampar', () => {
    const cola = armarCola([orden(10, [linea(CHRIST_TEE, null), linea(CHRIST_TEE, 'M')])]);
    expect(cola.sinTalle).toBe(1);
    expect(cola.total).toBe(2);
    // el "sin talle" va último para no ensuciar la lectura de la tabla
    expect(cola.lineas.map(l => l.talle)).toEqual(['M', SIN_TALLE]);
  });
});
