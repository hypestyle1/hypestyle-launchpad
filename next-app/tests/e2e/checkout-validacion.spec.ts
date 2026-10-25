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
 * Validación de datos en el servidor, vista desde el navegador.
 *
 * Lo que se verifica acá es la parte que no se puede probar con tests de
 * unidad: que un 422 del servidor devuelva al paso 1 con el campo marcado **sin
 * perder nada** del checkout — ni el carrito, ni el CP, ni el barrio, ni la
 * sucursal elegida, ni el medio de pago — y que corregir y reenviar cree un
 * pedido, uno solo.
 *
 * El último test cubre la sugerencia de dominios mal tipeados, que ya existía y
 * no tenía ninguna red E2E: es lo que evita que un PR de validación la rompa
 * sin que nadie se entere.
 */

const COMPRADOR = {
  email: 'test@hypestyle.com.ar',
  nombre: 'Test',
  apellido: 'Comprador',
  dni: '30111222',
  cp: '1425',
  telefono: '1145678900',
};

async function irAlCheckout(page: Page) {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  await blockTrackers(page);
  await seedCart(page);
  await mockCheckoutServices(page);
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
}

/** Paso 1 completo, con la sucursal que viene preseleccionada. */
async function completarPaso1(page: Page) {
  await page.getByPlaceholder('Email').fill(COMPRADOR.email);
  await page.getByPlaceholder('Código postal').fill(COMPRADOR.cp);
  await page.getByPlaceholder('Nombre', { exact: true }).fill(COMPRADOR.nombre);
  await page.getByPlaceholder('Apellido').fill(COMPRADOR.apellido);
  await page.getByPlaceholder('DNI').fill(COMPRADOR.dni);
  await page.getByPlaceholder('Teléfono (con código de área)').fill(COMPRADOR.telefono);
  // La cotización llega con debounce; la sucursal queda preseleccionada.
  await expect(page.getByText(ANDREANI_RATES[1].label)).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
}

/**
 * Intercepta la creación del pedido. Se registra después de
 * `mockCheckoutServices`, así que tiene prioridad sobre su handler.
 */
async function interceptarCreacion(page: Page, responder: (n: number) => { status: number; body: unknown }) {
  const intentos: unknown[] = [];
  await page.route('**/api/create-order-gocuotas', async (route) => {
    intentos.push(await route.request().postDataJSON().catch(() => null));
    const r = responder(intentos.length);
    await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
  });
  return intentos;
}

const RECHAZO_TELEFONO = {
  status: 422,
  body: {
    codigo: 'datos_invalidos',
    errores: { telefono: 'Revisá el teléfono: parece que faltan números.' },
    message: 'Revisá los datos del formulario',
  },
};

test('un 422 del servidor vuelve al paso 1 y marca el campo, sin perder nada', async ({ page }) => {
  await irAlCheckout(page);
  const carritoAntes = await page.evaluate(() => window.localStorage.getItem('hy_cart'));

  await completarPaso1(page);
  // Sucursal preseleccionada: 100.000 de mercadería + 8.000 de envío.
  await expect(page.locator('body')).toContainText('108.000');

  await page.locator('input[name="metodo"][value="transferencia"]').check({ force: true });
  await interceptarCreacion(page, () => RECHAZO_TELEFONO);
  await page.getByRole('button', { name: 'Pagar' }).click();

  // (a) Volvió al paso 1.
  await expect(page.getByPlaceholder('Teléfono (con código de área)')).toBeVisible({ timeout: 20_000 });
  // (b) El teléfono quedó marcado y con el mensaje del servidor a la vista.
  const telefono = page.getByPlaceholder('Teléfono (con código de área)');
  await expect(telefono).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('body')).toContainText('Revisá el teléfono: parece que faltan números.');
  // El mensaje está asociado al input para un lector de pantalla.
  const describedBy = await telefono.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toContainText('faltan números');

  // (c) El carrito no se tocó.
  expect(await page.evaluate(() => window.localStorage.getItem('hy_cart'))).toBe(carritoAntes);
  // (d) CP, nombre, apellido y DNI siguen cargados.
  await expect(page.getByPlaceholder('Código postal')).toHaveValue(COMPRADOR.cp);
  await expect(page.getByPlaceholder('Nombre', { exact: true })).toHaveValue(COMPRADOR.nombre);
  await expect(page.getByPlaceholder('DNI')).toHaveValue(COMPRADOR.dni);
  // (e) La sucursal elegida y el total siguen como estaban: volver al paso 1 no
  // redispara la cotización ni pierde la tarifa.
  await expect(page.locator('body')).toContainText('108.000');

  // (f) El medio de pago elegido sigue elegido al volver al paso 2.
  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('input[name="metodo"][value="transferencia"]')).toBeChecked();
});

