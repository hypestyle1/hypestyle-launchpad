import { test, expect, Page } from '@playwright/test';
import {
  mockCheckoutServices,
  seedCart,
  acceptCookies,
  blockHeavyMedia,
  blockTrackers,
  ANDREANI_RATES,
} from './mocks';

/**
 * Checkout de punta a punta: datos y envío → pago.
 *
 * Ningún test llega a un pago real — las rutas de creación de pedido están
 * interceptadas (ver mocks.ts). Lo que se verifica es que el flujo llegue hasta
 * el final y que el total incluya el envío, que se cotiza en vivo con el CP.
 */

const COMPRADOR = {
  email: 'test@hypestyle.com.ar',
  nombre: 'Test',
  apellido: 'Comprador',
  dni: '30111222',
  direccion: 'Av. Siempreviva 742',
  cp: '1425',
  telefono: '1145678900',
};

/** Los inputs no tienen `name` (son controlados por React), así que van por placeholder. */
async function completarDatos(page: Page) {
  await page.getByPlaceholder('Email').fill(COMPRADOR.email);
  // El CP dispara la cotización en vivo (debounce) y autocompleta barrio y provincia.
  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await page.getByPlaceholder('Nombre', { exact: true }).fill(COMPRADOR.nombre);
  await page.getByPlaceholder('Apellido').fill(COMPRADOR.apellido);
  await page.getByPlaceholder('DNI').fill(COMPRADOR.dni);
  await page.getByPlaceholder('Teléfono (con código de área)').fill(COMPRADOR.telefono);
}

async function esperarTarifas(page: Page) {
  await expect(page.getByText(ANDREANI_RATES[1].label)).toBeVisible({ timeout: 20_000 });
}

async function irAlCheckout(page: Page) {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  const { trackerHits } = await blockTrackers(page);
  await seedCart(page);
  const mocks = await mockCheckoutServices(page);
  // `networkidle` cuelga acá: el checkout hace polling. Se espera un elemento concreto.
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
  return { ...mocks, trackerHits };
}

test('el checkout llega al pago en dos pasos', async ({ page }) => {
  await irAlCheckout(page);

  // Paso 1 — datos y envío en la misma pantalla.
  await completarDatos(page);
  await esperarTarifas(page);

  // Con domicilio hay que cargar dirección y barrio (con sucursal, ninguno).
  // 1425 quedó sin barrio deducible (CP repartido): se escribe a mano.
  await page.getByText(ANDREANI_RATES[0].label).click();
  await page.getByPlaceholder('Dirección y número').fill(COMPRADOR.direccion);
  await page.getByPlaceholder('Barrio').fill('Palermo');

  await page.getByRole('button', { name: 'Continuar con el pago' }).click();

  // Paso 2 — pago
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
});

test('el total suma el envío apenas hay CP, sin cambiar de paso', async ({ page }) => {
  await irAlCheckout(page);

  // Sin CP el envío todavía no está calculado.
  await expect(page.locator('body')).toContainText(/se calcula con tu código postal/i);

  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await esperarTarifas(page);

  // La sucursal queda preseleccionada (tarifaPorDefecto en lib/envio):
  // 100.000 de mercadería + 8.000 de envío a sucursal = 108.000, en el paso 1.
  await expect(page.locator('body')).toContainText('108.000');
  // 12.000 − 8.000
  await expect(page.locator('body')).toContainText('Ahorrás $ 4.000');
});

