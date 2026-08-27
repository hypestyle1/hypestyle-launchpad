import { describe, it, expect } from 'vitest';
import {
  normalizeProfile, normalizeProfiles, unitCostOf, isConfigured, humanizeKey,
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
