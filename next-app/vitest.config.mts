import { defineConfig } from 'vitest/config';

/**
 * Tests unitarios de la lógica de `lib/` — cálculo de precios, descuentos y
 * envío. Corren en node, sin navegador y sin tocar WordPress: son los que
 * cubren la plata. Los flujos de la web van por Playwright (playwright.config.ts).
 */
export default defineConfig({
  // Resuelve el alias `@/` desde tsconfig.json, igual que Next.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Playwright trae su propio runner; sin esto vitest levanta los .spec.ts
    // de e2e y falla al no encontrar el contexto de browser.
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