test('elegir domicilio cambia el costo y pide la dirección', async ({ page }) => {
  await irAlCheckout(page);

  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await esperarTarifas(page);

  // Con sucursal preseleccionada no se pide nada del domicilio: ni dirección,
  // ni barrio/ciudad, ni provincia.
  await expect(page.getByPlaceholder('Dirección y número')).toBeHidden();
  await expect(page.getByPlaceholder('Barrio')).toBeHidden();
  await expect(page.getByPlaceholder('Ciudad')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('Provincia:');

  await page.getByText(ANDREANI_RATES[0].label).click();
  // 100.000 + 12.000 = 112.000
  await expect(page.locator('body')).toContainText('112.000');
  await expect(page.getByPlaceholder('Dirección y número')).toBeVisible();
  // La provincia vuelve, como fila compacta de texto.
  await expect(page.locator('body')).toContainText('Provincia:');
});

test('la sucursal elegida colapsa a una card y se puede cambiar', async ({ page }) => {
  await irAlCheckout(page);

  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await esperarTarifas(page);
  await page.getByText('Sucursal Palermo').click();

  // La lista se va; queda la elegida con su dirección y "Cambiar".
  await expect(page.locator('body')).toContainText('Retirás en');
  await expect(page.locator('body')).toContainText('Av. Santa Fe 3200');
  await page.locator('#metodo-envio').getByRole('button', { name: 'Cambiar' }).click();
  await expect(page.getByText('Sucursal Palermo')).toBeVisible();
});

test('cambiar el CP invalida la sucursal elegida y recotiza', async ({ page }) => {
  await irAlCheckout(page);

  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await esperarTarifas(page);
  await page.getByText('Sucursal Palermo').click();
  await expect(page.locator('body')).toContainText('Retirás en');

  await page.getByPlaceholder('Código postal').fill('7600');
  await esperarTarifas(page);
  // La selección anterior no sobrevive a un CP nuevo.
  await expect(page.locator('body')).not.toContainText('Retirás en');
});

test('un error del buscador de sucursales no es "no hay sucursales"', async ({ page }) => {
  await irAlCheckout(page);

  // El servicio falla: tiene que verse como error con reintento, no como un
  // CP sin sucursales que habilita continuar "a coordinar".
  await page.route('**/api/andreani-branches**', (route) =>
    route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ branches: [], error: 'Andreani auth' }) }),
  );
  await completarDatos(page);
  await esperarTarifas(page);
  await expect(page.locator('body')).toContainText('No pudimos cargar las sucursales');
  await expect(page.locator('body')).not.toContainText('te contactamos para coordinar');

  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeHidden();

  // El servicio se recupera: reintentar trae la lista sin perder ningún dato.
  await page.route('**/api/andreani-branches**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ branches: [{ id: 'suc-1', label: 'Sucursal Palermo', direccion: 'Av. Santa Fe 3200' }] }) }),
  );
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Sucursal Palermo')).toBeVisible();
  await expect(page.getByPlaceholder('DNI')).toHaveValue(COMPRADOR.dni);
});

test('con sucursal hay que elegir cuál antes de pagar', async ({ page }) => {
  await irAlCheckout(page);

  await completarDatos(page);
  await esperarTarifas(page);

  // Sucursal preseleccionada pero sin elegir cuál: avisa y no avanza.
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.locator('body')).toContainText(/elegí tu sucursal/i);

  await page.getByText('Sucursal Palermo').click();
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
});

test('el email es obligatorio para pasar del primer paso', async ({ page }) => {
  await irAlCheckout(page);

  // Todo menos el email.
  await page.getByPlaceholder('Nombre', { exact: true }).fill(COMPRADOR.nombre);
  await page.getByPlaceholder('Apellido').fill(COMPRADOR.apellido);
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();

  // Sigue en el paso 1: la validación corta el submit.
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeHidden();
});

test('ningún test dispara un cobro real', async ({ page }) => {
  const { paymentAttempts } = await irAlCheckout(page);

  await completarDatos(page);
  await esperarTarifas(page);
  await page.getByText(ANDREANI_RATES[0].label).click();
  await page.getByPlaceholder('Dirección y número').fill(COMPRADOR.direccion);
  await page.getByPlaceholder('Barrio').fill('Palermo');
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });

  // Llegar al paso de pago no debe, por sí solo, crear ningún pedido.
  expect(paymentAttempts).toEqual([]);
  expect(page.url()).toContain('/checkout');
});

test('ningún test le manda eventos a la medición de producción', async ({ page }) => {
  const { trackerHits } = await irAlCheckout(page);

  // El pixel carga diferido con un tope de 2 s (lib/defer-third-party.ts) y el
  // InitiateCheckout reintenta hasta encontrar fbq: se espera más que eso.
  await page.waitForTimeout(4_000);

  // Fuera de hypestyle.com.ar no se carga ningún tracker ni se llama al relay de
  // CAPI, aunque las cookies estén aceptadas. Ver lib/tracking-host.ts.
  expect(await page.evaluate(() => typeof window.fbq)).toBe('undefined');
  expect(await page.evaluate(() => typeof window.gtag)).toBe('undefined');
  expect(trackerHits).toEqual([]);
});
