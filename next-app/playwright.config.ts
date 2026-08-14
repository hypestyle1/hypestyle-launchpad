import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de los flujos de la web. Levanta el build de producción local
 * (`next start`) y lo ejercita con Chromium.
 *
 * Los tests NUNCA llegan a un pago real: cortan antes del redirect a
 * MercadoPago / PayPal / GOcuotas. Ver tests/e2e/mocks.ts.
 *
 * `next build` trae el catálogo de WordPress en build time, así que la primera
 * corrida necesita que el server de Hostinger esté vivo. Ya dentro del
 * navegador, WP y Andreani van mockeados: si no, los tests dependerían de la
 * salud del backend y se volverían inestables.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT) || 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // El checkout tiene polling y pasos encadenados; 30 s no siempre alcanza.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Dos workers, no "todos los cores": el sitio es pesado (video de fondo,
  // imágenes sin optimizar en `next start`) y con más paralelismo el headless
  // shell se queda sin memoria y la pestaña crashea a mitad de un test.
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Contra un baseURL externo (producción, preview de Vercel) no se levanta nada.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
