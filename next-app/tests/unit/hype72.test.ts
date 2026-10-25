import { describe, it, expect } from 'vitest';
import {
  HYPE72_DROPS,
  HYPE72_EARLY_ACCESS,
  HYPE72_END,
  HYPE72_GIFTS,
  HYPE72_PRECIOS_APROBADOS,
  HYPE72_PUBLIC_AT,
  HYPE72_START,
  dropState,
  hype72Board,
  hype72GiftFrom,
  hype72GiftsVisibles,
  hype72PriceLine,
  isHype72Live,
  isHype72Over,
  isHype72Publica,
  nextMilestone,
  puedeVerHype72,
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

  it('el 1/11 a las 22:00 los 6 están revelados y ninguno abierto', () => {
    const board = hype72Board(at('2026-11-01T22:00:00-03:00'));
    expect(board.every((b) => b.state === 'revelado')).toBe(true);
  });

  it('a las 23:00 del 1/11 (acceso anticipado) abre el drop 01 y nada más', () => {
    // La ventana publicada es 2/11 → 4/11, pero el 4 PACK abre una hora antes
    // porque a esa hora sale el aviso a Private Access y Mejores Amigos.
    const board = hype72Board(at(HYPE72_EARLY_ACCESS));
    expect(board.map((b) => b.state)).toEqual([
      'abierto', 'revelado', 'revelado', 'revelado', 'revelado', 'revelado',
    ]);
  });

  it('un ms antes del acceso anticipado el drop 01 todavía no abrió', () => {
    const justBefore = new Date(at(HYPE72_EARLY_ACCESS).getTime() - 1);
    expect(dropState(drop('01'), justBefore)).toBe('revelado');
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
      // El piso es el acceso anticipado, no el arranque de la ventana
      // publicada: el drop 01 abre una hora antes del 2/11.
      expect(at(d.opensAt).getTime()).toBeGreaterThanOrEqual(at(HYPE72_EARLY_ACCESS).getTime());
      expect(at(d.opensAt).getTime()).toBeLessThan(at(HYPE72_END).getTime());
    }
  });

  it('el acceso anticipado es exactamente una hora antes de la ventana publicada', () => {
    expect(at(HYPE72_START).getTime() - at(HYPE72_EARLY_ACCESS).getTime()).toBe(3600_000);
    // Y es el drop 01 el que abre ahí: es el que se le avisa a Private Access.
    expect(drop('01').opensAt).toBe(HYPE72_EARLY_ACCESS);
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
    const m = nextMilestone(at('2026-11-01T22:00:00-03:00'));
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

  it('el día de la semana de cada etiqueta es el real', () => {
    // Los seis revealLabel estaban corridos un día ("lun 27/10" cuando el 27 es
    // martes). Se chequea contra el calendario, no contra una lista a mano.
    const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const diaDe = (iso: string) => DIAS[new Date(new Date(iso).getTime() - 3 * 3600_000).getUTCDay()];
    for (const d of HYPE72_DROPS) {
      expect(d.revealLabel).toBe(`${diaDe(d.revealAt)} ${d.revealLabel.split(' ')[1]}`);
      expect(d.slot.startsWith(`${diaDe(d.opensAt)} `)).toBe(true);
    }
  });
});

/**
 * Los montos del evento salieron de la estrategia del 17/10 y están esperando
 * la matriz de rentabilidad. El único aprobado es el 4 PACK a $66.300 y ése
 * tampoco se publica todavía. Mientras HYPE72_PRECIOS_APROBADOS esté en false,
 * de este módulo NO puede salir ni una cifra hacia la página.
 *
 * Cuando se aprueben: poner el interruptor en true y cambiar el primer test de
 * este bloque por el que está comentado abajo.
 */
