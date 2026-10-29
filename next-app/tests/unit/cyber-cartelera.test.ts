import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const RAIZ = join(__dirname, '..', '..');

import { CYBER_START, CYBER_END } from '@/lib/cyber-hype';
import {
  CYBER_LANZAMIENTOS,
  CYBER_PRECIOS_APROBADOS,
  CYBER_PRODUCTOS_EVENTO,
  cyberCartelera,
  cyberPriceLine,
  lanzamientoEstado,
} from '@/lib/cyber-cartelera';
import { REGULAR_TEES_SLUGS } from '@/lib/regular-tees';

const antes = (iso: string) => new Date(new Date(iso).getTime() - 1);
const en = (iso: string) => new Date(iso);

/**
 * La cartelera del evento: la máquina de estados recuperada del PR #623
 * (oculto → revelado → abierto → cerrado), sin la grilla de 6 drops.
 */
describe('cartelera — estados por fecha', () => {
  const l = CYBER_LANZAMIENTOS[0];

  it('un milisegundo antes de revelarse está oculto; en el instante exacto, revelado', () => {
    expect(lanzamientoEstado(l, antes(l.revealAt))).toBe('oculto');
    // El 01 se revela y abre en el mismo instante (la apertura del evento):
    // en revealAt ya está abierto, nunca pasa por 'revelado' visible.
    expect(['revelado', 'abierto']).toContain(lanzamientoEstado(l, en(l.revealAt)));
  });

  it('en el instante de apertura está abierto, y queda abierto (acumulativo) hasta el cierre', () => {
    expect(lanzamientoEstado(l, en(l.opensAt))).toBe('abierto');
    expect(lanzamientoEstado(l, antes(CYBER_END))).toBe('abierto');
  });

  it('exactamente en el cierre del evento está cerrado', () => {
    expect(lanzamientoEstado(l, en(CYBER_END))).toBe('cerrado');
  });

  it('ningún lanzamiento se revela antes de la apertura del evento: la previa no adelanta nada', () => {
    for (const lanz of CYBER_LANZAMIENTOS) {
      expect(lanzamientoEstado(lanz, antes(CYBER_START))).toBe('oculto');
    }
  });

  it('ningún lanzamiento abre fuera de la ventana del evento', () => {
    for (const lanz of CYBER_LANZAMIENTOS) {
      const abre = new Date(lanz.opensAt).getTime();
      expect(abre).toBeGreaterThanOrEqual(new Date(CYBER_START).getTime());
      expect(abre).toBeLessThan(new Date(CYBER_END).getTime());
    }
  });
});

describe('cartelera — solo lo confirmado se publica', () => {
  it('los tentativos no aparecen ni como misterio', () => {
    const ids = cyberCartelera(en(CYBER_START)).map((i) => i.lanzamiento.id);
    const confirmados = CYBER_LANZAMIENTOS.filter((l) => l.confirmado).map((l) => l.id);
    expect(ids).toEqual(confirmados);
  });

  it('hoy el único confirmado es la apertura con el 4 PACK', () => {
    const confirmados = CYBER_LANZAMIENTOS.filter((l) => l.confirmado);
    expect(confirmados).toHaveLength(1);
    expect(confirmados[0].title).toMatch(/4 PACK/i);
  });

  it('el modo demo (solo local) sí muestra los tentativos, para revisar el diseño', () => {
    const conDemo = cyberCartelera(en(CYBER_START), { demo: true });
    expect(conDemo.length).toBe(CYBER_LANZAMIENTOS.length);
  });
});

describe('cartelera — sin montos hasta la aprobación', () => {
  it('el interruptor de precios sigue apagado', () => {
    // Prenderlo es una decisión comercial de Valentín, no un efecto colateral:
    // si este test falla, alguien lo prendió — verificar monto por monto.
    expect(CYBER_PRECIOS_APROBADOS).toBe(false);
  });

  it('con el interruptor apagado, ninguna línea de precio lleva cifra de dinero ni porcentaje', () => {
    for (const l of CYBER_LANZAMIENTOS) {
      const linea = cyberPriceLine(l) ?? '';
      expect(linea).not.toMatch(/\$\s?\d/);
      expect(linea).not.toMatch(/\d\s?%|%\s?\d/);
    }
  });

  it('los textos del evento no traen montos escritos a mano ni porcentajes', () => {
    // Igual que el guard de la previa: se miran los textos que ve el
    // visitante, no los comentarios. Los precios reales los muestra
    // ProductCard leyendo Woo, nunca una cadena en el código.
    const sinComentarios = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
    const textos = [
      'components/cyber/CyberCartelera.tsx',
      'components/cyber/CyberEventoProductos.tsx',
    ]
      .map((f) => sinComentarios(readFileSync(join(RAIZ, f.replace(/\//g, sep)), 'utf8')))
      .join('\n');
    expect(textos).not.toMatch(/\$\s?\d/);
    expect(textos).not.toMatch(/\d\s?%/);
    expect(textos).not.toMatch(/descuento|rebaja|liquidaci[oó]n|cuotas sin inter[eé]s/i);
  });
});

describe('cartelera — coherencia con el resto del sitio', () => {
  it('los productos del evento existen en la fuente de verdad de Regular Tees', () => {
    // El motor del 4 PACK cobra 4 INDIVIDUALES al precio del pack: lo que se
    // muestra como "disponible ahora" tiene que ser eso, no fichas inventadas.
    for (const slug of CYBER_PRODUCTOS_EVENTO) {
      expect(REGULAR_TEES_SLUGS).toContain(slug);
    }
  });

  it('todos los lanzamientos llevan a una ruta interna', () => {
    for (const l of CYBER_LANZAMIENTOS) {
      expect(l.href).toMatch(/^\//);
    }
  });
});
