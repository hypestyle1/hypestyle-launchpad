import type { Locator, Page } from '@playwright/test';

/** Medición de terceros: nunca se le habla desde un chequeo. */
const TRACKERS = /facebook|fbcdn|google-analytics|googletagmanager|doubleclick|clarity\.ms|tiktok|\/api\/capi|brevo|sendinblue/;

export const MOBILE = [
  { name: '320x568', width: 320, height: 568 },
  { name: 'iPhone SE 375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

export const DESKTOP = [
  { name: '1024', width: 1024, height: 768 },
  { name: '1100', width: 1100, height: 800 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

/** Una ficha SS27 a la venta, con talles y barra fija. */
export const FICHA_SS27 = '/producto/hype-distressed-grey-hoodie';

type Opts = {
  /** true = primera visita: el cartel de cookies está abierto. */
  cookies?: boolean;
};

/**
 * Prepara la página como la ve alguien que llega de un anuncio: sin trackers,
 * sin la intro de marca, sin el popup del newsletter (tiene sus propias reglas)
 * y con o sin el cartel de cookies.
 */
export async function prepare(page: Page, { cookies = false }: Opts = {}) {
  await page.route(TRACKERS, (r) => r.abort());
  await page.addInitScript((withCookies) => {
    try {
      localStorage.setItem('hype_newsletter_subscribed', '1');
      if (!withCookies) localStorage.setItem('hy_cookie_consent', 'all');
      // La intro de marca sale una vez por sesión.
      sessionStorage.setItem('hs-intro-seen', '1');
    } catch {}
  }, cookies);
}

/** Espera a que terminen la intro, las animaciones de entrada y los flotantes. */
export async function settle(page: Page, ms = 3500) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    if (sw <= w + 1) return null;
    // Quién se sale: los elementos visibles más anchos que el viewport.
    const culprits = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== 'fixed';
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { clientWidth: w, scrollWidth: sw, culprits };
  });
}

/**
 * ¿Algo tapa el elemento? Toca 5 puntos (centro y cuatro internos) con
 * `elementFromPoint` y devuelve quién está encima en cada uno que no sea el
 * propio elemento. Solo mira los puntos que caen dentro del viewport.
 *
 * `allow` es un selector de lo que puede tapar sin que sea un error (el cartel
 * de cookies sobre el contenido de la página, por ejemplo).
 */
export async function coveredBy(target: Locator, allow?: string) {
  return target.evaluate((el, allowSel) => {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pts = [
      [0.5, 0.5],
      [0.15, 0.25],
      [0.85, 0.25],
      [0.15, 0.75],
      [0.85, 0.75],
    ].map(([fx, fy]) => [r.left + r.width * fx, r.top + r.height * fy]);
    const out: string[] = [];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
      if (allowSel && hit.closest(allowSel)) continue;
      const tag = hit.closest('a,button,[role],div') ?? hit;
      out.push(
        `${tag.tagName.toLowerCase()}${tag.getAttribute('aria-label') ? `[aria-label="${tag.getAttribute('aria-label')}"]` : ''}.${String(tag.className).slice(0, 50)} @(${Math.round(x)},${Math.round(y)})`,
      );
    }
    return [...new Set(out)];
  }, allow);
}

/** ¿El elemento tiene al menos una parte dentro del viewport? */
export async function inViewport(target: Locator) {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && r.height > 0;
  });
}

/** Selector del cartel de cookies (fijo abajo, z-200). */
export const COOKIE_BANNER = 'div.fixed.bottom-0.z-\\[200\\]';
