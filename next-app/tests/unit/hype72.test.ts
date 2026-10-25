import { describe, it, expect } from 'vitest';
import {
  HYPE72_DROPS,
  HYPE72_END,
  HYPE72_GIFTS,
  HYPE72_START,
  dropState,
  hype72Board,
  isHype72Live,
  isHype72Over,
  nextMilestone,
} from '@/lib/hype72';

/**
 * La lógica de revelación y apertura de HYPE 72. Es lo único que decide qué ve
 * la gente en la cartelera, y lo decide el servidor: si acá se corre un borde,
 * un drop se cuenta antes de hora o abre tarde.
 *
 * Todas las fechas van con offset -03:00 (ART, sin horario de verano), así el
 * test no depende de la TZ de la máquina que lo corre.
 */

const at = (iso: string) => new Date(iso);
const drop = (id: string) => {
  const d = HYPE72_DROPS.find((x) => x.id === id);
  if (!d) throw new Error(`drop ${id} no existe`);
  return d;
};

describe('hype72 · dropState', () => {
  it('un ms antes de la revelación el drop sigue oculto', () => {
    const d = drop('01');
    const justBefore = new Date(at(d.revealAt).getTime() - 1);
    expect(dropState(d, justBefore)).toBe('oculto');
  });

  it('en el instante exacto de la revelación pasa a revelado', () => {
    const d = drop('01');
    expect(dropState(d, at(d.revealAt))).toBe('revelado');
  });

  it('un ms antes de la apertura todavía está revelado', () => {
    const d = drop('01');
    const justBefore = new Date(at(d.opensAt).getTime() - 1);
    expect(dropState(d, justBefore)).toBe('revelado');
  });

  it('en el instante exacto de la apertura pasa a abierto', () => {
    const d = drop('01');
    expect(dropState(d, at(d.opensAt))).toBe('abierto');
  });

  it('en el instante exacto del cierre del evento queda cerrado', () => {
    for (const d of HYPE72_DROPS) {
      expect(dropState(d, at(HYPE72_END))).toBe('cerrado');
    }
  });

  it('un ms antes del cierre el último drop todavía está abierto', () => {
    const justBefore = new Date(at(HYPE72_END).getTime() - 1);
    expect(dropState(drop('06'), justBefore)).toBe('abierto');
  });
});

describe('hype72 · acumulativo', () => {
  it('lo que abrió sigue abierto cuando abre un drop posterior', () => {
    // Arranque del drop 06 (mié 4/11 21:00): los cinco anteriores siguen abiertos.
    const board = hype72Board(at(drop('06').opensAt));
    expect(board.map((b) => b.state)).toEqual([
      'abierto', 'abierto', 'abierto', 'abierto', 'abierto', 'abierto',
    ]);
  });

  it('ningún drop se cierra antes del final del evento', () => {
    const justBefore = new Date(at(HYPE72_END).getTime() - 1);
    expect(hype72Board(justBefore).every((b) => b.state === 'abierto')).toBe(true);
  });
});

describe('hype72 · cartelera por fecha', () => {
  it('antes de la primera revelación los 6 están ocultos', () => {
    const board = hype72Board(at('2026-10-26T23:00:00-03:00'));
    expect(board.every((b) => b.state === 'oculto')).toBe(true);
  });

  it('el calendario de revelación es uno por día del 27/10 al 1/11', () => {
    // El 29/10 a las 23:00 ya se revelaron 01, 02 y 03; el resto sigue oculto.
    const board = hype72Board(at('2026-10-29T23:00:00-03:00'));
    expect(board.map((b) => b.state)).toEqual([
      'revelado', 'revelado', 'revelado', 'oculto', 'oculto', 'oculto',
    ]);
  });

  it('el 1/11 a la noche los 6 están revelados y ninguno abierto', () => {
    const board = hype72Board(at('2026-11-01T23:00:00-03:00'));
    expect(board.every((b) => b.state === 'revelado')).toBe(true);
  });

  it('el 2/11 a las 12:00 solo abrió el drop 01', () => {
    const board = hype72Board(at('2026-11-02T12:00:00-03:00'));
    expect(board.map((b) => b.state)).toEqual([
      'abierto', 'revelado', 'revelado', 'revelado', 'revelado', 'revelado',
    ]);
  });

  it('el 3/11 a las 12:00 abrieron 01, 02 y 03', () => {
    const board = hype72Board(at('2026-11-03T12:00:00-03:00'));
    expect(board.map((b) => b.state)).toEqual([
      'abierto', 'abierto', 'abierto', 'revelado', 'revelado', 'revelado',
    ]);
  });

  it('todas las revelaciones caen antes de todas las aperturas', () => {
    const lastReveal = Math.max(...HYPE72_DROPS.map((d) => at(d.revealAt).getTime()));
    const firstOpen = Math.min(...HYPE72_DROPS.map((d) => at(d.opensAt).getTime()));
    expect(lastReveal).toBeLessThan(firstOpen);
  });

  it('cada drop se revela antes de abrir y abre dentro del evento', () => {
    for (const d of HYPE72_DROPS) {
      expect(at(d.revealAt).getTime()).toBeLessThan(at(d.opensAt).getTime());
      expect(at(d.opensAt).getTime()).toBeGreaterThanOrEqual(at(HYPE72_START).getTime());
      expect(at(d.opensAt).getTime()).toBeLessThan(at(HYPE72_END).getTime());
    }
  });
});

