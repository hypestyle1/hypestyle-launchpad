import type { Page } from '@playwright/test';

/**
 * Mocks de los servicios externos del checkout.
 *
 * Sin esto los tests no corren desde local, y no por un bug del código:
 *
 *  1. WP GraphQL solo acepta el origen `hypestyle.com.ar`, así que desde
 *     localhost el navegador bloquea por CORS.
 *  2. `/api/andreani-rates` no resuelve desde local — sin tarifas el paso de
 *     envío nunca se destraba.
 *  3. `checkStock` contra WP tampoco resuelve, así que "Agregar al carrito"
 *     corta antes de tocar el carrito. Por eso el carrito se siembra por
 *     localStorage en vez de por la UI.
 *
 * Y sobre todo: los gateways de pago quedan interceptados para que ningún test
 * genere un pedido ni un cobro real.
 */

export const ANDREANI_RATES = [
  { id: 'domicilio', label: 'Envío a domicilio', cost: 12000 },
  { id: 'sucursal', label: 'Retiro en sucursal Andreani', cost: 8000 },
];

/** Producto de prueba: precio redondo para que las cuentas se lean de un vistazo. */
export const TEST_ITEM = {
  id: 'hoodie-test',
  name: 'Hoodie Test',
  price: 100000,
  image: '/placeholder.svg',
  size: 'M',
  quantity: 1,
};

/** Rutas de creación de pedido y pago. Ninguna debe ejecutarse de verdad. */
const PAYMENT_ROUTES = [
  '**/api/create-order',
  '**/api/create-order-intl',
  '**/api/create-order-gocuotas',
  '**/api/gocuotas-order',
  '**/api/mp-preference',
  '**/api/paypal-order',
  '**/api/paypal-capture',
  '**/api/send-confirmation',
];

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/**
 * Deja el navegador en condiciones de recorrer el checkout: tarifas de Andreani,
 * stock y cupones resueltos, y los pagos bloqueados.
 *
 * Devuelve `paymentAttempts`, que registra qué endpoint de pago se intentó
 * llamar — sirve para afirmar que el flujo llegó hasta el final sin cobrarle a
 * nadie.
 */
export async function mockCheckoutServices(page: Page) {
  const paymentAttempts: { url: string; body: any }[] = [];

  await page.route('**/api/andreani-rates**', (route) =>
    route.fulfill(json({ rates: ANDREANI_RATES })),
  );

  await page.route('**/api/andreani-branches**', (route) =>
    route.fulfill(
      json({
        branches: [
          { id: 'suc-1', label: 'Sucursal Palermo', direccion: 'Av. Santa Fe 3200' },
        ],
      }),
    ),
  );

  // Un cupón inexistente: el checkout tiene que poder avanzar igual.
  await page.route('**/api/validate-coupon**', (route) =>
    route.fulfill(json({ valid: false, error: 'Cupón inválido' })),
  );

  // WP GraphQL: se responde vacío en vez de dejar que falle por CORS, para que
  // un timeout de red no se confunda con un bug de la página.
  await page.route('**/graphql', (route) => route.fulfill(json({ data: {} })));

  for (const pattern of PAYMENT_ROUTES) {
    await page.route(pattern, async (route) => {
      const request = route.request();
      paymentAttempts.push({
        url: request.url(),
        body: await request.postDataJSON().catch(() => null),
      });
      // 503: el checkout muestra el error y NO redirige a ningún gateway.
      await route.fulfill(json({ error: 'pago bloqueado por el test' }, 503));
    });
  }

  return { paymentAttempts };
}

/**
 * Siembra el carrito por localStorage.
 *
 * `checkStock` no resuelve desde local, así que agregar desde la ficha de
 * producto no es confiable en E2E. El contexto lee `hy_cart` al montar
 * (CartContext.tsx), así que sembrarlo es equivalente y mucho más estable.
 */
export async function seedCart(page: Page, items = [TEST_ITEM]) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ['hy_cart', JSON.stringify({ items })] as const,
  );
}

/** Descarta el banner de cookies, que tapa los botones del fondo de la página. */
export async function acceptCookies(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('hy_cookie_consent', 'all'));
}

/**
 * Corta la descarga de videos e imágenes.
 *
 * El home trae varios MP4 de fondo y `next start` local no tiene `sharp` para
 * optimizar imágenes: con los workers en paralelo pidiendo todo a la vez, la
 * navegación llega a tardar más de un minuto y el test falla por timeout sin
 * que haya nada roto. Los tests verifican estructura, datos y precios — nada
 * de eso depende de que el video se baje.
 */
export async function blockHeavyMedia(page: Page) {
  // Solo los videos. El home trae varios MP4 de fondo que pesan más que todo el
  // resto junto, y ningún test depende de que se reproduzcan.
  //
  // Las imágenes se dejan pasar a propósito: interceptarlas también (fueran
  // abortadas o servidas como pixel) hacía crashear la pestaña por memoria —
  // son cientos de requests por página y `next/image` reintenta las fallidas.
  await page.route('**/*.{mp4,webm,mov}', (route) => route.abort());
}
