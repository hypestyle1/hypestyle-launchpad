import { test, expect, Page, BrowserContext } from '@playwright/test';
import { blockHeavyMedia, blockTrackers, mockCheckoutServices, seedCart } from './mocks';

/**
 * Idioma y moneda por defecto: español y pesos para todos, personas y
 * buscadores, sin importar el país ni el idioma del navegador. Afuera se
 * OFRECE el cambio y solo pasa si la persona lo acepta.
 *
 * Lo que se cuida es la consistencia que ve Google: Googlebot rastrea desde
 * EE.UU. sin localStorage, así que tiene que ver el mismo HTML, el mismo
 * <html lang>, el mismo precio visible y el mismo JSON-LD que un comprador
 * argentino, también después de hidratar.
 */

const FICHA = '/producto/regular-tee-black';
// Con descuento al 13/10/2026. Si deja de tenerlo el test sigue valiendo:
// compara contra el JSON-LD, no contra un número fijo.
const FICHA_OFERTA = '/producto/trucker-cap-no-faith-no-glory';

async function preparar(page: Page, opts: { country?: string; stored?: { lang?: string; cur?: string } } = {}) {
  await blockHeavyMedia(page);
  await blockTrackers(page);
  await page.addInitScript((stored) => {
    window.localStorage.setItem('hy_cookie_consent', 'all');
    if (stored?.lang) window.localStorage.setItem('hs-language', stored.lang);
    if (stored?.cur) window.localStorage.setItem('hs-currency', stored.cur);
  }, opts.stored ?? null);
  if (opts.country) await ponerPais(page.context(), opts.country);
}

// En local el middleware no tiene geo y deja la cookie como está.
async function ponerPais(context: BrowserContext, country: string) {
  const { hostname } = new URL(test.info().project.use.baseURL!);
  await context.addCookies([{ name: 'hs-country', value: country, domain: hostname, path: '/' }]);
}

/** Precio y moneda del Offer del JSON-LD del HTML del server. */
async function ofertaJsonLd(page: Page): Promise<{ price: number; priceCurrency: string }> {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  for (const b of bloques) {
    const nodos = [JSON.parse(b)].flat().flatMap((n) => (n['@graph'] ? n['@graph'] : [n]));
    const producto = nodos.find((n) => n['@type'] === 'Product' && n.offers);
    if (producto) return [producto.offers].flat()[0];
  }
  throw new Error('la ficha no tiene Offer en el JSON-LD');
}

const pesos = (n: number) => `$ ${n.toLocaleString('es-AR')}`;
const sugerencia = (page: Page) => page.getByTestId('locale-suggestion');

/** La sugerencia aparece a los 1,2 s: se espera más que eso antes de mirar. */
async function abrir(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2_500);
}

async function esperarEspanolYPesos(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const oferta = await ofertaJsonLd(page);
  expect(oferta.priceCurrency).toBe('ARS');
  await expect(page.locator('main')).toContainText(pesos(oferta.price));
  await expect(page.locator('main')).not.toContainText('US$');
}

test.describe('sin preferencia guardada, el sitio queda en español y pesos', () => {
  test.describe('Argentina', () => {
    test.use({ locale: 'es-AR' });
    test('ficha: HTML, lang, precio visible y JSON-LD coinciden; no hay sugerencia', async ({ page }) => {
      await preparar(page, { country: 'AR' });
      await abrir(page, FICHA);
      await esperarEspanolYPesos(page);
      await expect(sugerencia(page)).toHaveCount(0);
    });

    test('ficha con descuento: el precio del JSON-LD es el que se ve', async ({ page }) => {
      await preparar(page, { country: 'AR' });
      await abrir(page, FICHA_OFERTA);
      await esperarEspanolYPesos(page);
    });
  });

  test.describe('EE.UU. (como Googlebot)', () => {
    test.use({ locale: 'en-US' });
    test('no cambia solo: sigue en español y pesos después de hidratar', async ({ page }) => {
      await preparar(page, { country: 'US' });
      const html = await (await page.request.get(FICHA)).text();
      expect(html).toContain('<html lang="es"');
      await abrir(page, FICHA);
      await esperarEspanolYPesos(page);
      // Ofrece, no impone.
      await expect(sugerencia(page)).toContainText('English · US Dollar');
      await page.waitForTimeout(1_500);
      await esperarEspanolYPesos(page);
      expect(await page.evaluate(() => [localStorage.getItem('hs-language'), localStorage.getItem('hs-currency')])).toEqual([null, null]);
    });

    test('mobile: igual en español y pesos', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await preparar(page, { country: 'US' });
      await abrir(page, FICHA_OFERTA);
      await esperarEspanolYPesos(page);
      await expect(sugerencia(page)).toBeVisible();
    });

    test('listado: precios en pesos', async ({ page }) => {
      await preparar(page, { country: 'US' });
      await abrir(page, '/tees');
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.locator('main')).toContainText('$ ');
      await expect(page.locator('main')).not.toContainText('US$');
    });
  });

  test.describe('navegador en inglés sin país detectado', () => {
    test.use({ locale: 'en-US' });
    test('queda en español y pesos; ofrece solo el idioma', async ({ page }) => {
      await preparar(page);
      await abrir(page, FICHA);
      await esperarEspanolYPesos(page);
      await expect(sugerencia(page)).toContainText('English');
      await sugerencia(page).getByRole('button', { name: 'English', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      // La moneda no se toca: no hay país del que sacarla.
      const oferta = await ofertaJsonLd(page);
      await expect(page.locator('main')).toContainText(pesos(oferta.price));
      expect(await page.evaluate(() => localStorage.getItem('hs-currency'))).toBeNull();
    });
  });
});

