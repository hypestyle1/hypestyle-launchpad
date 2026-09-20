import { test, expect, Page } from '@playwright/test';
import { mockCheckoutServices, seedCart, acceptCookies, blockHeavyMedia, blockTrackers } from './mocks';

/**
 * Las ocho monedas del selector, en el checkout.
 *
 * Lo que se cuida acá es una sola cosa: que MOSTRAR un precio en reales o en
 * libras nunca se confunda con COBRAR en esa moneda. El sitio cobra en pesos
 * (envío a Argentina) o en dólares (afuera, PayPal y wire), y el resumen lo
 * tiene que decir cada vez que la moneda elegida no es la del cobro.
 *
 * La cotización va mockeada con números redondos para que el total esperado se
 * lea de un vistazo: el carrito de prueba vale $100.000.
 */

const FX = { USD: 1500, EUR: 1750, BRL: 300, GBP: 2000, MXN: 90, CLP: 1.6, UYU: 40 };

const TOTAL_ESPERADO: Record<string, string> = {
  ARS: '$ 100.000',
  USD: 'US$ 66.67',
  EUR: '€ 57.14',
  BRL: 'R$ 333,33',
  GBP: '£ 50.00',
  MXN: 'MX$ 1,111.11',
  CLP: 'CLP$ 62.500', // sin decimales: el peso chileno no tiene centavos
  UYU: '$U 2.500,00',
};

async function abrirCheckout(page: Page, opts: { currency?: string; country?: string }) {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  await blockTrackers(page);
  await seedCart(page);
  await mockCheckoutServices(page);
  await page.route('**/api/fx-rate', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FX) }),
  );
  await page.addInitScript((cur) => {
    window.localStorage.setItem('hs-locale-prompted', '1');
    if (cur) window.localStorage.setItem('hs-currency', cur);
  }, opts.currency ?? '');
  if (opts.country) {
    // En local el middleware no tiene geo y deja la cookie como está.
    const { hostname } = new URL(test.info().project.use.baseURL!);
    await page.context().addCookies([{ name: 'hs-country', value: opts.country, domain: hostname, path: '/' }]);
  }
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
}

const total = (page: Page) => page.locator('div', { hasText: /^Total/ }).last();
const aviso = (page: Page) => page.getByTestId('aviso-moneda-cobro');

test.describe('moneda elegida a mano, envío a Argentina', () => {
  for (const [code, esperado] of Object.entries(TOTAL_ESPERADO)) {
    test(`${code}: el total se ve como ${esperado}`, async ({ page }) => {
      await abrirCheckout(page, { currency: code });
      await expect(total(page)).toContainText(esperado);

      if (code === 'ARS') {
        await expect(aviso(page)).toHaveCount(0);
      } else {
        // Se paga en pesos: el aviso lo dice, con el monto real.
        await expect(aviso(page)).toContainText('pesos argentinos');
        await expect(aviso(page)).toContainText('$ 100.000');
        await expect(aviso(page)).toContainText(code);
      }
    });
  }
});

test.describe('visitante de afuera, moneda sugerida por país', () => {
  const CASOS = [
    { country: 'BR', code: 'BRL' },
    { country: 'GB', code: 'GBP' },
    { country: 'MX', code: 'MXN' },
    { country: 'CL', code: 'CLP' },
    { country: 'UY', code: 'UYU' },
    { country: 'ES', code: 'EUR' },
  ];

  for (const { country, code } of CASOS) {
    test(`${country}: ve ${code} y el checkout avisa que se cobra en dólares`, async ({ page }) => {
      await abrirCheckout(page, { country });
      await expect(total(page)).toContainText(TOTAL_ESPERADO[code]);
      await expect(aviso(page)).toContainText('US dollars');
      await expect(aviso(page)).toContainText('US$ 66.67');
      await expect(aviso(page)).toContainText(code);
    });
  }

  test('US: ve dólares y paga en dólares, sin aviso', async ({ page }) => {
    await abrirCheckout(page, { country: 'US' });
    await expect(total(page)).toContainText('US$ 66.67');
    await expect(aviso(page)).toHaveCount(0);
  });
});

test('una moneda guardada que ya no existe no rompe los precios', async ({ page }) => {
  await abrirCheckout(page, { currency: 'XXX' });
  await expect(total(page)).toContainText('$ 100.000');
  await expect(page.locator('body')).not.toContainText('NaN');
});

test('el selector ofrece las ocho monedas y cambia los precios', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirCheckout(page, {});
  // Una página estática: el home abre el popup de bienvenida encima del navbar.
  await page.goto('/faqs', { waitUntil: 'domcontentloaded' });

  // Sin geo, el sitio toma el idioma del navegador: en CI es inglés.
  await page.getByRole('button', { name: /Idioma y moneda|Language and currency/ }).first().click();
  for (const code of Object.keys(TOTAL_ESPERADO)) {
    // Por texto y no por nombre accesible: símbolo, código y nombre son spans pegados.
    await expect(page.getByRole('button').filter({ hasText: code }).last()).toBeVisible();
  }
  await page.getByRole('button').filter({ hasText: 'CLP' }).last().click();
  expect(await page.evaluate(() => window.localStorage.getItem('hs-currency'))).toBe('CLP');
});
