import { test, expect } from '@playwright/test';
import {
  COOKIE_BANNER,
  DESKTOP,
  FICHA_SS27,
  MOBILE,
  coveredBy,
  horizontalOverflow,
  inViewport,
  prepare,
  settle,
} from './helpers';

/**
 * Problemas conocidos en producción que todavía no tienen arreglo mergeado.
 * El chequeo corre igual, marcado como "falla esperada": si deja de fallar,
 * Playwright avisa y hay que sacar la marca en el mismo PR que lo arregla.
 *
 * Para probar un arreglo contra su preview antes de sacar la marca:
 * `LAYOUT_SIN_CONOCIDOS=1` los trata como cualquier otro chequeo.
 */
const sinConocidos = !!process.env.LAYOUT_SIN_CONOCIDOS;
const CONOCIDOS = {
  // Ficha mobile: el reproductor y WhatsApp tapaban cuotas, talles y "Guía de
  // talles", y la barra fija "Agregar" aparecía antes de pasar el botón de
  // compra y tapaba la fila de talles (390x844, 375x667). Resuelto en el PR 3.1
  // (#543): queda en false y el chequeo vuelve a ser obligatorio.
  flotantes: false && !sinConocidos,
};

const PAGINAS = ['/', '/colecciones/ss27', '/tees', FICHA_SS27, '/new-in', '/checkout'];

test.describe('Desborde horizontal', () => {
  for (const vp of [MOBILE[0], MOBILE[2], DESKTOP[0], DESKTOP[3]]) {
    for (const path of PAGINAS) {
      test(`${path} en ${vp.name}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await prepare(page);
        await page.goto(path);
        await settle(page, 2500);
        expect(await horizontalOverflow(page)).toBeNull();
      });
    }
  }
});

test.describe('Home mobile: el hero queda libre', () => {
  for (const vp of MOBILE) {
    for (const cookies of [false, true]) {
      test(`${vp.name}${cookies ? ' con cartel de cookies' : ''}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await prepare(page, { cookies });
        await page.goto('/');
        await settle(page);

        const cta = page.getByRole('link', { name: 'Ver colección' }).filter({ visible: true }).first();
        const kicker = page.getByText('SS27-01 · Ya disponible').filter({ visible: true }).first();
        await expect(cta).toBeVisible();

        // El CTA nunca puede quedar tapado, ni por el cartel de cookies.
        expect(await coveredBy(cta), 'Ver colección tapado').toEqual([]);

        const tapanKicker = await coveredBy(kicker);
        if (CONOCIDOS.flotantes && vp.width === 375 && tapanKicker.length) {
          test.info().annotations.push({ type: 'conocido', description: `PR 3.1: ${tapanKicker.join(' | ')}` });
          return;
        }
        expect(tapanKicker, 'SS27-01 · Ya disponible tapado').toEqual([]);
      });
    }
  }
});

test.describe('Ficha mobile: compra sin nada encima', () => {
  for (const vp of [MOBILE[1], MOBILE[2], MOBILE[3]]) {
    for (const cookies of [false, true]) {
      test(`primera pantalla en ${vp.name}${cookies ? ' con cartel de cookies' : ''}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await prepare(page, { cookies });
        await page.goto(FICHA_SS27);
        await settle(page);

        const claves = {
          talles: page.locator('main button').filter({ hasText: /^(XS|S|M|L|XL|XXL)$/ }).filter({ visible: true }),
          guia: page.locator('main').getByText('Guía de talles', { exact: true }).filter({ visible: true }),
          transferencia: page.locator('main').getByText(/^Transferencia/).filter({ visible: true }),
          cuotas: page.locator('main').getByText(/^Tarjeta de crédito/).filter({ visible: true }),
        };
        // Que los encuentre: un chequeo que no encuentra nada pasa sin probar nada.
        for (const [k, loc] of Object.entries(claves)) expect(await loc.count(), `no encontré ${k}`).toBeGreaterThan(0);

        const tapados: string[] = [];
        for (const grupo of Object.values(claves)) {
          for (const el of await grupo.all()) {
            if (!(await inViewport(el))) continue;
            // El cartel de cookies puede tapar contenido: se cierra con un toque.
            // Los flotantes no.
            const by = await coveredBy(el, COOKIE_BANNER);
            if (by.length) tapados.push(`${(await el.innerText()).slice(0, 30)} ← ${by.join(' | ')}`);
          }
        }
        if (CONOCIDOS.flotantes && tapados.length) {
          test.info().annotations.push({ type: 'conocido', description: `PR 3.1: ${tapados.join(' || ')}` });
          return;
        }
        expect(tapados).toEqual([]);
      });
    }

    test(`barra fija "Agregar" en ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await prepare(page);
      await page.goto(FICHA_SS27);
      await settle(page);
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(1500);

      const barra = page.locator('div.md\\:hidden.fixed.bottom-0');
      const agregar = barra.getByRole('button').filter({ hasText: /agregar|seleccion|talle/i }).first();
      await expect(agregar).toBeVisible();
      expect(await coveredBy(agregar)).toEqual([]);
    });
  }
});

