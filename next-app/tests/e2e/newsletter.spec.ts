import { test, expect, type Page, type Route } from '@playwright/test';
import { acceptCookies, blockHeavyMedia, blockTrackers } from './mocks';

/**
 * Formularios de newsletter (issue #625): el footer decía "¡Listo!" sin llamar
 * a la API y el popup mostraba "listo" aunque la API fallara.
 *
 * /api/newsletter-subscribe va SIEMPRE mockeado: ningún test crea contactos en
 * Brevo ni dispara el mail de bienvenida con HYPE10.
 */

type Caso = { nombre: string; responder: (r: Route) => Promise<void> };

const json = (status: number, body: unknown) => (r: Route) =>
  r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const FALLOS: Caso[] = [
  { nombre: '500 (Brevo caído)', responder: json(500, { ok: false, error: 'Brevo error' }) },
  { nombre: '429 (tope por IP)', responder: json(429, { ok: false, error: 'rate_limited' }) },
  { nombre: '400 (mail inválido)', responder: json(400, { error: 'Invalid email' }) },
  { nombre: 'sin red', responder: (r) => r.abort('internetdisconnected') },
];

/** Intercepta la API y cuenta cuántas veces se llamó y con qué cuerpo. */
async function mockApi(page: Page, responder: (r: Route) => Promise<void>) {
  const pedidos: Record<string, unknown>[] = [];
  await page.route('**/api/newsletter-subscribe', async (route) => {
    pedidos.push(route.request().postDataJSON());
    await responder(route);
  });
  return pedidos;
}

test.beforeEach(async ({ page }) => {
  await acceptCookies(page);
  await blockHeavyMedia(page);
  await blockTrackers(page);
});

/**
 * Espera a que React tome el formulario. Si se tipea y se envía antes de la
 * hidratación, el form se manda nativo (recarga la página) y el test mide eso
 * en lugar del componente.
 */
async function esperarHidratacion(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  }, selector, { timeout: 60_000 });
}

/* ──────────────── Footer ──────────────── */

async function abrirFooter(page: Page) {
  // Con el popup ya respondido, para que no tape el footer.
  await page.addInitScript(() => window.localStorage.setItem('hype_newsletter_subscribed', '1'));
  await page.goto('/faqs', { waitUntil: 'domcontentloaded' });
  const form = page.locator('footer form[aria-label="Newsletter"]');
  await esperarHidratacion(page, 'footer form[aria-label="Newsletter"]');
  await form.scrollIntoViewIfNeeded();
  return form;
}

test.describe('footer', () => {
  test('el alta confirmada muestra "listo" y llama de verdad a la API', async ({ page }) => {
    const pedidos = await mockApi(page, json(200, { ok: true, estado: 'alta' }));
    const form = await abrirFooter(page);
    await form.locator('input[type="email"]').fill('prueba@gmail.com');
    await form.locator('button[type="submit"]').click();
    await expect(page.getByTestId('footer-newsletter-ok')).toContainText(/Listo|Done/);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ email: 'prueba@gmail.com', origen: 'footer' });
  });

  test('"ya estaba en la lista" es un éxito con su propio mensaje', async ({ page }) => {
    await mockApi(page, json(200, { ok: true, estado: 'ya-suscripto' }));
    const form = await abrirFooter(page);
    await form.locator('input[type="email"]').fill('prueba@gmail.com');
    await form.locator('button[type="submit"]').click();
    await expect(page.getByTestId('footer-newsletter-ok')).toContainText(/ya estaba|already/);
  });

  for (const caso of FALLOS) {
    test(`${caso.nombre}: no dice "listo", muestra el error y deja reintentar`, async ({ page }) => {
      const pedidos = await mockApi(page, caso.responder);
      const form = await abrirFooter(page);
      const input = form.locator('input[type="email"]');
      await input.fill('prueba@gmail.com');
      await form.locator('button[type="submit"]').click();

      await expect(page.locator('#footer-newsletter-error')).toBeVisible();
      await expect(page.getByTestId('footer-newsletter-ok')).toHaveCount(0);
      // El mail tipeado sigue ahí y el botón vuelve a estar habilitado.
      await expect(input).toHaveValue('prueba@gmail.com');
      await expect(form.locator('button[type="submit"]')).toBeEnabled();
      expect(pedidos).toHaveLength(1);
    });
  }

  test('sin doble envío: el botón se deshabilita mientras espera', async ({ page }) => {
    let liberar!: () => void;
    const espera = new Promise<void>((r) => { liberar = r; });
    const pedidos = await mockApi(page, async (route) => {
      await espera;
      await json(200, { ok: true, estado: 'alta' })(route);
    });
    const form = await abrirFooter(page);
    await form.locator('input[type="email"]').fill('prueba@gmail.com');
    const boton = form.locator('button[type="submit"]');
    await boton.click();
    await expect(boton).toBeDisabled();
    await form.locator('input[type="email"]').press('Enter');
    liberar();
    await expect(page.getByTestId('footer-newsletter-ok')).toBeVisible();
    expect(pedidos).toHaveLength(1);
  });
});