describe('hype72 · nextMilestone', () => {
  it('antes de todo apunta a la revelación del drop 01', () => {
    const m = nextMilestone(at('2026-10-25T10:00:00-03:00'));
    expect(m).toMatchObject({ kind: 'reveal', dropId: '01', at: drop('01').revealAt });
  });

  it('en el instante exacto de una revelación ya apunta a la siguiente', () => {
    const m = nextMilestone(at(drop('01').revealAt));
    expect(m).toMatchObject({ kind: 'reveal', dropId: '02' });
  });

  it('revelados los 6, apunta a la apertura del drop 01', () => {
    const m = nextMilestone(at('2026-11-01T23:00:00-03:00'));
    expect(m).toMatchObject({ kind: 'open', dropId: '01', at: drop('01').opensAt });
  });

  it('con el drop 01 abierto apunta a la apertura del 02', () => {
    const m = nextMilestone(at(drop('01').opensAt));
    expect(m).toMatchObject({ kind: 'open', dropId: '02' });
  });

  it('abierto el último drop, el próximo hito es el cierre', () => {
    const m = nextMilestone(at(drop('06').opensAt));
    expect(m).toMatchObject({ kind: 'end', at: HYPE72_END });
  });

  it('terminado el evento no hay próximo hito', () => {
    expect(nextMilestone(at(HYPE72_END))).toBeNull();
  });
});

describe('hype72 · ventanas del evento', () => {
  it('isHype72Live solo entre el arranque y el cierre', () => {
    expect(isHype72Live(at('2026-11-01T23:59:59-03:00'))).toBe(false);
    expect(isHype72Live(at(HYPE72_START))).toBe(true);
    expect(isHype72Live(new Date(at(HYPE72_END).getTime() - 1))).toBe(true);
    expect(isHype72Live(at(HYPE72_END))).toBe(false);
  });

  it('isHype72Over desde el instante exacto del cierre', () => {
    expect(isHype72Over(new Date(at(HYPE72_END).getTime() - 1))).toBe(false);
    expect(isHype72Over(at(HYPE72_END))).toBe(true);
  });
});

describe('hype72 · datos de la cartelera', () => {
  it('son 6 drops, con id único y link propio', () => {
    expect(HYPE72_DROPS).toHaveLength(6);
    expect(new Set(HYPE72_DROPS.map((d) => d.id)).size).toBe(6);
    for (const d of HYPE72_DROPS) {
      expect(d.href.startsWith('/')).toBe(true);
      expect(d.title.length).toBeGreaterThan(0);
    }
  });

  it('el drop 01 no publica precio: va con la nota del 3 PACK', () => {
    const d = drop('01');
    expect(d.priceNote).toBe('Al precio del 3 PACK');
    expect(`${d.title} ${d.claim}`).not.toMatch(/\$/);
  });

  it('la escalera de regalos está ordenada de menor a mayor', () => {
    const values = HYPE72_GIFTS.map((g) => g.value);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('nada menciona CyberMonday ni CACE: es un evento propio', () => {
    const texto = JSON.stringify({ HYPE72_DROPS, HYPE72_GIFTS }).toLowerCase();
    expect(texto).not.toMatch(/cyber/);
    expect(texto).not.toMatch(/cace/);
  });
});