test.describe('Navbar desktop: el logo no se pisa con los links', () => {
  for (const vp of DESKTOP) {
    test(vp.name, async ({ page }) => {
      await page.setViewportSize(vp);
      await prepare(page);
      await page.goto('/colecciones/ss27');
      await settle(page, 2000);

      const choques = await page.evaluate(() => {
        const logo = [...document.querySelectorAll<HTMLImageElement>('header a[href="/"] img, nav a[href="/"] img')].find(
          (i) => i.getBoundingClientRect().width > 0,
        );
        if (!logo) return ['no se encontró el logo'];
        const L = logo.getBoundingClientRect();
        const own = logo.closest('a');
        return [...document.querySelectorAll<HTMLElement>('header a, header button, nav a, nav button')]
          .filter((el) => el !== own && !el.contains(logo) && el.getBoundingClientRect().width > 0)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.left < L.right && r.right > L.left && r.top < L.bottom && r.bottom > L.top;
          })
          .map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30));
      });
      expect(choques).toEqual([]);
    });
  }
});

test.describe('Catálogo', () => {
  test('/tees lista remeras', async ({ page }) => {
    await prepare(page);
    await page.goto('/tees');
    await page.locator('main a[href*="/producto/"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    const n = await page.evaluate(
      () => new Set([...document.querySelectorAll<HTMLAnchorElement>('main a[href*="/producto/"]')].map((a) => a.pathname)).size,
    );
    expect(n).toBeGreaterThanOrEqual(20);
  });

  test('/colecciones/ss27: colección completa y Próximamente sin compra', async ({ page }) => {
    await prepare(page);
    await page.goto('/colecciones/ss27');
    await page.locator('main a[href*="/producto/"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);

    const cards = await page.evaluate(() => {
      const byPath = new Map<string, { proximamente: boolean; talles: number }>();
      // Las cards son <a class="group">; las Próximamente van sin href (no linkean).
      for (const card of document.querySelectorAll<HTMLAnchorElement>('main a.group')) {
        const key = card.getAttribute('href') || 'prox:' + (card.querySelector('img')?.getAttribute('alt') ?? card.textContent);
        const prox = /Próximamente/.test(card.textContent || '');
        const talles = [...card.querySelectorAll('button')].filter((b) => /^(XS|S|M|L|XL|XXL)$/.test((b.textContent || '').trim())).length;
        byPath.set(key, { proximamente: prox, talles });
      }
      return [...byPath.entries()].map(([path, v]) => ({ path, ...v }));
    });

    expect(cards.length).toBeGreaterThanOrEqual(22);
    const prox = cards.filter((c) => c.proximamente);
    expect(prox.length, 'cards Próximamente').toBeGreaterThanOrEqual(1);
    for (const c of prox) expect(c.talles, `${c.path} con talles de compra rápida`).toBe(0);

    for (const c of prox) expect(c.path, 'una Próximamente linkea a una ficha comprable').toMatch(/^prox:/);
  });

  test('ficha Próximamente por URL directa: se ve, no se compra', async ({ page }) => {
    await prepare(page);
    // Las Próximamente no linkean desde la grilla; su slug sale del API público de
    // Woo (tag `proximamente`, id 42).
    const res = await page.request.get('https://lightpink-rook-704850.hostingersite.com/wp-json/wc/store/v1/products?tag=42&per_page=5');
    expect(res.ok()).toBeTruthy();
    const items = (await res.json()) as { slug: string }[];
    expect(items.length, 'productos con tag proximamente').toBeGreaterThan(0);
    for (const { slug } of items) {
      await page.goto(`/producto/${slug}`);
      await settle(page, 2500);
      const cta = page.locator('main').getByRole('button', { name: /Próximamente/ }).first();
      await expect(cta, slug).toBeVisible();
      await expect(cta, slug).toBeDisabled();
      await expect(page.locator('main').getByRole('button', { name: /agregar al carrito/i }), slug).toHaveCount(0);
    }
  });
});

test.describe('Links internos sin barra final', () => {
  // Con barra final cada navegación pasa por un 308 a la versión sin barra
  // (~150-450 ms más en mobile). Se revisa el DOM ya hidratado, con el menú abierto.
  for (const path of ['/', '/tees', '/colecciones/ss27', FICHA_SS27]) {
    test(path, async ({ page }) => {
      await page.setViewportSize(MOBILE[2]);
      await prepare(page);
      await page.goto(path);
      await settle(page, 3000);
      await page.getByRole('button', { name: 'Menu' }).click().catch(() => {});
      await page.waitForTimeout(800);
      const conBarra = await page.evaluate(() =>
        [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => (a.getAttribute('href') || '').split(/[?#]/)[0]))]
          .filter((h) => h.length > 1 && h.endsWith('/')),
      );
      expect(conBarra).toEqual([]);
    });
  }
});
