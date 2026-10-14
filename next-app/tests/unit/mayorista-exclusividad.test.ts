import { describe, it, expect } from 'vitest';
import {
  normalizeCiudad, mismaCiudad, parseExclusividad, parseBloqueo, exclusividadEnCiudad, mensajeBloqueo,
  META_EXCLUSIVIDAD, META_BLOQUEO,
} from '@/lib/mayorista-exclusividad';
import { HOW_IT_WORKS_SECTIONS } from '@/lib/mayorista-copy';

// Exclusividad por ciudad (política del 05/10/2026). El caso que la originó:
// AKASHA RAGS (Córdoba Capital) la ganó con el pedido del 28/09 y BAKU IND, de
// la misma zona, siguió pudiendo comprar.

describe('normalizeCiudad / mismaCiudad', () => {
  it('ignora acentos, mayúsculas y "capital"', () => {
    expect(normalizeCiudad('Córdoba Capital')).toBe('cordoba');
    expect(normalizeCiudad('CÓRDOBA')).toBe('cordoba');
  });

  it('la ciudad de facturación de AKASHA y la de BAKU son la misma', () => {
    expect(mismaCiudad('Córdoba Capital', 'Córdoba capital Cordoba')).toBe(true);
    expect(mismaCiudad('Córdoba Capital', 'Cordoba Cordoba')).toBe(true);
    expect(mismaCiudad('Córdoba Capital', 'cordoba')).toBe(true);
  });

  it('otra ciudad de la provincia no es la misma', () => {
    expect(mismaCiudad('Córdoba Capital', 'Villa Allende córdoba')).toBe(false);
    expect(mismaCiudad('Córdoba Capital', 'Rio Cuarto Cordoba')).toBe(false);
    expect(mismaCiudad('Córdoba Capital', 'Villa Maria Cordoba')).toBe(false);
  });

  it('vacío nunca coincide', () => {
    expect(mismaCiudad('', '')).toBe(false);
    expect(mismaCiudad('Córdoba', null)).toBe(false);
  });
});

describe('parseExclusividad / parseBloqueo', () => {
  it('lee el JSON de la meta', () => {
    const meta = [
      { key: META_EXCLUSIVIDAD, value: JSON.stringify({ ciudad: 'Córdoba Capital', desde: '2026-09-28', pedido: 3324 }) },
    ];
    expect(parseExclusividad(meta)).toEqual({ ciudad: 'Córdoba Capital', desde: '2026-09-28', pedido: 3324 });
    expect(parseBloqueo(meta)).toBeNull();
  });

  it('meta vacía, rota o sin ciudad = sin exclusividad', () => {
    expect(parseExclusividad([{ key: META_EXCLUSIVIDAD, value: '' }])).toBeNull();
    expect(parseExclusividad([{ key: META_EXCLUSIVIDAD, value: '{roto' }])).toBeNull();
    expect(parseBloqueo([{ key: META_BLOQUEO, value: JSON.stringify({ titular: 'AKASHA RAGS' }) }])).toBeNull();
    expect(parseBloqueo(undefined)).toBeNull();
  });

  it('busca la exclusividad vigente de una ciudad', () => {
    const cuentas = [
      { id: 85, exclusividad: null },
      { id: 13, exclusividad: { ciudad: 'Córdoba Capital', desde: '2026-09-28' } },
    ];
    expect(exclusividadEnCiudad(cuentas, 'Córdoba capital Cordoba')?.id).toBe(13);
    expect(exclusividadEnCiudad(cuentas, 'Rosario')).toBeNull();
  });

  it('el mensaje de bloqueo nombra la ciudad y manda a WhatsApp, sin nombrar al titular', () => {
    const msg = mensajeBloqueo({ ciudad: 'Córdoba Capital', titular: 'AKASHA RAGS', desde: '2026-10-05' });
    expect(msg).toContain('Córdoba Capital');
    expect(msg).toContain('WhatsApp');
    expect(msg).not.toContain('AKASHA');
  });
});

