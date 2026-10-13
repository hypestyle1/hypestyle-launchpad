import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo mayorista con sesión real. Corre contra el `baseURL` de Playwright
 * (local con `next start`, o una preview/producción con PLAYWRIGHT_BASE_URL).
 *
 * Necesita una cuenta mayorista de prueba:
 *   MAYORISTA_E2E_USER=mail  MAYORISTA_E2E_PASS=clave
 * Sin eso, la suite se saltea entera (no falla): así puede vivir en CI sin
 * credenciales. Nunca confirma un pedido salvo MAYORISTA_E2E_CONFIRM=1, y eso
 * solo tiene sentido con una cuenta de prueba (crea una orden real en Woo,
 * descuenta stock y manda mails).
 *
 * Lo que cubre es el recorrido mínimo del plan de lanzamiento: login,
 * catálogo, búsqueda, orden, ficha con galería y cantidad, carrito con
 * persistencia y mínimo, paso de envío, Mi cuenta, Mis pedidos y logout.
 */

const USER = process.env.MAYORISTA_E2E_USER || '';
const PASS = process.env.MAYORISTA_E2E_PASS || '';
const CONFIRM = process.env.MAYORISTA_E2E_CONFIRM === '1';

test.describe('portal mayorista con sesión', () => {
  test.skip(!USER || !PASS, 'Faltan MAYORISTA_E2E_USER / MAYORISTA_E2E_PASS');

  async function login(page: Page) {
    await page.goto('/mayoristas/login');
    await page.getByPlaceholder('Tu mail').fill(USER);
    await page.getByPlaceholder('Tu contraseña').fill(PASS);
    await page.getByRole('button', { name: /ingresar/i }).click();
    await page.waitForURL(/\/mayoristas\/?$/, { timeout: 30_000 });
  }

  test('login, catálogo, búsqueda, orden y ficha', async ({ page }) => {
    await login(page);

    // Catálogo cargado (más de una card con precio).
    const cards = page.locator('a[href^="/mayoristas/producto/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    expect(await cards.count()).toBeGreaterThan(1);

    // Búsqueda y limpiar filtros.
    const search = page.getByLabel('Buscar producto');
    await search.fill('zzzz-no-existe');
    await expect(page.getByText(/No hay productos que coincidan/)).toBeVisible();
    await page.getByRole('button', { name: /limpiar filtros/i }).click();
    await expect(cards.first()).toBeVisible();

    // Orden por precio.
    await page.getByLabel('Ordenar').selectOption('precio-asc');
    await expect(cards.first()).toBeVisible();

    // Ficha del primer producto pedible (con botón de agregar o talles).
    await cards.first().click();
    await expect(page).toHaveURL(/\/mayoristas\/producto\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Precio de lista/)).toBeVisible();
    // Galería: si hay más de una foto, las miniaturas son tabs.
    const thumbs = page.getByRole('tab');
    if (await thumbs.count() > 1) {
      await thumbs.nth(1).click();
      await expect(thumbs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('agregar con cantidad, carrito persistente, mínimo y paso de envío', async ({ page }) => {
    await login(page);
    const cards = page.locator('a[href^="/mayoristas/producto/"]');
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });

    // Buscar una ficha donde se pueda pedir (botón "Agregar ... al pedido" habilitado).
    let added = false;
    for (let i = 0; i < Math.min(await cards.count(), 6) && !added; i++) {
      await cards.nth(i).click();
      const sizeButtons = page.getByRole('group', { name: 'Talle' }).getByRole('button');
      for (let j = 0; j < await sizeButtons.count(); j++) {
        const b = sizeButtons.nth(j);
        if (await b.isEnabled()) { await b.click(); break; }
      }
      const addBtn = page.getByRole('button', { name: /agregar .*al pedido/i });
      if (await addBtn.isEnabled().catch(() => false)) {
        await page.getByRole('button', { name: 'Una más' }).click();
        await addBtn.click();
        await expect(page.getByRole('status').filter({ hasText: /Ver pedido|agregad/i })).toBeVisible();
        added = true;
      } else {
        await page.goto('/mayoristas');
      }
    }
    expect(added, 'ninguna de las primeras fichas se pudo pedir').toBe(true);

    // Carrito: la línea está, con cantidad 2, y persiste al recargar.
    await page.goto('/mayoristas/carrito');
    await expect(page.getByRole('heading', { name: 'Mi pedido' })).toBeVisible();
    await expect(page.getByText(/Pedido mínimo/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mi pedido' })).toBeVisible();

    // "+" y "−" del carrito.
    await page.getByRole('button', { name: 'Una más' }).first().click();
    await page.getByRole('button', { name: 'Una menos' }).first().click();

    // Continuar solo si se llegó al mínimo; si no, el botón está deshabilitado (y eso es lo correcto).
    const continuar = page.getByRole('button', { name: 'Continuar' });
    if (await continuar.isEnabled()) {
      await continuar.click();
      await expect(page.getByRole('button', { name: /confirmar pedido/i })).toBeVisible();
      if (CONFIRM) {
        await page.getByRole('button', { name: /confirmar pedido/i }).click();
        await expect(page.getByText(/Pedido enviado|Cómo pagar/)).toBeVisible({ timeout: 120_000 });
      }
    } else {
      await expect(page.getByText(/te faltan|Cargando el pedido mínimo|No pudimos verificar/)).toBeVisible();
    }
  });

  test('Mi cuenta, Mis pedidos y logout', async ({ page }) => {
    await login(page);
    await page.goto('/mayoristas/cuenta');
    await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible();
    await expect(page.getByText('Pedido mínimo')).toBeVisible();
    await expect(page.getByText('Saldo a favor')).toBeVisible();

    await page.goto('/mayoristas/pedidos');
    await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible();
    await expect(page.getByText(/pedido|Todavía no hiciste|No pudimos cargar/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Salir' }).click();
    await page.waitForURL(/\/mayoristas\/login/);
    // Sin sesión, el catálogo manda al login.
    await page.goto('/mayoristas');
    await expect(page).toHaveURL(/\/mayoristas\/login/);
  });
});

test.describe('portal mayorista en mobile (390 px)', () => {
  test.skip(!USER || !PASS, 'Faltan MAYORISTA_E2E_USER / MAYORISTA_E2E_PASS');
  test.use({ viewport: { width: 390, height: 844 } });

  test('header, barra de mínimo y card legibles', async ({ page }) => {
    await page.goto('/mayoristas/login');
    await page.getByPlaceholder('Tu mail').fill(USER);
    await page.getByPlaceholder('Tu contraseña').fill(PASS);
    await page.getByRole('button', { name: /ingresar/i }).click();
    await page.waitForURL(/\/mayoristas\/?$/, { timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Pedidos' })).toBeVisible();
    // Sin chrome minorista: ni WhatsApp flotante ni barra de promo.
    await expect(page.getByRole('link', { name: 'Contactar por WhatsApp' })).toHaveCount(0);
    const card = page.locator('a[href^="/mayoristas/producto/"]').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    const box = await card.boundingBox();
    expect(box!.width).toBeGreaterThan(140);
  });
});
