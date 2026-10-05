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

  it('dice que vale por ciudad y que las cuentas que ya existían no pueden pedir', () => {
    expect(texto).toMatch(/ciudad, no para la provincia/);
    expect(texto).toMatch(/ya existían ahí no pueden hacer pedidos/);
    expect(texto).not.toMatch(/siguen comprando/);
  });

  it('sin "No + te" ni emojis', () => {
    expect(texto).not.toMatch(/\bno te\b/i);
    expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
