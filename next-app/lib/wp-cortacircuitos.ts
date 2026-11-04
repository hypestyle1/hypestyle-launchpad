/**
 * Cortacircuitos para lecturas pesadas contra WordPress (incidente
 * MySQL/Hostinger 2–4/11/2026).
 *
 * Con WordPress lento, cada visita que necesitaba el catálogo volvía a pedirlo:
 * la consulta se cortaba a los 15 s, se reintentaba, y PHP seguía procesando
 * los pedidos abortados durante minutos. Así se ocupaban todos los procesos
 * PHP de la cuenta y el sitio entero dejaba de responder (4/11 16:07).
 *
 * - Una sola lectura a la vez por instancia: los pedidos simultáneos esperan
 *   la misma promesa en vez de lanzar otra consulta.
 * - Si la lectura falla, durante `pausaMs` no se vuelve a intentar: se falla al
 *   instante (y quien llama sirve lo último bueno que tenga).
 *
 * Es por instancia de función (memoria del proceso), no global: alcanza para
 * cortar el bucle, porque cada instancia hace como mucho 1 intento por pausa.
 */
export class WordPressEnPausaError extends Error {
  constructor(public readonly restanteMs: number) {
    super(`WordPress en pausa tras una falla reciente (${Math.ceil(restanteMs / 1000)} s)`);
    this.name = 'WordPressEnPausaError';
  }
}

/**
 * Errores de control de Next (render dinámico, notFound, redirect): no son
 * fallas de WordPress y no deben pausar las lecturas. El 4/11 18:07 un
 * "Dynamic server usage" contado como falla dejó todas las fichas en pausa.
 */
export function esErrorInternoDeNext(e: unknown): boolean {
  const err = e as { digest?: unknown; name?: unknown } | null;
  const digest = typeof err?.digest === 'string' ? err.digest : '';
  return digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_') || err?.name === 'DynamicServerError';
}

export function crearCortacircuitos(pausaMs = 60_000, ahora: () => number = Date.now) {
  let ultimaFalla = -Infinity;
  let enCurso: Promise<unknown> | null = null;
  return async function proteger<T>(fn: () => Promise<T>): Promise<T> {
    const restante = ultimaFalla + pausaMs - ahora();
    if (restante > 0) throw new WordPressEnPausaError(restante);
    if (enCurso) return enCurso as Promise<T>;
    const p = fn()
      .then(v => { ultimaFalla = -Infinity; return v; })
      .catch(e => { if (!esErrorInternoDeNext(e)) ultimaFalla = ahora(); throw e; })
      .finally(() => { enCurso = null; });
    enCurso = p;
    return p;
  };
}

/** Un cortacircuitos independiente por clave (ej. una ficha por slug). */
export function crearCortacircuitosPorClave(pausaMs = 60_000, ahora: () => number = Date.now) {
  const porClave = new Map<string, ReturnType<typeof crearCortacircuitos>>();
  return function proteger<T>(clave: string, fn: () => Promise<T>): Promise<T> {
    let c = porClave.get(clave);
    if (!c) { c = crearCortacircuitos(pausaMs, ahora); porClave.set(clave, c); }
    return c(fn);
  };
}
