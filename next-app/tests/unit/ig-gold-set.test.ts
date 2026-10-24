/**
 * Tests de la medición contra el gold set B4
 * (.claude/skills/hype-content-intelligence/lib/gold-set.mjs).
 *
 * Lo que se defiende acá es el método, no un número: que una etiqueta
 * inventada se rechace en vez de contarse como desacuerdo, que un gold set a
 * medio llenar no produzca una métrica, que las versiones de taxonomía tengan
 * que coincidir, y que nada de esto devuelva un GO automático.
 */
import { describe, expect, it } from 'vitest';

import * as goldModule from '../../../.claude/skills/hype-content-intelligence/lib/gold-set.mjs';
import { VOCABULARIO } from '@/lib/ig-insights/taxonomia';

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = goldModule as unknown as Record<string, any>;

const DIMS = ['category', 'coverType', 'visualStyle', 'scenario', 'hasModels'];

/** Etiquetas válidas, todas del vocabulario congelado. */
const COMPLETA = {
  category: 'producto',
  coverType: 'producto-piso',
  visualStyle: 'luz-natural',
  scenario: 'sin-escenario',
  hasModels: 'no',
};

/** Gold set sintético de 30 publicaciones, todas clasificadas. */
function goldSet(n = 30, override: (i: number) => Partial<typeof COMPLETA> = () => ({})) {
  return {
    taxonomiaVersion: 1,
    posts: Array.from({ length: n }, (_, i) => ({
      igMediaId: `gold${i}`,
      etiquetas: { ...COMPLETA, ...override(i) },
    })),
  };
}

function corrida(n = 30, override: (i: number) => Partial<typeof COMPLETA> = () => ({})) {
  return {
    taxonomyVersion: 1,
    posts: Array.from({ length: n }, (_, i) => ({
      igMediaId: `gold${i}`,
      ...COMPLETA,
      ...override(i),
    })),
  };
}

describe('umbrales', () => {
  it('son los cinco del doc 17 §6, con su justificación', () => {
    expect(Object.keys(g.UMBRALES).sort()).toEqual([...DIMS].sort());
    expect(g.UMBRALES.coverType.umbral).toBe(0.85);
    expect(g.UMBRALES.category.umbral).toBe(0.85);
    expect(g.UMBRALES.hasModels.umbral).toBe(0.9);
    expect(g.UMBRALES.scenario.umbral).toBe(0.75);
    expect(g.UMBRALES.visualStyle.umbral).toBe(0.75);
    for (const d of DIMS) expect(g.UMBRALES[d].porque.length).toBeGreaterThan(5);
  });

  it('el gold set son 30 publicaciones', () => {
    expect(g.TAMANO_GOLD_SET).toBe(30);
  });

  it('las dimensiones medidas son las cinco de la taxonomía', () => {
    for (const d of g.DIMENSIONES) expect(VOCABULARIO[d as keyof typeof VOCABULARIO]).toBeDefined();
    expect(g.DIMENSIONES).toHaveLength(5);
  });
});

describe('acuerdo perfecto', () => {
  const res = g.medirAcuerdo(goldSet(), corrida());

  it('da 100% en las cinco dimensiones', () => {
    for (const d of res.dimensiones) {
      expect(d.acuerdo).toBe(1);
      expect(d.pasa).toBe(true);
      expect(d.confusiones).toEqual([]);
    }
    expect(res.noLlegan).toEqual([]);
  });

  it('informa el universo comparado', () => {
    expect(res.comparadas).toBe(30);
    expect(res.goldSet.incompleto).toBe(false);
    expect(res.sinClasificar).toEqual([]);
    expect(res.fueraDelGoldSet).toEqual([]);
  });

  it('aun con acuerdo perfecto no emite un GO: sólo dice que ya se puede decidir', () => {
    expect(res.listoParaDecidir).toBe(true);
    expect('go' in res).toBe(false);
    expect('aprobado' in res).toBe(false);
    expect(g.informe(res)).toContain('no autoriza la clasificación masiva');
  });
});

