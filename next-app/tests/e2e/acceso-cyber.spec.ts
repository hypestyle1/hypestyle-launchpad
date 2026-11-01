import { test, expect } from '@playwright/test';
import { LOCK_START, PUBLIC_OPEN, COOKIE_CYBER } from '../../lib/cyber-gate';
import { acceptCookies, blockHeavyMedia, blockTrackers, mockCheckoutServices, TEST_ITEM, ANDREANI_RATES } from './mocks';

// Solo servidor local con EARLY_ACCESS_PASSWORD=test-only-Cyber. Nunca un pago real.
test('gate, sesion persistente, navegacion y checkout antes de compartir la clave', async ({ page, context, baseURL }) => {
  test.skip(!baseURL?.startsWith('http://127.0.0.1:') || Date.now() < LOCK_START || Date.now() >= PUBLIC_OPEN,
    'Smoke local durante el cierre; los limites horarios se cubren con reloj simulado en unitarios.');
  test.setTimeout(180_000);
  await acceptCookies(page);
  await blockHeavyMedia(page);
  await blockTrackers(page);
  const { paymentAttempts } = await mockCheckoutServices(page);
  for (const path of ['/', '/productos', '/checkout']) {
    const denied = await context.request.get(path, { maxRedirects: 0 });
    expect(denied.status()).toBe(307);
    expect(denied.headers().location).toContain('/acceso');
  }
  await page.goto('/acceso', { waitUntil: 'domcontentloaded' });
  // Esperar hidratacion antes de escribir: el HTML inicial aun no tiene handlers.
  await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Acceso anticipado', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Esa clave no es.')).toBeVisible();

  const login = await context.request.post('/api/acceso', { data: { password: 'test-only-Cyber' } });
  expect(login.status()).toBe(200);
  const cookie = (await context.cookies()).find(c => c.name === COOKIE_CYBER)!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  expect(cookie.expires).toBeGreaterThan(PUBLIC_OPEN / 1000);

  // Sembrar una sola vez: las siguientes cargas deben conservar el carrito real.
  await page.evaluate(item => localStorage.setItem('hy_cart', JSON.stringify({ items: [item] })), TEST_ITEM);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(TEST_ITEM.name)).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(TEST_ITEM.name)).toBeVisible();
  await page.goto('/contacto', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/contacto$/);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(TEST_ITEM.name)).toBeVisible();
  expect((await context.cookies()).find(c => c.name === COOKIE_CYBER)?.value === cookie.value).toBe(true);

  await page.getByPlaceholder('Email').fill('test@hypestyle.com.ar');
  await page.getByPlaceholder('Código postal').fill('1425');
  await page.getByPlaceholder('Nombre', { exact: true }).fill('Test');
  await page.getByPlaceholder('Apellido').fill('Comprador');
  await page.getByPlaceholder('DNI').fill('30111222');
  await page.getByPlaceholder('Teléfono (con código de área)').fill('1145678900');
  await expect(page.getByText(ANDREANI_RATES[1].label)).toBeVisible();
  await page.getByText('Sucursal Palermo').click();
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible();
  expect(paymentAttempts).toEqual([]);
});
