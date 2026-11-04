/**
 * Incidente MySQL/Hostinger 2–4/11/2026: prerenderizar las ~110 fichas en cada
 * build son ~220 consultas GraphQL en paralelo (con reintentos) contra
 * WordPress, y cada push a un PR disparaba dos builds completas (preview de
 * Vercel + E2E de GitHub Actions). Las ráfagas que terminaron en revocación de
 * permisos MySQL coinciden con builds.
 *
 * En previews y en CI las fichas se generan recién cuando alguien las abre
 * (la ficha tiene dynamicParams = true). Producción prerenderiza igual que antes.
 */
export function prerenderizarFichas(env: Record<string, string | undefined> = process.env): boolean {
  // Integración 4/11: también en producción, salvo PRERENDER_FICHAS=1. Cada
  // merge disparaba una build de producción con ~220 consultas a WordPress.
  // Con la ficha detrás de unstable_cache + cortacircuitos (page.tsx), la
  // primera visita de cada ficha la genera y queda en caché.
  return env.PRERENDER_FICHAS === '1';
}
