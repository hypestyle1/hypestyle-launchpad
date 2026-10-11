import { defineConfig, devices } from '@playwright/test';

/**
 * Chequeos de layout contra un sitio ya publicado (producción o un preview de
 * Vercel). No levantan nada local ni mockean: solo leen páginas.
 *
 * Qué cubren: desborde horizontal, CTAs tapados por flotantes, logo contra los
 * links del navbar, que las categorías listen productos y que las prendas
 * Próximamente no se puedan comprar. Nacieron de la auditoría SS27 (11/10/2026):
 * `/tees` estuvo en producción sin remeras y nadie lo vio.
 *
 *   npm run test:layout                                   # contra producción
 *   LAYOUT_BASE_URL=https://<preview>.vercel.app npm run test:layout
 *
 * No crea pedidos ni toca el carrito del servidor. Bloquea los trackers para no
 * ensuciar la medición de las campañas.
 */
export default defineConfig({
  testDir: './tests/layout',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 3,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.LAYOUT_BASE_URL || 'https://www.hypestyle.com.ar',
    // Sin esto el sitio detecta el navegador en inglés y traduce: los textos
    // que buscan los chequeos ("Guía de talles") no aparecen.
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  outputDir: 'test-results/layout',
});
