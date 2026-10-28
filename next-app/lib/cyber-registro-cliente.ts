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
 */
export type ResultadoRegistro = 'alta' | 'dado-de-baja' | 'email-invalido' | 'error';

export async function registrarCyber(email: string): Promise<ResultadoRegistro> {
  try {
    const res = await fetch('/api/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, preferencia: null, origen: 'cyber' }),
    });

    if (res.status === 400) return 'email-invalido';
    if (!res.ok) return 'error';

    const data = await res.json().catch(() => null);
    return data?.estado === 'dado-de-baja' ? 'dado-de-baja' : 'alta';
  } catch {
    // Sin red: el formulario ofrece reintentar.
    return 'error';
  }
}
