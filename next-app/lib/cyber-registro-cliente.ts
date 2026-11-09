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
import { altaNewsletter } from '@/lib/newsletter-cliente';

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
  // Mismo cliente que el footer y el popup (lib/newsletter-cliente): mira el
  // status y el JSON (el 503 de "falta la lista configurada" es un error). El
  // endpoint del evento nunca dice "ya suscripto" —la respuesta es uniforme a
  // propósito—, pero si algún día lo dijera sigue siendo un alta.
  const { motivo } = await altaNewsletter({ email, origen: 'cyber', extra: { empresa, ms, ...utm } });
  return motivo === 'ya-suscripto' ? 'alta' : motivo;
}