/* ──────────────── Popup: modal ──────────────── */

async function abrirModal(page: Page) {
  await page.goto('/faqs?popup=modal', { waitUntil: 'domcontentloaded' });
  const modal = page.getByRole('dialog', { name: '10% en tu primera compra' });
  await modal.getByRole('button', { name: 'Todo' }).click();
  return modal;
}

const subscribedFlag = (page: Page) => page.evaluate(() => window.localStorage.getItem('hype_newsletter_subscribed'));

test.describe('popup (modal)', () => {
  test('el alta confirmada pasa a "listo" y queda marcado como suscripto', async ({ page }) => {
    const pedidos = await mockApi(page, json(200, { ok: true, estado: 'alta' }));
    const modal = await abrirModal(page);
    await modal.getByPlaceholder('Tu email').fill('prueba@gmail.com');
    await modal.getByRole('button', { name: 'Quiero mi 10%' }).click();
    await expect(modal.getByText(/^Listo\./)).toBeVisible();
    expect(pedidos[0]).toMatchObject({ email: 'prueba@gmail.com', preferencia: 'todo', origen: 'popup' });
    expect(await subscribedFlag(page)).toBe('1');
  });

  for (const caso of FALLOS) {
    test(`${caso.nombre}: se queda en el paso del mail, con error y sin marcar suscripto`, async ({ page }) => {
      await mockApi(page, caso.responder);
      const modal = await abrirModal(page);
      const input = modal.getByPlaceholder('Tu email');
      await input.fill('prueba@gmail.com');
      await modal.getByRole('button', { name: 'Quiero mi 10%' }).click();

      await expect(modal.locator('#popup-newsletter-error')).toBeVisible();
      await expect(modal.getByText(/^Listo\./)).toHaveCount(0);
      await expect(input).toHaveValue('prueba@gmail.com');
      await expect(modal.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
      expect(await subscribedFlag(page)).toBeNull();
    });
  }

  test('reintentar después de un error funciona', async ({ page }) => {
    let intento = 0;
    await mockApi(page, (r) => (++intento === 1 ? json(500, { ok: false })(r) : json(200, { ok: true, estado: 'alta' })(r)));
    const modal = await abrirModal(page);
    await modal.getByPlaceholder('Tu email').fill('prueba@gmail.com');
    await modal.getByRole('button', { name: 'Quiero mi 10%' }).click();
    await modal.getByRole('button', { name: 'Reintentar' }).click();
    await expect(modal.getByText(/^Listo\./)).toBeVisible();
  });
});

/* ──────────────── Popup: barra ──────────────── */

test.describe('popup (barra)', () => {
  test('el alta confirmada muestra "listo"', async ({ page }) => {
    const pedidos = await mockApi(page, json(200, { ok: true, estado: 'alta' }));
    await page.goto('/faqs?popup=bar', { waitUntil: 'domcontentloaded' });
    const barra = page.getByRole('dialog', { name: '10% Off en tu primera compra' });
    await barra.getByPlaceholder('Tu email').fill('prueba@gmail.com');
    await barra.getByRole('button', { name: 'Unirme' }).click();
    await expect(barra.getByText(/^Listo\./)).toBeVisible();
    expect(pedidos[0]).toMatchObject({ origen: 'barra' });
  });

  for (const caso of FALLOS) {
    test(`${caso.nombre}: no dice "listo" y no marca suscripto`, async ({ page }) => {
      await mockApi(page, caso.responder);
      await page.goto('/faqs?popup=bar', { waitUntil: 'domcontentloaded' });
      const barra = page.getByRole('dialog', { name: '10% Off en tu primera compra' });
      await barra.getByPlaceholder('Tu email').fill('prueba@gmail.com');
      await barra.getByRole('button', { name: 'Unirme' }).click();
      await expect(barra.locator('#barra-newsletter-error')).toBeVisible();
      await expect(barra.getByText(/^Listo\./)).toHaveCount(0);
      await expect(barra.getByPlaceholder('Tu email')).toHaveValue('prueba@gmail.com');
      expect(await subscribedFlag(page)).toBeNull();
    });
  }
});