describe('copy de la página: política de exclusividad', () => {
  const excl = HOW_IT_WORKS_SECTIONS.find(s => s.id === 'exclusividad')!;
  const texto = excl.items.join(' ');

  it('dice cómo se gana, cómo se mantiene y qué pasa si no se cumple', () => {
    expect(texto).toContain('$3.000.000 en pedidos pagados dentro de 120 días');
    expect(texto).toContain('al menos un pedido pagado por mes');
    expect(texto).toContain('por cuatrimestre');
    expect(texto).toMatch(/se libera/);
  });

  it('dice que vale por zona comercial y que las cuentas que ya existían no pueden pedir', () => {
    expect(texto).toMatch(/zona comercial/);
    expect(texto).toMatch(/no para la provincia/);
    expect(texto).toMatch(/ya existían ahí no pueden hacer pedidos/);
    expect(texto).not.toMatch(/siguen comprando/);
  });

  it('no promete un automatismo: la confirma una persona con los pedidos pagados', () => {
    expect(texto).toMatch(/no se activa sola/);
    expect(texto).not.toMatch(/confirmamos por mail cuando la ganás/);
  });

  it('sin "No + te" ni emojis', () => {
    expect(texto).not.toMatch(/\bno te\b/i);
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

// 13/10/2026: zonas comerciales definidas por el admin y evaluación con
// pedidos pagados. Solo informa: nada se concede ni se bloquea solo.
import { parseAliasInput, zonaDe, enZona, evaluarExclusividad, cuatrimestreDe } from '@/lib/mayorista-exclusividad';

describe('zonas comerciales', () => {
  it('parseAliasInput separa por coma / punto y coma / salto, limpia y no repite', () => {
    expect(parseAliasInput('Villa Allende, Mendiolaza;Saldán\n villa allende ,,')).toEqual(['Villa Allende', 'Mendiolaza', 'Saldán']);
    expect(parseAliasInput('')).toEqual([]);
    expect(parseAliasInput(undefined)).toEqual([]);
  });

  it('la zona se guarda y se lee en la meta; sin zona vale la ciudad literal', () => {
    const meta = [{ key: META_EXCLUSIVIDAD, value: JSON.stringify({ ciudad: 'Córdoba Capital', desde: '2026-09-28', zona: { nombre: 'Gran Córdoba', alias: ['Villa Allende', 'Mendiolaza'] } }) }];
    const e = parseExclusividad(meta)!;
    expect(e.zona).toEqual({ nombre: 'Gran Córdoba', alias: ['Villa Allende', 'Mendiolaza'] });
    expect(zonaDe({ ciudad: 'Rosario', desde: '2026-01-01' })).toEqual({ nombre: 'Rosario', alias: [] });
  });

  it('enZona: nombre, alias o ciudad literal; otra localidad no', () => {
    const e = { ciudad: 'Córdoba Capital', desde: '2026-09-28', zona: { nombre: 'Gran Córdoba', alias: ['Villa Allende', 'Mendiolaza'] } };
    expect(enZona(e, 'Gran Cordoba')).toBe(true);
    expect(enZona(e, 'villa allende Córdoba')).toBe(true);
    expect(enZona(e, 'Córdoba capital')).toBe(true);
    expect(enZona(e, 'Río Cuarto')).toBe(false);
    expect(enZona(e, '')).toBe(false);
    expect(exclusividadEnCiudad([{ id: 1, exclusividad: e }], 'Mendiolaza')?.id).toBe(1);
  });
});

describe('evaluarExclusividad — con pedidos pagados, solo informa', () => {
  const hoy = new Date('2026-10-13T15:00:00Z'); // cuatrimestre sep–dic 2026
  const p = (fecha: string, total: number) => ({ fecha, total });

  it('cuatrimestre calendario', () => {
    expect(cuatrimestreDe(hoy)).toEqual({ desde: new Date('2026-09-01T00:00:00Z'), hasta: new Date('2026-12-31T00:00:00Z') });
    expect(cuatrimestreDe(new Date('2026-02-10T00:00:00Z')).desde.toISOString().slice(0, 10)).toBe('2026-01-01');
  });

  it('sin exclusividad y sin llegar al monto: "sin"', () => {
    const r = evaluarExclusividad([p('2026-09-28T10:00:00', 1_018_960)], false, hoy);
    expect(r.estado).toBe('sin');
    expect(r.ventana120).toBe(1_018_960);
    expect(r.detalle).toContain('hacen falta');
  });

  it('AKASHA: $3M pagados en 120 días sin tener exclusividad → elegible (no se concede sola)', () => {
    const r = evaluarExclusividad([p('2026-07-01T10:00:00', 1_500_000), p('2026-09-28T10:00:00', 1_600_000)], false, hoy);
    expect(r.estado).toBe('elegible');
    expect(r.elegible).toBe(true);
  });

  it('un pedido de hace más de 120 días no cuenta para la ventana', () => {
    const r = evaluarExclusividad([p('2026-06-01T10:00:00', 5_000_000)], false, hoy);
    expect(r.ventana120).toBe(0);
    expect(r.estado).toBe('sin');
  });

  it('vigente: un pedido por mes terminado y monto al día → cumple', () => {
    const r = evaluarExclusividad([p('2026-09-10T10:00:00', 2_000_000), p('2026-10-02T10:00:00', 1_100_000)], true, hoy);
    expect(r.estado).toBe('vigente-cumple');
    expect(r.cuatrimestre.total).toBe(3_100_000);
    expect(r.cuatrimestre.mesesSinPedido).toEqual([]);
  });

  it('vigente: septiembre terminó sin pedido → no cumple (octubre en curso no cuenta en contra)', () => {
    const r = evaluarExclusividad([p('2026-10-02T10:00:00', 4_000_000)], true, hoy);
    expect(r.estado).toBe('vigente-no-cumple');
    expect(r.cuatrimestre.mesesSinPedido).toEqual(['2026-09']);
  });

  it('vigente: sin llegar al monto con menos de 30 días de cuatrimestre → en riesgo', () => {
    const fin = new Date('2026-12-15T15:00:00Z');
    const r = evaluarExclusividad([p('2026-09-10', 500_000), p('2026-10-10', 500_000), p('2026-11-10', 500_000), p('2026-12-01', 500_000)], true, fin);
    expect(r.estado).toBe('vigente-riesgo');
    expect(r.cuatrimestre.diasRestantes).toBeLessThanOrEqual(30);
  });

  it('vigente: sin llegar al monto pero con cuatrimestre por delante → cumple (en curso)', () => {
    const r = evaluarExclusividad([p('2026-09-10', 500_000), p('2026-10-05', 500_000)], true, hoy);
    expect(r.estado).toBe('vigente-cumple');
    expect(r.detalle).toContain('en curso');
  });

  it('vigente concedida este mes: los meses anteriores a la concesión no cuentan en contra', () => {
    // Pagó en agosto, se le dio la exclusividad el 13/10: septiembre no es un mes exigible.
    const r = evaluarExclusividad([p('2026-08-20', 3_200_000), p('2026-10-13', 400_000)], true, hoy, '2026-10-13');
    expect(r.cuatrimestre.mesesSinPedido).toEqual([]);
    expect(r.estado).toBe('vigente-cumple');
    // Sin `desde` (meta vieja) se evalúa como antes.
    expect(evaluarExclusividad([p('2026-10-13', 400_000)], true, hoy).cuatrimestre.mesesSinPedido).toEqual(['2026-09']);
    // Concedida en agosto: septiembre sí se exige.
    expect(evaluarExclusividad([p('2026-10-13', 400_000)], true, hoy, '2026-08-20').cuatrimestre.mesesSinPedido).toEqual(['2026-09']);
  });

  it('fechas inválidas se ignoran', () => {
    expect(evaluarExclusividad([p('no-es-fecha', 9_000_000)], false, hoy).ventana120).toBe(0);
  });
});
