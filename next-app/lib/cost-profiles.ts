// Cost Profiles V2 — modelo dinámico de componentes.
//
// Un perfil de costo es una lista ORDENADA de componentes personalizables
// `{ id, label, amount }`. El costo unitario es SIEMPRE `sum(components.amount)`
// (una sola fuente de verdad; nunca un total manual que pueda desincronizarse).
//
// Compatibilidad hacia atrás: los perfiles legacy guardaban `components` como un
// objeto de claves fijas `{ tela, corte, confeccion, ... }`. `normalizeProfile`
// convierte ese objeto a array V2 AL LEER, sin destruir nada: conserva el mismo
// `id`, mapea cada clave a su label humano y preserva todos los montos (incluidos
// los 0). La migración persistente recién ocurre cuando el usuario edita y guarda
// ese perfil. El mismo criterio de normalización vive en el PHP (`hype_cp_*`).

export interface CostComponent {
  id: string;
  label: string;
  amount: number;
}

export interface CostProfile {
  id: string;
  name: string;
  components: CostComponent[];
  unitCost: number;
}

/** Claves legacy → label humano. Fuera de esta tabla, un componente puede
 *  llamarse como el usuario quiera (Bordado, DTG, Costo proveedor, ...). */
const LEGACY_LABELS: Record<string, string> = {
  tela: 'Tela',
  corte: 'Corte',
  confeccion: 'Confección',
  estampa: 'Estampa',
  avios: 'Avíos',
  planchaybolsa: 'Plancha y bolsa',
  ecommerce: 'Ecommerce',
  tarjetayperfume: 'Tarjeta y perfume',
};

export function humanizeKey(key: string): string {
  if (LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  const s = String(key).replace(/[_-]+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(key);
}

let _seq = 0;
export function newComponentId(): string {
  _seq = (_seq + 1) % 1e6;
  return 'c_' + Date.now().toString(36) + _seq.toString(36) + Math.random().toString(36).slice(2, 5);
}
export function newProfileId(): string {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function roundMoney(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

/** Costo unitario = suma de los montos. Única fuente de verdad. */
export function unitCostOf(components: CostComponent[]): number {
  return roundMoney(components.reduce((s, c) => s + (Number(c.amount) || 0), 0));
}

/** ¿El perfil tiene costo conocido?
 *  - Vacío (0 componentes) = MISSING (no configurado).
 *  - Con >=1 componente, aunque sumen $0 = cero CONOCIDO/configurado.
 *  Misma distinción de data quality que el resto de Finanzas. */
export function isConfigured(p: { components?: CostComponent[] | null }): boolean {
  return Array.isArray(p.components) && p.components.length > 0;
}

/** Normaliza un perfil crudo (array V2 u objeto legacy) a V2. No destructivo:
 *  conserva id, labels y montos (incluidos los 0). */
export function normalizeProfile(raw: any): CostProfile {
  const id = String(raw?.id || newProfileId());
  const name = String(raw?.name ?? 'Perfil');
  const rc = raw?.components;
  let components: CostComponent[];

  if (Array.isArray(rc)) {
    components = rc.map((c: any, i: number) => {
      const label = String(c?.label ?? '').trim() || humanizeKey(String(c?.key ?? `Costo ${i + 1}`));
      return {
        id: String(c?.id || newComponentId()),
        label,
        amount: roundMoney(c?.amount),
      };
    });
  } else if (rc && typeof rc === 'object') {
    // legacy object { tela: n, ... } → array, preservando orden de inserción.
    // id estable derivado de la clave para que React y el guardado sean deterministas.
    components = Object.entries(rc).map(([k, v]) => ({
      id: 'c_' + String(k),
      label: humanizeKey(String(k)),
      amount: roundMoney(v),
    }));
  } else {
    components = [];
  }

  return { id, name, components, unitCost: unitCostOf(components) };
}

export function normalizeProfiles(raw: any): CostProfile[] {
  return Array.isArray(raw) ? raw.map(normalizeProfile) : [];
}

/** Plantillas opcionales: sólo prellenan componentes. Todo queda editable
 *  después. Nunca reintroducen estructura rígida. */
export interface CostTemplate {
  key: string;
  name: string;
  hint: string;
  components: { label: string; amount: number }[];
}

export const COST_TEMPLATES: CostTemplate[] = [
  {
    key: 'confeccionada',
    name: 'Prenda confeccionada',
    hint: 'Tela, corte, confección, avíos, packaging',
    components: [
      { label: 'Tela', amount: 0 },
      { label: 'Corte', amount: 0 },
      { label: 'Confección', amount: 0 },
      { label: 'Avíos', amount: 0 },
      { label: 'Packaging', amount: 0 },
    ],
  },
  {
    key: 'terminado',
    name: 'Producto terminado',
    hint: 'Un solo costo de proveedor',
    components: [{ label: 'Costo proveedor', amount: 0 }],
  },
  {
    key: 'accesorio',
    name: 'Accesorio',
    hint: 'Costo proveedor + packaging',
    components: [
      { label: 'Costo proveedor', amount: 0 },
      { label: 'Packaging', amount: 0 },
    ],
  },
  {
    key: 'personalizado',
    name: 'Personalizado',
    hint: 'Empezá en blanco y agregá los costos que uses',
    components: [],
  },
];

export function profileFromTemplate(t: CostTemplate, name: string): CostProfile {
  const components = t.components.map((c) => ({ id: newComponentId(), label: c.label, amount: c.amount }));
  return { id: newProfileId(), name, components, unitCost: unitCostOf(components) };
}
