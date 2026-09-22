# Hypestyle Launchpad

E-commerce headless de **[Hypestyle](https://hypestyle.com.ar)**, marca de streetwear de Buenos Aires
que arrancó en 2018. El frontend y toda la lógica de negocio viven en Next.js; WooCommerce queda
como catálogo, pedidos y fuente de verdad de stock, consumido por API.

- **Demo / preview:** https://hypestyle-launchpad.vercel.app
- **Tienda en producción:** https://hypestyle.com.ar

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript |
| Estilos | Tailwind CSS · Radix UI primitives · `class-variance-authority` |
| Estado / datos | React Query (`@tanstack/react-query`) · React Context |
| Backend / commerce | WooCommerce headless (REST + WPGraphQL) sobre WordPress |
| Pagos | Mercado Pago · PayPal · GoCuotas · transferencia |
| Envíos | Andreani (sucursales y domicilio) |
| Mail | Brevo |
| Medición | Meta Pixel + Conversions API · GA4 · Microsoft Clarity |
| Animación | GSAP |
| Gráficos (panel) | Recharts |
| PDF (rótulos) | `pdf-lib` + `@pdf-lib/fontkit` |
| Deploy | Vercel (build y crons) |
| Tests | Vitest (unitarios) · Playwright (E2E) |
| CI | GitHub Actions |

## Features

### Tienda
- Catálogo desde WooCommerce con colecciones propias y landings de drop
  (`/colecciones/*`, `/new-in`, `/tees`, `/hoodies`, `/pants`, `/sets`, `/accesorios`).
- Ficha de producto con galería, variantes por talle/color, video de producto y reseñas.
- Carrito y checkout propios, con Mercado Pago, PayPal, GoCuotas y transferencia.
- Cálculo de envío Andreani por código postal, con elección de sucursal o domicilio.
- Checkout internacional (`/worldwide`) y selector de monedas (se cobra en ARS o USD).
- i18n y sugerencia de locale por visitante (`lib/i18n.ts`, `context/LocaleContext.tsx`).
- Personalizador de prendas con dorsal (`/personalizar/[slug]`).
- Gift cards (`/gift-cards`) con envío del código por mail.
- Reseñas con foto, moderación e invitación por token (`/review/[token]`, `/resena`).
- Aviso de reposición (`/back-in-stock`), seguimiento de pedido (`/seguimiento`), lookbooks
  (`/lookbook-fw26`, `/lookbook-faith`) y feed de looks (`/looks`).
- Portal mayorista con login propio, catálogo con precios especiales, carrito, alta de pedido
  y auto-registro (`/mayoristas/*`).

### Panel de administración (`/admin`)
- **Pedidos:** listado, detalle, alta manual, edición de ítems, rótulo para imprimir,
  marcado de despacho y notas.
- **Finanzas:** ingreso neto, conciliación de Mercado Pago, rentabilidad, costos operativos
  y perfiles de costo por producto.
- **Stock:** estado por variante y grupos de stock compartido (blanks POD).
- **Contenido:** campañas, creadores, plantillas, Close Friends de Instagram y flujo de
  aprobación.
- **Pauta y tráfico:** métricas de Meta Ads, GA4 y performance del sitio.
- **Reseñas:** moderación, tandas de invitación y configuración.
- **Mayoristas:** aprobación de solicitudes y alta de cuentas.
- **Conversaciones:** bandeja del bot de WhatsApp/Instagram con respuesta vía n8n.
- **Perfiles:** roles de acceso al panel.

### Automatizaciones (Vercel Cron)
| Ruta | Frecuencia | Qué hace |
|---|---|---|
| `/api/admin/abandoned-sweep` | cada hora | recupera carritos abandonados |
| `/api/admin/welcome-sweep` | cada 6 h | secuencia de bienvenida |
| `/api/match-goal-discount` | cada 2 min | descuento en vivo atado a un partido |
| `/api/paypal-reconcile` | cada hora | conciliación de pagos PayPal |
| `/api/admin/finance/sync-mp` | 06:15 | baja movimientos de Mercado Pago |
| `/api/admin/finance/mp-reports` | 07:00 | procesa los reportes de MP |

## Calidad

- **151** API routes, **93** páginas.
- **51** suites de tests unitarios con Vitest, sobre la lógica de precios, descuentos, envío,
  monedas, i18n, conciliación y fulfillment.
- **5** specs E2E con Playwright.
- CI en GitHub Actions (`.github/workflows/tests.yml`): los unitarios corren en cada PR y push a
  `main` y **bloquean el merge**; los E2E corren con `continue-on-error` porque dependen de que
  WordPress responda en build time, así que un rojo ahí no siempre significa código roto.

```bash
cd next-app
npm test          # unitarios (vitest)
npm run test:e2e  # E2E (playwright)
npm run lint
```

## Estructura

```
.
├── next-app/                 # la aplicación
│   ├── app/                  # App Router
│   │   ├── admin/            # panel de administración
│   │   ├── api/              # API routes (checkout, pagos, envíos, admin, crons)
│   │   └── ...               # páginas públicas de la tienda
│   ├── components/           # componentes de UI
│   ├── context/              # React Context (carrito, locale, etc.)
│   ├── data/                 # datos estáticos (looks, colecciones)
│   ├── hooks/
│   ├── lib/                  # lógica de negocio
│   │   ├── admin/  finance/  dashboard/  reviews/  meta/  ga4/
│   │   ├── content/  campaigns/  close-friends/  lookbooks/
│   │   └── bot/  brief/  performance/  workflow/
│   ├── scripts/
│   ├── tests/                # unit/ (vitest) · e2e/ (playwright)
│   └── middleware.ts
├── docs/                     # notas de arquitectura y auditorías
├── .github/workflows/        # CI
└── vercel.json               # build + crons
```

## Correrlo local

Requiere Node 20.

```bash
git clone https://github.com/hypestyle1/hypestyle-launchpad.git
cd hypestyle-launchpad/next-app
npm install
cp ../.env.example .env.local   # y completar los valores
npm run dev                     # http://localhost:3000
```

Las variables están documentadas en [`.env.example`](.env.example). Con solo
`NEXT_PUBLIC_WP_URL` y `NEXT_PUBLIC_GRAPHQL_URL` el catálogo ya renderiza; el checkout, el panel
y las integraciones piden sus claves propias.

> Los secretos van en `.env.local` (ignorado por git) o en las env vars de Vercel. Nunca en el
> código: no hay valores por defecto que sirvan como credencial.

## Deploy

Vercel está conectado al repositorio y **deploya solo al mergear en `main`**. No se hace deploy
manual. El build corre desde la raíz (`vercel.json`) con `npm run build --prefix next-app`.

---

Código propietario de Hypestyle. Publicado como referencia técnica, sin licencia de reutilización.
