import { normalizeCpAr } from '@/lib/postal-code';

/**
 * Validación por campo del primer paso del checkout. Antes el formulario solo
 * tenía `required` nativo: el error aparecía al apretar "Continuar", en el
 * globito del navegador y de a un campo por vez. Ahora cada campo se marca al
 * salir de él, con el motivo abajo.
 *
 * Criterio: bloquear solo lo que seguro rompe el pedido (vacío, mail sin
 * forma de mail, CP que Andreani no puede leer). Lo dudoso no se bloquea:
 * una venta perdida por un validador estricto cuesta más que un dato raro.
 */
export type CampoInfo =
  | 'email' | 'nombre' | 'apellido' | 'dni' | 'direccion'
  | 'cp' | 'ciudad' | 'provincia' | 'telefono';

export type DatosInfo = Record<CampoInfo, string> & { pais: string };

type Opciones = { soloGift: boolean; internacional: boolean; provinciaObligatoria: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function camposVisibles({ soloGift, internacional }: Omit<Opciones, 'provinciaObligatoria'>): CampoInfo[] {
  if (soloGift) return ['email', 'nombre', 'apellido', 'telefono'];
  if (internacional) return ['email', 'nombre', 'apellido', 'direccion', 'ciudad', 'provincia', 'cp', 'telefono'];
  return ['email', 'nombre', 'apellido', 'dni', 'direccion', 'cp', 'ciudad', 'telefono'];
}

export function validarCampo(campo: CampoInfo, datos: DatosInfo, opts: Opciones): string | null {
  const v = (datos[campo] ?? '').trim();
  const en = opts.internacional;
  switch (campo) {
    case 'email':
      if (!v) return en ? 'Enter your email' : 'Ingresá tu email';
      return EMAIL_RE.test(v) ? null : (en ? 'Check your email, it looks incomplete' : 'Revisá el email, parece incompleto');
    case 'nombre':
      return v ? null : (en ? 'Enter your first name' : 'Ingresá tu nombre');
    case 'apellido':
      return v ? null : (en ? 'Enter your last name' : 'Ingresá tu apellido');
    case 'dni': {
      if (!v) return 'Ingresá tu DNI';
      const digitos = v.replace(/\D/g, '');
      return digitos.length >= 7 && digitos.length <= 8 ? null : 'El DNI tiene 7 u 8 números';
    }
    case 'direccion':
      return v ? null : (en ? 'Enter your address' : 'Ingresá la calle y el número');
    case 'cp':
      if (!v) return en ? 'Enter your postal code' : 'Ingresá el código postal';
      if (en) return null;
      // Andreani necesita los 4 dígitos: "1425" o el CPA "C1425ABC" sirven.
      return /^\d{4}$/.test(normalizeCpAr(v)) ? null : 'El código postal tiene 4 números (ej. 1425)';
    case 'ciudad':
      return v ? null : (en ? 'Enter your city' : 'Ingresá la ciudad');
    case 'provincia':
      return !opts.provinciaObligatoria || v ? null : 'Enter your state or province';
    case 'telefono': {
      if (!v) return en ? 'Enter your phone' : 'Ingresá tu teléfono';
      return v.replace(/\D/g, '').length >= 8 ? null : (en ? 'Include the country and area code' : 'Sumá el código de área (ej. 11 4567 8900)');
    }
  }
}

export function validarInfo(datos: DatosInfo, opts: Opciones): Partial<Record<CampoInfo, string>> {
  const errores: Partial<Record<CampoInfo, string>> = {};
  for (const campo of camposVisibles(opts)) {
    const e = validarCampo(campo, datos, opts);
    if (e) errores[campo] = e;
  }
  return errores;
}

/** Dominios mal tipeados frecuentes. El mail de confirmación nunca llega y el
 *  cliente cree que el pedido no entró. */
const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmail.com.ar': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com', 'hormail.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmial.com.ar': 'hotmail.com.ar', 'hotmail.con.ar': 'hotmail.com.ar',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.com.ar.': 'yahoo.com.ar', 'yahoo.con.ar': 'yahoo.com.ar',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'otlook.com': 'outlook.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'live.con': 'live.com',
};

export function sugerirEmail(email: string): string | null {
  const v = email.trim().toLowerCase();
  const at = v.lastIndexOf('@');
  if (at < 1) return null;
  const dominio = v.slice(at + 1);
  const ok = TYPOS[dominio];
  return ok ? `${v.slice(0, at)}@${ok}` : null;
}
