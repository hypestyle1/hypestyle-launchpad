/**
 * Corre `cb` cuando el hilo principal está libre, con un tope duro.
 *
 * Los scripts de medición no necesitan ejecutarse durante la carga, pero sí
 * tienen que ejecutarse *siempre* — incluso para quien abre el home, no toca
 * nada y se va. Por eso el tope: `requestIdleCallback` con `timeout` garantiza
 * que el navegador lo llame como muy tarde a los `timeoutMs`, haya o no un
 * hueco de idle. Sin ese tope, en una página que nunca deja de trabajar el
 * callback podría no correr nunca y perderíamos el PageView del rebote.
 *
 * Es a propósito distinto del diferido de Clarity (que espera la primera
 * interacción): acá el techo es de 2 s, no de 5, y no depende de que el
 * usuario haga nada.
 */
export function onIdle(cb: () => void, timeoutMs = 2000): () => void {
  if (typeof window === 'undefined') return () => {};

  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;

  if (typeof ric === 'function') {
    const id = ric(cb, { timeout: timeoutMs });
    return () => (window as any).cancelIdleCallback?.(id);
  }

  // Safari <16.4 no tiene requestIdleCallback. El setTimeout no espera a que
  // el hilo esté libre, pero al menos saca el script del camino crítico.
  const id = window.setTimeout(cb, timeoutMs);
  return () => clearTimeout(id);
}
