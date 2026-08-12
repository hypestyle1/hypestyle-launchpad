/**
 * fetch con reintentos y backoff, para las llamadas a WordPress.
 *
 * El build de Vercel prerenderiza el home, /best-sellers, /special-prices,
 * /mayoristas, /api/products, el sitemap y las 109 fichas de producto: todas
 * piden datos a WPGraphQL. Un solo ETIMEDOUT contra Hostinger tiraba abajo el
 * deploy entero (pasó el 11/08, ver el PR de checkout internacional). Un
 * reintento convierte ese deploy caído en unos segundos más de build.
 *
 * Reintenta solo lo que puede ser transitorio: error de red, timeout, 5xx y
 * 429. Un 4xx (salvo 429) es un problema real y se devuelve tal cual, sin
 * gastar reintentos.
 */

type FetchInit = RequestInit & { next?: { revalidate?: number } };

interface RetryOptions {
  /** Reintentos DESPUÉS del primer intento. */
  retries?: number;
  /** Base del backoff exponencial, en ms. */
  baseDelayMs?: number;
  /** Corte por intento. Sin esto, un host colgado bloquea el build hasta el timeout de Vercel. */
  timeoutMs?: number;
}

const DEFAULTS: Required<RetryOptions> = { retries: 3, baseDelayMs: 400, timeoutMs: 15_000 };

function shouldRetryStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function fetchWithRetry(
  input: string | URL | Request,
  init: FetchInit = {},
  opts: RetryOptions = {},
): Promise<Response> {
  const { retries, baseDelayMs, timeoutMs } = { ...DEFAULTS, ...opts };
  const callerSignal = init.signal ?? undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Si quien llamó ya abortó (ej. el usuario cambió de página), no se
    // reintenta: no es un fallo del servidor.
    if (callerSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    callerSignal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (attempt < retries && shouldRetryStatus(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      // Abort del caller: se propaga sin reintentar.
      if (callerSignal?.aborted) throw err;
      lastError = err;
      if (attempt === retries) break;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onAbort);
    }

    // Backoff exponencial con jitter, para no golpear al host en sincronía
    // cuando varias páginas del build reintentan a la vez.
    const delay = baseDelayMs * 2 ** attempt;
    await sleep(delay + Math.random() * baseDelayMs);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch falló tras ${retries + 1} intentos`);
}
