import { test, expect } from '@playwright/test';
import { acceptCookies, blockHeavyMedia } from './mocks';

/**
 * Smoke del home y del catálogo. Lo que cubre es el modo de falla más caro que
 * tiene el sitio: que WordPress devuelva algo raro y la página quede en blanco
 * o sin productos, con la pauta corriendo igual.
 */

test.beforeEach(async ({ page }) => {
  await acceptCookies(page);
  await blockHeavyMedia(page);
});

test('el home carga con su contenido principal', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message));

  const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBeLessThan(400);

  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('nav').first()).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();

  expect(errores).toEqual([]);
});

test('el home muestra productos con enlace a su ficha', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const fichas = page.locator('a[href^="/producto/"]');
  await expect(fichas.first()).toBeVisible({ timeout: 20_000 });
  expect(await fichas.count()).toBeGreaterThan(0);
});

test('la ficha de producto que enlaza el home carga con precio', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const primera = page.locator('a[href^="/producto/"]').first();
  await expect(primera).toBeVisible({ timeout: 20_000 });

  // Se navega por el href en vez de clickear: el home tiene una cortina con pin
  // de GSAP que mueve las tarjetas, y un click sobre un elemento en movimiento
  // hace el test flaky. Lo que importa es que el enlace apunte a una ficha real.
  const href = await primera.getAttribute('href');
  expect(href).toMatch(/^\/producto\/.+/);

  const res = await page.goto(href!, { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('h1')).toBeVisible();
  // El precio se muestra en pesos; sin esto la ficha estaría rota aunque cargue.
  await expect(page.locator('main')).toContainText(/\$\s?[\d.]+/);
});

// Un test por ruta y no un loop dentro de un test: las páginas de catálogo
// cargan el listado entero de imágenes, y visitar tres seguidas en la misma
// pestaña agota las conexiones del navegador (ERR_INSUFFICIENT_RESOURCES).
for (const ruta of ['/productos', '/new-in', '/colecciones']) {
  test(`la colección ${ruta} responde y renderiza`, async ({ page }) => {
    const res = await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
  });
}

test('una URL inexistente devuelve 404 y no un 200 vacío', async ({ page }) => {
  // Un 200 en una URL rota le dice a Google que la página existe.
  const res = await page.goto('/producto/no-existe-este-producto/', {
    waitUntil: 'domcontentloaded',
  });
  expect(res?.status()).toBe(404);
});
