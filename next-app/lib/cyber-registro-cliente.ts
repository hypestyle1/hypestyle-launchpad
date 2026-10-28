/**
 * Alta del "Avisame" de CYBER HYPE desde el browser.
 *
 * Comparte el endpoint con el popup del sitio (/api/newsletter-subscribe) pero
 * viaja con `origen: 'cyber'`: entra a la lista propia del evento, queda
 * etiquetado para poder segmentar el envío, y NO dispara la bienvenida ni el
 * cupón HYPE10 (ese 10% se acumula con los packs del evento — ver
 * _claude/auditorias/2026-10-25-cupones-vs-packs.md).
 *
 * A diferencia del popup, acá el resultado SÍ le importa al formulario: si el
 * alta falla, el usuario tiene que poder reintentar en vez de ver un "listo"
 * que no pasó. Por eso devuelve un resultado en lugar de tragarse el error.
 *
 * Junto al mail viajan dos datos de la trampa de bots (ver la ruta):
 *  - `empresa`: el honeypot, que el formulario siempre manda vacío;
 *  - `ms`: milisegundos desde que se montó el formulario hasta el submit.
 * Ninguno de los dos le pide nada a la persona ni se ve en pantalla.
 */
import type { OrigenUtm } from '@/lib/cyber-utm';

export type ResultadoRegistro = 'alta' | 'email-invalido' | 'demasiados-intentos' | 'error';

export interface DatosRegistro {
  email: string;
  /** Honeypot: vacío siempre, salvo que lo complete un script. */
  empresa?: string;
  /** Milisegundos desde que se montó el formulario. */
  ms?: number;
  /** De dónde vino (ver lib/cyber-utm). Dato del usuario: se guarda, no decide nada. */
  utm?: OrigenUtm;
}

export async function registrarCyber({ email, empresa = '', ms, utm }: DatosRegistro): Promise<ResultadoRegistro> {
  try {
    const res = await fetch('/api/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, preferencia: null, origen: 'cyber', empresa, ms, ...utm }),
    });

    if (res.status === 400) return 'email-invalido';
    if (res.status === 429) return 'demasiados-intentos';
    if (!res.ok) return 'error'; // incluye el 503 de "falta la lista configurada"

    const data = await res.json().catch(() => null);
    return data?.ok ? 'alta' : 'error';
  } catch {
    // Sin red: el formulario ofrece reintentar.
    return 'error';
  }
}
