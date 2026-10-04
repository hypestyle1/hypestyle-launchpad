/**
 * Datos del comprador guardados en el navegador para la próxima compra: el
 * que vuelve no tiene que tipear todo de nuevo. Se guardan recién al pasar el
 * primer paso (ya validados) y se precargan solo si el formulario está vacío.
 *
 * El DNI no se guarda a propósito: es el dato más sensible del formulario y,
 * en una compu compartida, no debería quedar a la vista del siguiente.
 * El checkout ofrece "Borrar mis datos" cuando precarga.
 */
const KEY = 'hy_checkout_datos';

export type DatosGuardados = {
  email: string; nombre: string; apellido: string; direccion: string; depto: string;
  cp: string; ciudad: string; provincia: string; pais: string; telefono: string;
  instagram?: string;
};

const CAMPOS: (keyof DatosGuardados)[] = [
  'email', 'nombre', 'apellido', 'direccion', 'depto', 'cp', 'ciudad', 'provincia', 'pais', 'telefono', 'instagram',
];

export function leerDatos(): DatosGuardados | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<DatosGuardados>;
    if (!d || typeof d.email !== 'string' || !d.email) return null;
    const limpio = {} as DatosGuardados;
    for (const c of CAMPOS) {
      const v = d[c];
      if (typeof v === 'string') (limpio as Record<string, string>)[c] = v;
    }
    return { ...limpio, pais: limpio.pais || 'AR' };
  } catch {
    return null;
  }
}

export function guardarDatos(datos: Partial<DatosGuardados>) {
  try {
    const previo = leerDatos() ?? {};
    const siguiente: Record<string, string> = { ...previo } as Record<string, string>;
    for (const c of CAMPOS) {
      const v = datos[c];
      if (typeof v === 'string') siguiente[c] = v;
    }
    localStorage.setItem(KEY, JSON.stringify(siguiente));
  } catch {
    // Modo privado o storage bloqueado: simplemente no se recuerda.
  }
}

export function borrarDatos() {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}
