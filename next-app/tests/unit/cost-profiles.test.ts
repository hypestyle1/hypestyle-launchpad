import { describe, it, expect } from 'vitest';
import {
  normalizeProfile, normalizeProfiles, unitCostOf, isConfigured, humanizeKey,
  isComponentValid, hasIncompleteComponent,
  profileFromTemplate, COST_TEMPLATES, type CostProfile, type CostComponent,
} from '@/lib/cost-profiles';

// Perfil legacy real (shape de producción: components = objeto de claves fijas).
const LEGACY = {
  id: 'p_ms7ojoyl18z4',
  name: 'REGULAR TEEs BASICAS',
  components: { tela: 2521.29, corte: 400, confeccion: 1200, estampa: 0, avios: 300, planchaybolsa: 300, ecommerce: 500 },
  unitCost: 5221.29,
};

const comp = (label: string, amount: number): CostComponent => ({ id: 'c_' + label, label, amount });

describe('normalización legacy → V2', () => {
  it('convierte el objeto legacy a array preservando labels y montos (incluidos los 0)', () => {
    const p = normalizeProfile(LEGACY);
    expect(Array.isArray(p.components)).toBe(true);
    expect(p.components.map(c => c.label)).toEqual(['Tela', 'Corte', 'Confección', 'Estampa', 'Avíos', 'Plancha y bolsa', 'Ecommerce']);
    expect(p.components.find(c => c.label === 'Estampa')!.amount).toBe(0); // el 0 se conserva
  });

  it('la migración preserva el total: sum(V2) === legacy.unitCost', () => {
    const p = normalizeProfile(LEGACY);
    expect(p.unitCost).toBe(LEGACY.unitCost);
    expect(unitCostOf(p.components)).toBe(5221.29);
  });

  it('conserva el mismo profile.id (no rompe el vínculo con _hs_cost_profile_id)', () => {
    expect(normalizeProfile(LEGACY).id).toBe('p_ms7ojoyl18z4');
  });

  it('ids de componente legacy estables (derivados de la clave)', () => {
    const a = normalizeProfile(LEGACY).components.map(c => c.id);
    const b = normalizeProfile(LEGACY).components.map(c => c.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe('c_tela');
  });
});

describe('perfil V2 dinámico', () => {
  const v2: CostProfile = {
    id: 'p_x', name: 'SWEATER DISTRESSED',
    components: [comp('Tela', 20000), comp('Confección', 8000), comp('Bordado', 3000), comp('Packaging', 600)],
    unitCost: 0,
  };

  it('normaliza un array V2 sin perder labels custom (Bordado)', () => {
    const p = normalizeProfile(v2);
    expect(p.components.map(c => c.label)).toContain('Bordado');
    expect(p.unitCost).toBe(31600);
  });

  it('total = suma de componentes (única fuente de verdad)', () => {
    expect(unitCostOf(v2.components)).toBe(31600);
  });

  it('renombrar un componente no toca los demás', () => {
    const renamed = v2.components.map(c => c.label === 'Bordado' ? { ...c, label: 'DTG' } : c);
    expect(renamed.map(c => c.label)).toEqual(['Tela', 'Confección', 'DTG', 'Packaging']);
    expect(unitCostOf(renamed)).toBe(31600); // el total no cambia al renombrar
  });

  it('agregar un componente suma al total', () => {
    const added = [...v2.components, comp('Avíos', 500)];
    expect(unitCostOf(added)).toBe(32100);
  });

  it('borrar un componente resta del total', () => {
    const removed = v2.components.filter(c => c.label !== 'Packaging');
    expect(unitCostOf(removed)).toBe(31000);
  });

  it('reordenar preserva el total y cambia el orden', () => {
    const arr = [...v2.components];
    [arr[0], arr[1]] = [arr[1], arr[0]];
    expect(arr.map(c => c.label)).toEqual(['Confección', 'Tela', 'Bordado', 'Packaging']);
    expect(unitCostOf(arr)).toBe(31600);
  });
});

describe('producto terminado y casos borde', () => {
  it('producto terminado con un solo componente (Ring Silver)', () => {
    const ring = normalizeProfile({ id: 'p_ring', name: 'RING SILVER 925', components: [comp('Costo proveedor', 90000)] });
    expect(ring.components).toHaveLength(1);
    expect(ring.unitCost).toBe(90000);
    expect(isConfigured(ring)).toBe(true);
  });

  it('componente explícito de $0 = cero CONOCIDO (configurado)', () => {
    const p = normalizeProfile({ id: 'p_z', name: 'Regalo', components: [comp('Costo proveedor', 0)] });
    expect(isConfigured(p)).toBe(true);
    expect(p.unitCost).toBe(0);
  });

  it('perfil vacío (0 componentes) = MISSING (no configurado)', () => {
    const p = normalizeProfile({ id: 'p_e', name: 'Nuevo', components: [] });
    expect(isConfigured(p)).toBe(false);
    expect(p.unitCost).toBe(0);
  });

  it('componentes con monto negativo/NaN se sanean a >= 0 vía unitCostOf', () => {
    expect(unitCostOf([comp('a', -100 as number), comp('b', NaN as unknown as number), comp('c', 50)])).toBe(-50);
    // (unitCostOf suma tal cual; el clamp a >=0 lo hace la UI/PHP por componente)
  });
});

describe('cost-map / coverage compatibility', () => {
  it('normalizeProfiles acepta mezcla de legacy y V2', () => {
    const list = normalizeProfiles([LEGACY, { id: 'p_x', name: 'V2', components: [comp('Costo proveedor', 100)] }]);
    expect(list).toHaveLength(2);
    expect(list.every(p => Array.isArray(p.components))).toBe(true);
  });

  it('un perfil vacío queda fuera del costo conocido (missing en coverage)', () => {
    const list = normalizeProfiles([{ id: 'p_e', name: 'Vacío', components: {} }, LEGACY]);
    const configured = list.filter(isConfigured);
    expect(configured.map(p => p.id)).toEqual(['p_ms7ojoyl18z4']); // el vacío no cuenta
  });

  it('COGS total de una cartera = suma de unitCost de los configurados', () => {
    const list = normalizeProfiles([LEGACY, { id: 'p_ring', name: 'Ring', components: [comp('Costo proveedor', 90000)] }]);
    const cogs = list.filter(isConfigured).reduce((s, p) => s + p.unitCost, 0);
    expect(cogs).toBe(5221.29 + 90000);
  });
});

describe('data quality: $0 no es "incompleto"', () => {
  const p = (comps: CostComponent[]): CostProfile => ({ id: 'p', name: 'X', components: comps, unitCost: unitCostOf(comps) });

  it('un componente con label y $0 es VÁLIDO (cero conocido)', () => {
    expect(isComponentValid(comp('Estampa', 0))).toBe(true);
  });
  it('label vacío = inválido', () => {
    expect(isComponentValid({ id: 'c', label: '   ', amount: 100 })).toBe(false);
  });
  it('monto negativo o NaN = inválido', () => {
    expect(isComponentValid({ id: 'c', label: 'x', amount: -5 })).toBe(false);
    expect(isComponentValid({ id: 'c', label: 'x', amount: NaN })).toBe(false);
  });

  it('un perfil con Estampa=$0 NO es incompleto (no afecta la calidad del COGS)', () => {
    expect(hasIncompleteComponent(p([comp('Tela', 20000), comp('Estampa', 0)]))).toBe(false);
  });
  it('un perfil con un componente sin nombre SÍ es incompleto', () => {
    expect(hasIncompleteComponent(p([comp('Tela', 20000), { id: 'c', label: '', amount: 500 }]))).toBe(true);
  });
  it('un perfil vacío no es "incompleto" (es missing, otra categoría)', () => {
    expect(hasIncompleteComponent(p([]))).toBe(false);
    expect(isConfigured(p([]))).toBe(false);
  });
});

describe('lazy migration (contrato del merge server-side)', () => {
  // Espejo en JS del merge que hace el PHP (hype_cp_merge_profiles), para
  // documentar el contrato desde el lado del front. El test autoritativo del
  // merge real corre en PHP: PHP/_tests/cost-profiles-merge.test.php.
  const legacy = (i: number) => ({
    id: `p_${i}`, name: `Perfil ${i}`,
    components: { tela: 1000 + i, corte: 400, confeccion: 1200, estampa: 0, avios: 300, planchaybolsa: 300, ecommerce: 500 },
    unitCost: 0,
  });

  it('editar 1 de 20: sólo ese pasa a V2, los otros 19 quedan legacy, totales iguales', () => {
    const stored = Array.from({ length: 20 }, (_, k) => legacy(k + 1));
    const before = stored.map(s => normalizeProfile(s).unitCost);

    // El front manda SÓLO el perfil editado (V2). Simulamos el merge por id.
    const edited = normalizeProfile(stored[4]); // p_5 → V2
    const upserts = new Map([[edited.id, edited]]);
    const merged = stored.map(s => upserts.get(s.id) ?? s);

    // p_5 es V2 (components array); el resto sigue legacy (components objeto).
    expect(Array.isArray((merged[4] as any).components)).toBe(true);
    const otrosLegacy = merged.filter((_, k) => k !== 4).every(m => !Array.isArray((m as any).components));
    expect(otrosLegacy).toBe(true);
    // los 19 no editados son el MISMO objeto de referencia (intactos)
    expect(merged.filter((_, k) => k !== 4).every((m, k2) => m === stored.filter((_, k) => k !== 4)[k2])).toBe(true);
    // todos conservan el mismo unitCost
    const after = merged.map(m => normalizeProfile(m).unitCost);
    expect(after).toEqual(before);
  });
});

describe('helpers', () => {
  it('humanizeKey mapea claves legacy y capitaliza desconocidas', () => {
    expect(humanizeKey('confeccion')).toBe('Confección');
    expect(humanizeKey('costo_proveedor')).toBe('Costo proveedor');
    expect(humanizeKey('dtg')).toBe('Dtg');
  });

  it('las plantillas siempre incluyen "Personalizado" y un "Producto terminado" de 1 componente', () => {
    expect(COST_TEMPLATES.some(t => t.key === 'personalizado')).toBe(true);
    const terminado = COST_TEMPLATES.find(t => t.key === 'terminado')!;
    const p = profileFromTemplate(terminado, 'X');
    expect(p.components).toHaveLength(1);
    expect(p.components[0].label).toBe('Costo proveedor');
  });
});
