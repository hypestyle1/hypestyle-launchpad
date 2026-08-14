# Tests

Dos capas, con propósitos distintos.

| | Qué cubre | Cómo se corre | Cuánto tarda |
|---|---|---|---|
| `tests/unit` (vitest) | Lógica de `lib/`: precios, descuentos, envío | `npm test` | < 1 s |
| `tests/e2e` (playwright) | Flujos de la web: home, carrito, checkout | `npm run test:e2e` | ~30 s |

```bash
npm test              # unitarios, una vez
npm run test:watch    # unitarios, en watch
npm run test:e2e      # E2E (levanta `next start` solo)
npm run test:e2e:ui   # E2E con la UI de Playwright, para depurar
```

## Unitarios

Corren en node, sin navegador y sin red. Cubren los módulos donde un error se
traduce en plata:

- `shipping-intl` — el escalón de envío internacional lo decide el **volumen**,
  no el peso (en Woo casi todos los productos tienen 0,25 kg cargado). Los casos
  salen del tarifario de Boxfly.
- `promo-3x2` — el 3x2 regala la unidad más barata **de todo el carrito**.
- `products-normalize` — de dónde sale el precio que se publica. El antecedente
  es el pedido #1747, tomado con el precio lleno en vez del de oferta.
- `fx` — una cotización rota de dolarapi no puede propagarse como precio; un 0
  daría `Infinity` en toda la vitrina.

Para agregar uno: `tests/unit/<modulo>.test.ts`, importando con el alias `@/`.

## E2E

Levantan el build de producción local (`next start` en el puerto 3100) y lo
recorren con Chromium.

**Ningún test llega a un pago real.** Las rutas de creación de pedido y de los
gateways están interceptadas en `mocks.ts`, y hay un test que verifica
justamente que llegar al paso de pago no dispare ningún cobro.

Para correrlos contra otra URL (producción, un preview de Vercel) sin levantar
nada local:

```bash
PLAYWRIGHT_BASE_URL=https://hypestyle.com.ar npm run test:e2e
```

Ojo: contra producción los mocks del checkout no aplican del mismo modo, así que
conviene limitarlo al smoke del home (`npm run test:e2e home.spec.ts`).

### Por qué hay tantos mocks

Ninguno tapa un bug — son obstáculos del entorno local:

1. **WP GraphQL solo acepta el origen `hypestyle.com.ar`**, así que desde
   localhost el navegador bloquea por CORS.
2. **`/api/andreani-rates` no resuelve desde local**: sin tarifas, el paso de
   envío nunca se destraba.
3. **`checkStock` contra WP tampoco resuelve**, así que "Agregar al carrito"
   corta antes de tocar el carrito. Por eso el carrito se siembra por
   `localStorage.hy_cart` en vez de por la UI.

### Gotchas del checkout

- Son **tres pasos**: info → envío → pago.
- Los inputs **no tienen atributo `name`** (son controlados por React): se los
  ubica por `placeholder`.
- El checkout **preselecciona la primera tarifa** de envío apenas llega
  (`app/checkout/page.tsx:401`).
- `waitUntil: 'networkidle'` cuelga: el checkout hace polling. Usar
  `domcontentloaded` más una espera sobre un elemento concreto.

### Gotchas del entorno

- **`sharp` es obligatorio.** Sin él, `next start` optimiza las imágenes por el
  camino lento y las páginas de catálogo agotan las conexiones del navegador
  (`ERR_INSUFFICIENT_RESOURCES`). Está en `devDependencies` por esto.
- **Dos workers, no más.** El sitio es pesado y con más paralelismo la pestaña
  crashea por memoria.
- Los **videos se abortan** en los tests (`blockHeavyMedia`). Las imágenes no:
  interceptarlas también hacía crashear la pestaña.

## CI

`.github/workflows/tests.yml` corre las dos capas en cada PR hacia `main`.

Los unitarios **bloquean**; el E2E **no**. El E2E necesita `next build`, y el
build trae el catálogo de WordPress en build time: si Hostinger está caído se
pone rojo sin que haya nada roto en el PR. Un check rojo por motivos ajenos
enseña a ignorar los checks — que es lo que ya pasa con `Vercel – launchpad`.
Cuando el E2E falle hay que mirarlo, pero decide una persona.
