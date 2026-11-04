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
  return !(env.VERCEL_ENV === 'preview' || env.CI === 'true');
}