describe('hype72 · precios sin aprobar no se publican', () => {
  it('ni un solo monto sale de lo que se renderiza', () => {
    expect(HYPE72_PRECIOS_APROBADOS).toBe(false);

    const visible = JSON.stringify(
      HYPE72_DROPS.map((d) => ({
        title: d.title,
        claim: d.claim,
        slot: d.slot,
        revealLabel: d.revealLabel,
        precio: hype72PriceLine(d),
      })),
    );
    expect(visible).not.toMatch(/\$/);
    expect(visible).not.toMatch(/\d{2}\.\d{3}/); // 66.300, 99.000, 110.000…

    expect(hype72GiftsVisibles()).toEqual([]);
    expect(hype72GiftFrom()).toBeNull();

    // Con los precios aprobados, el test pasa a ser éste:
    //   expect(hype72PriceLine(drop('01'))).toBe('$66.300 las 4');
    //   expect(hype72GiftsVisibles()).toHaveLength(3);
    //   expect(hype72GiftFrom()).toBe('$100.000');
  });

  it('los montos pendientes siguen escritos, listos para cuando se aprueben', () => {
    // No se borraron: si no estuvieran, publicarlos sería volver a buscarlos.
    expect(drop('01').precioPendiente).toBe('$66.300 las 4');
    expect(drop('03').precioPendiente).toMatch(/\$99\.000/);
    expect(drop('04').precioPendiente).toMatch(/\$110\.000/);
    expect(HYPE72_GIFTS.map((g) => g.amount)).toEqual(['$100.000', '$140.000', '$200.000']);
  });

  it('la nota sin cifra del drop 01 sí se publica', () => {
    expect(hype72PriceLine(drop('01'))).toBe('Al precio del 3 PACK');
  });

  it('los drops sin nota ni monto aprobado no muestran línea de precio', () => {
    for (const id of ['02', '03', '04', '05', '06']) {
      expect(hype72PriceLine(drop(id))).toBeNull();
    }
  });

  it('ninguna claim promete una vigencia sin confirmar', () => {
    // "por 24 horas" en el drop 02 era una ventana que nunca se confirmó.
    // "las 72 horas" sí vale: es el nombre del evento, no una vigencia.
    for (const d of HYPE72_DROPS) {
      expect(d.claim).not.toMatch(/\b(por|durante|solo)\s+\d+\s*(horas?|h|d[ií]as?)\b/i);
    }
  });
});

/**
 * El gate de la landing. `noindex` no es un mecanismo de acceso: cualquiera con
 * la URL ve la página. Antes de la apertura se puede ver SOLO con la cookie del
 * gate; desde HYPE72_PUBLIC_AT se abre sola, sin deploy.
 */
describe('hype72 · gate de acceso', () => {
  const ANTES = at('2026-10-29T12:00:00-03:00');

  it('la landing abre junto con el primer drop, no con la ventana publicada', () => {
    expect(HYPE72_PUBLIC_AT).toBe(HYPE72_EARLY_ACCESS);
    expect(HYPE72_PUBLIC_AT).toBe(drop('01').opensAt);
  });

  it('antes de la apertura, sin la cookie no se ve', () => {
    expect(isHype72Publica(ANTES)).toBe(false);
    expect(puedeVerHype72(ANTES, undefined)).toBe(false);
    expect(puedeVerHype72(ANTES, null)).toBe(false);
    expect(puedeVerHype72(ANTES, '')).toBe(false);
    // Un valor cualquiera no alcanza: tiene que ser el que setea /api/acceso.
    expect(puedeVerHype72(ANTES, 'si')).toBe(false);
    expect(puedeVerHype72(ANTES, 'TRUE')).toBe(false);
  });

  it('antes de la apertura, con la cookie del gate sí se ve', () => {
    expect(puedeVerHype72(ANTES, 'true')).toBe(true);
  });

  it('en el instante exacto de la apertura queda pública para cualquiera', () => {
    const justBefore = new Date(at(HYPE72_PUBLIC_AT).getTime() - 1);
    expect(isHype72Publica(justBefore)).toBe(false);
    expect(puedeVerHype72(justBefore, undefined)).toBe(false);

    expect(isHype72Publica(at(HYPE72_PUBLIC_AT))).toBe(true);
    expect(puedeVerHype72(at(HYPE72_PUBLIC_AT), undefined)).toBe(true);
  });

  it('terminado el evento la página sigue pública (no vuelve a cerrarse)', () => {
    expect(puedeVerHype72(at(HYPE72_END), undefined)).toBe(true);
  });
});
