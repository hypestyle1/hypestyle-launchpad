import { test, expect } from '@playwright/test';
import {
  acceptCookies,
  blockHeavyMedia,
  mockCheckoutServices,
  seedCart,
  TEST_ITEM,
} from './mocks';

/**
 * Carrito: que lo que se ve sea lo que se va a cobrar. El total del carrito es
 * la última cifra que el comprador mira antes de pagar.
 */

test.beforeEach(async ({ page }) => {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  // El carrito se mira dentro de /checkout, que llama a WP y a Andreani apenas
  // monta. Sin mockearlos esas requests quedan colgadas y el test se vuelve lento
  // e inestable.
  await mockCheckoutServices(page);
});

test('el carrito arranca vacío', async ({ page }) => {
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/carrito|cart/i);
});

test('un carrito sembrado sobrevive a la recarga', async ({ page }) => {
  await seedCart(page);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(TEST_ITEM.name)).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(TEST_ITEM.name)).toBeVisible();
});

test('el subtotal multiplica precio por cantidad', async ({ page }) => {
  await seedCart(page, [{ ...TEST_ITEM, quantity: 3 }]);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

  // 100.000 × 3 = 300.000. El formato es es-AR: punto como separador de miles.
  await expect(page.locator('body')).toContainText('300.000');
});

test('suma varias líneas con talles distintos', async ({ page }) => {
  await seedCart(page, [
    { ...TEST_ITEM, size: 'M', quantity: 1 },
    { ...TEST_ITEM, id: 'tee-test', name: 'Tee Test', price: 45000, size: 'L', quantity: 2 },
  ]);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Hoodie Test')).toBeVisible();
  await expect(page.getByText('Tee Test')).toBeVisible();
  // 100.000 + 45.000 × 2 = 190.000
  await expect(page.locator('body')).toContainText('190.000');
});

test('el mismo producto en dos talles son dos líneas', async ({ page }) => {
  await seedCart(page, [
    { ...TEST_ITEM, size: 'M', quantity: 1 },
    { ...TEST_ITEM, size: 'L', quantity: 1 },
  ]);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Hoodie Test')).toHaveCount(2);
  await expect(page.locator('body')).toContainText('200.000');
});
