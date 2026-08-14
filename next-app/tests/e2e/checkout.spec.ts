import { test, expect, Page } from '@playwright/test';
import {
  mockCheckoutServices,
  seedCart,
  acceptCookies,
  blockHeavyMedia,
  ANDREANI_RATES,
} from './mocks';

/**
 * Checkout de punta a punta: info → envío → pago.
 *
 * Ningún test llega a un pago real — las rutas de creación de pedido están
 * interceptadas (ver mocks.ts). Lo que se verifica es que el flujo llegue hasta
 * el final y que el total incluya el envío elegido.
 */

const COMPRADOR = {
  email: 'test@hypestyle.com.ar',
  nombre: 'Test',
  apellido: 'Comprador',
  dni: '30111222',
  direccion: 'Av. Siempreviva 742',
  cp: '1425',
  ciudad: 'Buenos Aires',
  telefono: '1145678900',
};

/** Los inputs no tienen `name` (son controlados por React), así que van por placeholder. */
async function completarInformacion(page: Page) {
  await page.getByPlaceholder('Email').fill(COMPRADOR.email);
  await page.getByPlaceholder('Nombre', { exact: true }).fill(COMPRADOR.nombre);
  await page.getByPlaceholder('Apellido').fill(COMPRADOR.apellido);
  await page.getByPlaceholder('DNI').fill(COMPRADOR.dni);
  await page.getByPlaceholder('Dirección y número').fill(COMPRADOR.direccion);
  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await page.getByPlaceholder('Ciudad').fill(COMPRADOR.ciudad);
  await page.getByPlaceholder('Teléfono (con código de área)').fill(COMPRADOR.telefono);
}

async function irAlCheckout(page: Page) {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  await seedCart(page);
  const mocks = await mockCheckoutServices(page);
  // `networkidle` cuelga acá: el checkout hace polling. Se espera un elemento concreto.
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
  return mocks;
}

test('el checkout recorre los tres pasos hasta pago', async ({ page }) => {
  await irAlCheckout(page);

  // Paso 1 — información
  await completarInformacion(page);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  // Paso 2 — envío
  const domicilio = page.getByText(ANDREANI_RATES[0].label);
  await expect(domicilio).toBeVisible({ timeout: 20_000 });
  await domicilio.click();

  const aPago = page.getByRole('button', { name: 'Continuar con el pago' });
  await expect(aPago).toBeEnabled();
  await aPago.click();

  // Paso 3 — pago
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
});

test('el total suma el costo del envío elegido', async ({ page }) => {
  await irAlCheckout(page);

  // En el primer paso el envío todavía no está calculado.
  await expect(page.locator('body')).toContainText(/se calcula a continuación/i);

  await completarInformacion(page);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  const domicilio = page.getByText(ANDREANI_RATES[0].label);
  await expect(domicilio).toBeVisible({ timeout: 20_000 });
  await domicilio.click();

  // 100.000 de mercadería + 12.000 de envío = 112.000
  await expect(page.locator('body')).toContainText('112.000');
});

test('elegir sucursal cambia el costo de envío', async ({ page }) => {
  await irAlCheckout(page);

  await completarInformacion(page);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  const sucursal = page.getByText(ANDREANI_RATES[1].label);
  await expect(sucursal).toBeVisible({ timeout: 20_000 });
  await sucursal.click();

  // 100.000 + 8.000 = 108.000
  await expect(page.locator('body')).toContainText('108.000');
});

test('preselecciona la primera tarifa para no dejar el paso trabado', async ({ page }) => {
  await irAlCheckout(page);

  await completarInformacion(page);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  await expect(page.getByText(ANDREANI_RATES[0].label)).toBeVisible({ timeout: 20_000 });

  // El checkout elige la primera tarifa apenas llegan (page.tsx:401), así que el
  // botón queda habilitado sin que el comprador toque nada, y el total ya la
  // incluye. Si esto cambiara a "ninguna preseleccionada", el botón quedaría
  // deshabilitado sin ningún cartel que lo explique.
  await expect(page.getByRole('button', { name: 'Continuar con el pago' })).toBeEnabled();
  await expect(page.locator('body')).toContainText('112.000');
});

test('el email es obligatorio para pasar del primer paso', async ({ page }) => {
  await irAlCheckout(page);

  // Todo menos el email.
  await page.getByPlaceholder('Nombre', { exact: true }).fill(COMPRADOR.nombre);
  await page.getByPlaceholder('Apellido').fill(COMPRADOR.apellido);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  // Sigue en el paso 1: la validación nativa del form corta el submit.
  await expect(page.getByPlaceholder('Email')).toBeVisible();
});

test('ningún test dispara un cobro real', async ({ page }) => {
  const { paymentAttempts } = await irAlCheckout(page);

  await completarInformacion(page);
  await page.getByRole('button', { name: 'Continuar con el envío' }).click();

  const domicilio = page.getByText(ANDREANI_RATES[0].label);
  await expect(domicilio).toBeVisible({ timeout: 20_000 });
  await domicilio.click();
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });

  // Llegar al paso de pago no debe, por sí solo, crear ningún pedido.
  expect(paymentAttempts).toEqual([]);
  expect(page.url()).toContain('/checkout');
});