test('el error del servidor se apaga al editar el campo y el reenvío crea un pedido, uno solo', async ({ page }) => {
  await irAlCheckout(page);
  await completarPaso1(page);
  await page.locator('input[name="metodo"][value="transferencia"]').check({ force: true });

  // El primer intento se rechaza; el segundo entra.
  const intentos = await interceptarCreacion(page, (n) =>
    n === 1
      ? RECHAZO_TELEFONO
      : { status: 200, body: { wcOrderId: 4321, wcOrderNumber: '4321', orderKey: 'wc_order_test', wcTotal: 108000, taloPaymentData: null } },
  );

  await page.getByRole('button', { name: 'Pagar' }).click();
  const telefono = page.getByPlaceholder('Teléfono (con código de área)');
  await expect(telefono).toHaveAttribute('aria-invalid', 'true', { timeout: 20_000 });

  // Editar el campo apaga el error del servidor, sin esperar otro envío.
  await telefono.fill('1145678901');
  await expect(telefono).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('body')).not.toContainText('Revisá el teléfono: parece que faltan números.');

  await page.getByRole('button', { name: 'Continuar con el pago' }).click();
  await expect(page.getByRole('heading', { name: /medio de pago/i })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Pagar' }).click();

  // Dos intentos en total: el rechazado y el que entró. Ni uno más.
  await expect.poll(() => intentos.length, { timeout: 20_000 }).toBe(2);
  expect((intentos[1] as any).customer.telefono).toBe('1145678901');
});

test('dos clics seguidos en Pagar crean un solo pedido', async ({ page }) => {
  await irAlCheckout(page);
  await completarPaso1(page);
  await page.locator('input[name="metodo"][value="transferencia"]').check({ force: true });

  const intentos = await interceptarCreacion(page, () => ({
    status: 200,
    body: { wcOrderId: 4322, wcOrderNumber: '4322', orderKey: 'wc_order_test2', wcTotal: 108000, taloPaymentData: null },
  }));

  const pagar = page.getByRole('button', { name: 'Pagar' });
  await pagar.click();
  // El botón queda deshabilitado mientras se envía (`submitting`): el segundo
  // clic no debería llegar a la ruta.
  await pagar.click({ force: true, timeout: 5_000 }).catch(() => { /* ya deshabilitado */ });

  await expect.poll(() => intentos.length, { timeout: 20_000 }).toBe(1);
});

test('la sugerencia de dominio mal tipeado sigue funcionando y no deja error', async ({ page }) => {
  await irAlCheckout(page);

  const email = page.getByPlaceholder('Email');
  await email.fill('cliente@gmial.com');
  // El hint aparece sin necesidad de enviar nada.
  const sugerencia = page.getByRole('button', { name: /Quisiste decir/ });
  await expect(sugerencia).toBeVisible();
  await expect(sugerencia).toContainText('cliente@gmail.com');

  await sugerencia.click();
  await expect(email).toHaveValue('cliente@gmail.com');
  await expect(sugerencia).toBeHidden();
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
});