describe('desacuerdos', () => {
  // 6 de 30 mal en coverType = 80%, por debajo del 85%.
  const res = g.medirAcuerdo(
    goldSet(),
    corrida(30, (i) => (i < 6 ? { coverType: 'modelo-editorial' } : {})),
  );

  it('calcula el acuerdo exacto por dimensión', () => {
    const cover = res.dimensiones.find((d: any) => d.dimension === 'coverType');
    expect(cover.n).toBe(30);
    expect(cover.aciertos).toBe(24);
    expect(cover.acuerdo).toBeCloseTo(0.8, 10);
    expect(cover.pasa).toBe(false);
  });

  it('nombra la confusión concreta, no un error genérico', () => {
    const cover = res.dimensiones.find((d: any) => d.dimension === 'coverType');
    expect(cover.confusiones[0]).toEqual({ par: 'producto-piso → modelo-editorial', n: 6 });
    expect(cover.errores).toHaveLength(6);
  });

  it('no contamina las otras dimensiones', () => {
    for (const d of res.dimensiones.filter((x: any) => x.dimension !== 'coverType')) {
      expect(d.acuerdo).toBe(1);
    }
    expect(res.noLlegan).toEqual(['coverType']);
  });

  it('el informe propone las dos salidas honestas, no una sola', () => {
    const texto = g.informe(res);
    expect(texto).toContain('ajustar el prompt');
    expect(texto).toContain('fusionar valores');
  });

  it('cada umbral se respeta tal cual: 80% pasa en scenario y no en category', () => {
    const r = g.medirAcuerdo(
      goldSet(),
      corrida(30, (i) => (i < 6 ? { scenario: 'calle', category: 'editorial' } : {})),
    );
    expect(r.dimensiones.find((d: any) => d.dimension === 'scenario').pasa).toBe(true);
    expect(r.dimensiones.find((d: any) => d.dimension === 'category').pasa).toBe(false);
  });
});

describe('una etiqueta inventada se rechaza, no se mide', () => {
  it('en la corrida', () => {
    expect(() =>
      g.medirAcuerdo(goldSet(), corrida(30, (i) => (i === 0 ? { coverType: 'frame-video' } : {}))),
    ).toThrow(/frame-video[\s\S]*no existe en la taxonomía v1/);
  });

  it('en el gold set', () => {
    expect(() =>
      g.medirAcuerdo(goldSet(30, (i) => (i === 0 ? { category: 'flatlay' } : {})), corrida()),
    ).toThrow(/flatlay[\s\S]*no existe/);
  });

  it('el error enumera los valores válidos, para poder corregir', () => {
    try {
      g.medirAcuerdo(goldSet(), corrida(30, (i) => (i === 0 ? { hasModels: 'modelo' } : {})));
      throw new Error('tendría que haber fallado');
    } catch (e) {
      expect(String((e as Error).message)).toContain('si-rostro');
    }
  });
});

describe('integridad del gold set', () => {
  it('una publicación sin terminar no se mide', () => {
    const gs = goldSet();
    delete (gs.posts[3].etiquetas as any).scenario;
    expect(() => g.medirAcuerdo(gs, corrida())).toThrow(/sin terminar[\s\S]*scenario/);
  });

  it('menos de 30 decisiones se marca como incompleto y no habilita decidir', () => {
    const res = g.medirAcuerdo(goldSet(11), corrida(11));
    expect(res.goldSet.incompleto).toBe(true);
    expect(res.listoParaDecidir).toBe(false);
    expect(g.informe(res)).toContain('INCOMPLETO');
  });

  it('una publicación duplicada es un error', () => {
    const gs = goldSet(30);
    gs.posts[5].igMediaId = gs.posts[4].igMediaId;
    expect(() => g.medirAcuerdo(gs, corrida())).toThrow(/dos veces/);
  });

  it('una fila sin id es un error', () => {
    const gs = goldSet(30) as any;
    delete gs.posts[0].igMediaId;
    expect(() => g.medirAcuerdo(gs, corrida())).toThrow(/sin id/);
  });
});

describe('versión de taxonomía', () => {
  it('un gold set de otra versión no mide esta corrida', () => {
    expect(() => g.medirAcuerdo({ ...goldSet(), taxonomiaVersion: 2 }, corrida())).toThrow(
      /gold set nuevo, no una conversión/,
    );
  });

  it('una corrida de otra versión tampoco', () => {
    expect(() => g.medirAcuerdo(goldSet(), { ...corrida(), taxonomyVersion: 2 })).toThrow(
      /la corrida declara taxonomía v2/,
    );
  });
});

describe('cobertura parcial de la corrida', () => {
  it('lo que la corrida no decidió no cuenta como desacuerdo, pero se informa', () => {
    const c = corrida(30, (i) => (i < 5 ? ({ scenario: null } as any) : {}));
    const res = g.medirAcuerdo(goldSet(), c);
    const esc = res.dimensiones.find((d: any) => d.dimension === 'scenario');
    expect(esc.n).toBe(25);
    expect(esc.acuerdo).toBe(1);
    expect(esc.sinDecidir).toBe(5);
    expect(g.informe(res)).toContain('sin decidir por la corrida');
  });

  it('una publicación que la corrida no tocó se lista aparte', () => {
    const c = corrida(28);
    const res = g.medirAcuerdo(goldSet(), c);
    expect(res.comparadas).toBe(28);
    expect(res.sinClasificar).toEqual(['gold28', 'gold29']);
    expect(res.listoParaDecidir).toBe(true);
  });

  it('una publicación de la corrida que no está en el gold set se lista aparte', () => {
    const c = corrida(30);
    c.posts.push({ igMediaId: 'otra', ...COMPLETA });
    const res = g.medirAcuerdo(goldSet(), c);
    expect(res.fueraDelGoldSet).toEqual(['otra']);
    expect(res.comparadas).toBe(30);
  });
});