test.describe('la persona elige', () => {
  test.use({ locale: 'en-US' });

  test('acepta la sugerencia: cambia, se guarda y sobrevive recarga y navegación', async ({ page }) => {
    await preparar(page, { country: 'US' });
    await abrir(page, FICHA);
    await sugerencia(page).getByRole('button', { name: 'English · US Dollar' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toContainText('US$');
    expect(await page.evaluate(() => [localStorage.getItem('hs-language'), localStorage.getItem('hs-currency')])).toEqual(['EN', 'USD']);

    await abrir(page, FICHA);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toContainText('US$');
    await expect(sugerencia(page)).toHaveCount(0);
    // El JSON-LD no cambia con la elección: es el precio en pesos del server.
    expect((await ofertaJsonLd(page)).priceCurrency).toBe('ARS');

    await abrir(page, '/tees');
    await expect(page.locator('main')).toContainText('US$');
  });

  test('"Mantener así": queda en español y pesos y no vuelve a preguntar', async ({ page }) => {
    await preparar(page, { country: 'US' });
    await abrir(page, FICHA);
    await sugerencia(page).getByRole('button', { name: 'Keep as is' }).click();
    await esperarEspanolYPesos(page);
    await abrir(page, FICHA);
    await expect(sugerencia(page)).toHaveCount(0);
    await esperarEspanolYPesos(page);
  });

  test('preferencia guardada de antes (EN/USD): se respeta sin preguntar', async ({ page }) => {
    await preparar(page, { country: 'AR', stored: { lang: 'EN', cur: 'USD' } });
    await abrir(page, FICHA);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toContainText('US$');
    await expect(sugerencia(page)).toHaveCount(0);
  });

  test('cambio manual desde el selector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await preparar(page, { country: 'AR' });
    await abrir(page, '/faqs');
    await page.getByRole('button', { name: /Idioma y moneda/ }).first().click();
    const popup = page.getByTestId('locale-popup');
    await popup.getByRole('button').filter({ hasText: 'English' }).click();
    await popup.getByRole('button').filter({ hasText: 'EUR' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate(() => [localStorage.getItem('hs-language'), localStorage.getItem('hs-currency')])).toEqual(['EN', 'EUR']);
  });
});

test.describe('checkout', () => {
  test.use({ locale: 'en-US' });

  test('visitante de EE.UU. sin preferencia: el checkout sigue al destino y al salir vuelve a pesos', async ({ page }) => {
    await preparar(page, { country: 'US' });
    await seedCart(page);
    await mockCheckoutServices(page);
    await page.route('**/api/fx-rate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ USD: 1500 }) }),
    );
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 20_000 });
    // El total está en dólares (el monto exacto depende del envío internacional,
    // que desde el rediseño entra al total ya en el paso 1).
    await expect(page.locator('div', { hasText: /^Total/ }).last()).toContainText('US$');
    // Contexto del pedido, no una elección: no se guarda.
    expect(await page.evaluate(() => localStorage.getItem('hs-currency'))).toBeNull();

    await page.getByRole('link', { name: /hype/i }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/checkout'));
    await abrir(page, FICHA);
    await esperarEspanolYPesos(page);
  });
});
