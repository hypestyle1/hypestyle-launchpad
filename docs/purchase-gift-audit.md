# Auditoría técnica — Hypestyle Purchase Gift

Fecha: 26/07/2026. Alcance: determinar la arquitectura real de la tienda antes de diseñar el plugin `hypestyle-purchase-gift`.

## Resumen ejecutivo (leer primero)

**Hypestyle NO usa el carrito ni el checkout nativo de WooCommerce.** El storefront real es la app Next.js (`hypestyle-launchpad`), que mantiene su propio carrito 100% client-side (`localStorage`, sin sesión de WooCommerce) y crea las órdenes contra WordPress a través de **tres endpoints REST distintos**, no de `WC()->cart` ni de Cart/Checkout Blocks. Esto invalida buena parte de las secciones del brief que asumen una tienda WooCommerce "estándar" (fragments de carrito, Store API del lado del cliente navegando, checkout de bloques visible al comprador, etc.) y obliga a un diseño distinto, explicado en la sección 6.

Esto **no es una limitación del plugin**: es cómo funciona el sitio hoy, y ya lo sabíamos de sesiones anteriores de este mismo proyecto (checkout headless, pagos MP/PayPal/GoCuotas/Talo, ver `PHP/README.md`).

## 1. WordPress / WooCommerce

Consultado en vivo vía `GET /wp-json/wc/v3/system_status` (credenciales ya cargadas en `next-app/.env.local`):

| Campo | Valor |
|---|---|
| WooCommerce | **10.7.0** |
| WordPress | **6.9.5** |
| PHP | **8.3.30** |
| Tema activo | **Twenty Twenty-Five** (tema por defecto de WP, bloque, **no es child theme**, `has_woocommerce_support: false`) |
| HPOS (`custom_order_tables`) | **Activado** (`HPOS_enabled: true`, `order_datastore: OrdersTableDataStore`, `HPOS_sync_enabled: false` — **la sync a `wp_posts` está apagada**, así que las órdenes viven únicamente en las tablas HPOS) |
| Impuestos | **Desactivados** (`woocommerce_calc_taxes = no`) — no hay que lidiar con precios con/sin IVA |
| Moneda | ARS, sin geolocalización, sin conexión a WooCommerce.com Marketplace más allá del connect básico |

**Por qué importa:** el tema es irrelevante para el comprador (nunca lo ve — no tiene soporte WooCommerce declarado). `HPOS_sync_enabled: false` significa que **cualquier código que lea/escriba órdenes por `postmeta` directo no vería nada** — hay que usar `wc_get_order()` / `WC_Order` sí o sí, tal como pide el brief.

## 2. Carrito y checkout: NINGUNO de los escenarios esperados

El brief pregunta si se usa Cart/Checkout Blocks, checkout clásico por shortcode, o "frontend desacoplado/headless". La respuesta es la tercera, pero de forma más radical de lo habitual:

- El carrito vive en `next-app/context/CartContext.tsx`: un `useReducer` con persistencia en `localStorage` (`hy_cart`). No hay sesión de WooCommerce, no hay `wc_session`, no hay Store API consumida por el navegador.
- El checkout es una página propia de Next.js (`/checkout`), no `/carrito` ni `/finalizar-compra` de WordPress.
- La creación de la orden pasa por **tres rutas Next.js** distintas, cada una golpeando un backend distinto en WordPress:

| Ruta Next.js | Backend WP que llama | Cómo arma la orden |
|---|---|---|
| `app/api/create-order` | `POST /wp-json/hypestyle/v1/create-order` (función `hypestyle_create_order()` en el mu-plugin `hypestyle-api.php`) | Arma la orden a mano: `wc_create_order()` + `add_product()`/`WC_Order_Item_Product` manual por cada línea, shipping como `WC_Order_Item_Shipping`, el descuento/cupón como una **`WC_Order_Item_Fee` negativa** (NO como `WC_Coupon` real aplicado). Pago: MercadoPago / PayPal / Transferencia. Llama `wc_reduce_stock_levels()` **inmediatamente** tras crear la orden (antes de que se confirme el pago). |
| `app/api/create-order-gocuotas` | `POST /wp-json/wc/v3/orders` (**API REST estándar de WooCommerce**) | Arma el payload estándar (`line_items`, `shipping_lines`, `fee_lines`, **`coupon_lines` con el código real** — acá sí se aplica un `WC_Coupon` de verdad). Sin `status` explícito → queda `pending`. |
| `app/api/create-order-intl` | `POST /wp-json/wc/v3/orders` (idem, para compras internacionales) | Mismo patrón que GoCuotas. |

**Consecuencia directa para el plugin:** no existe un único punto de "checkout" al que engancharse con los hooks típicos de WooCommerce (`woocommerce_checkout_order_processed`, filtros de Cart/Checkout Blocks, fragments de `wc_ajax`). Esos hooks **no disparan nunca** en este sitio porque nadie pasa por el checkout nativo. Ver la decisión técnica en la sección 6.

## 3. Plugins activos que tocan carrito / pagos / precios / checkout

Vía `system_status.active_plugins`:

- **Mercado Pago** (`woo-mercado-pago-basic`), **WooCommerce PayPal Payments** (`ppcp-gateway`), **Talo Pay** (`talo-pay-cvu-woo`), **GoCuotas** — gateways de pago activos, ninguno modifica el carrito en sí.
- **Andreani WooCommerce** — método de envío; depende de meta `_chosen_shipping` seteado a mano por el mu-plugin (ver `PHP/README.md` v1.15.1) porque, al no pasar por el checkout nativo, WooCommerce nunca lo setea solo.
- **Meta for WooCommerce**, **Google for WooCommerce**, **Reddit for WooCommerce**, **Snapchat for WooCommerce** — catálogos/pixels, no tocan precios de carrito.
- **WPGraphQL** + **WPGraphQL WooCommerce (WooGraphQL)** + **WPGraphQL CORS** — el camino de **lectura** de catálogo que usa el frontend (`/api/products`, ver `app/api/products/route.ts`). CORS solo permite el origen `hypestyle.com.ar` (ya documentado en memoria del proyecto).
- **Advanced Custom Fields**, **Klaviyo**, **Jetpack**, **LiteSpeed Cache**, **WP Mail SMTP**, **Hostinger AI/Reach**, **Duplicator**, **Visa Acceptance Solutions**, **WooCommerce.com Update Manager** — no relevantes para carrito/precio.
- **No hay ningún plugin de "regalo por compra", loyalty, ni gift-with-purchase instalado.**

No aparece en esta lista `hype-wally-coupons` (el plugin propio que genera cupones "$20.000 OFF" — ver `PHP/README.md`), probablemente porque `system_status.active_plugins` no lista todos los custom sin actualizador; se confirmó su existencia por el propio README de la fuente de verdad del PHP. **Es la referencia directa a seguir**: es un plugin normal en `wp-content/plugins/`, con página propia en el admin, que usa únicamente `WC_Coupon` (API oficial), sin SQL directo — exactamente el patrón que debe seguir `hypestyle-purchase-gift`.

## 4. Cupones y descuentos

- `GET /wc/v3/settings/general` → `woocommerce_calc_taxes = no`.
- Cupones existentes: todos `discount_type: fixed_cart` (probado con 5 códigos reales de la tienda).
- La validación de reglas de cupón (vencimiento, mínimo/máximo, usos) usa `WC_Coupon` real vía el endpoint propio `/hypestyle/v1/validate-coupon` — pero luego el **descuento se aplica como número plano** (`discountAmount`) en el flujo `create-order` (fee negativa), o como cupón real en los flujos `create-order-gocuotas`/`create-order-intl` (`coupon_lines`). Es decir: **según qué endpoint procesó la orden, el descuento puede o no ser un objeto `WC_Coupon` real adjunto a la orden.** El cálculo de "monto elegible" del plugin no puede asumir ninguna de las dos formas — tiene que trabajar sobre los **totales ya resueltos de la orden** (`$order->get_items()` + fees), no sobre cupones.

## 5. Sistema de costo interno (COGS) existente

Sí existe, pero **no aplica directo a los regalos**: `hs_cost_profiles` (WP option, endpoint `/hypestyle/v1/cost-profiles`) son perfiles de costo de **fabricación por tela/construcción** (ej. "Jersey 20/1 TEE"), asignados a cada producto de indumentaria vía meta `_hs_cost_profile_id`. Sirve para remeras/hoodies/pantalones hechos a medida, no para accesorios comprados a un proveedor externo (una chain, un pack de medias, un Zippo tienen un costo de compra, no un costo de fabricación por perfil de tela).

**Decisión:** el campo "costo interno" de cada nivel de Purchase Gift es un número manual (como pide el brief como fallback). Si el producto de regalo ya tiene un `_hs_cost_profile_id` asignado, el panel ofrece un botón para *sugerir* ese costo como punto de partida, pero no fuerza a usarlo — sigue siendo editable.

## 6. Decisión de arquitectura resultante

Dado el punto 2, dos partes del brief tienen que adaptarse (documentado también en el resumen final del chat):

1. **No hay Cart/Checkout Blocks ni checkout clásico que extender.** No se va a escribir ninguna integración de Store API del lado del navegador, ningún `Fragments`, ningún filtro de bloques — no hay a qué engancharse porque el comprador nunca renderiza esas pantallas.
2. **La barra de progreso vive en Next.js, no en WordPress.** Se muestra en el drawer del carrito y en `/checkout` (React), consumiendo un endpoint REST propio del plugin (`GET /wp-json/hypestyle-gift/v1/progress`, ver README del plugin) al que se le mandan los ítems del carrito local; el plugin devuelve el progreso, el próximo nivel y el mensaje — usando **la misma función central de cálculo** que se usa para decidir el regalo real en el servidor.
3. **El regalo NUNCA se agrega al carrito de Next.js.** No existe un carrito de WooCommerce al que agregarlo durante la navegación (no hay sesión). El regalo se adjunta **una sola vez, en el servidor, en el momento exacto en que la orden se guarda por primera vez** — sin importar cuál de los tres endpoints la creó.
4. **Punto de enganche elegido: el hook nativo `woocommerce_new_order`**, no un hook propio agregado al mu-plugin. Este hook de WooCommerce dispara siempre que se guarda una orden nueva vía `WC_Order::save()` — y los **tres** caminos de creación de orden (la función manual del mu-plugin y los dos que pegan directo a `POST /wc/v3/orders`) terminan ahí, porque todos usan la API de objetos de WooCommerce (`wc_create_order()` o el controlador REST de órdenes), nunca SQL directo. Es la única integración que cubre los tres flujos sin tocar `hypestyle-api.php` ni el resto del código existente — cumple con "plugin independiente" y con la cláusula del brief que permite apartarse del enfoque genérico cuando la arquitectura real lo exige.
   - Se valida en el propio plugin, con logging, que el hook efectivamente dispara en los tres flujos (ver plan de pruebas).
   - Ventaja adicional: como el mu-plugin de `create-order` llama a `wc_reduce_stock_levels()` **después** de guardar la orden, si el regalo ya fue agregado y guardado dentro del hook `woocommerce_new_order` (que dispara *durante* ese mismo `save()`), su stock se descuenta gratis, sin código extra, igual que cualquier producto real de esa orden.
5. **La barra de progreso NO debe validar nada por sí sola.** Es 100% informativa; sirve para mostrarle al cliente cuánto le falta. La única fuente de verdad de si corresponde o no un regalo es el cálculo server-side en el momento de crear la orden.

## 7. Deploys y entornos

- **Sin staging.** Es un solo sitio WordPress en Hostinger (compartido); no hay evidencia de un clon de staging ni de un mecanismo para crearlo desde este entorno. El plugin se sube manualmente vía File Manager/FTP de Hostinger, igual que el resto del PHP (ver `PHP/README.md`).
- El frontend (`hypestyle-launchpad`) deploya solo en Vercel al mergear a `main` — no hay deploy manual, y esta tarea no lo toca hasta que el usuario decida mergear el PR.
- **No hay ningún framework de testing instalado** (ni PHPUnit en el lado WP, ni Jest/Vitest en el Next.js). Por eso el plan de pruebas de esta tarea es manual y documentado (`docs/purchase-gift-test-plan.md`), tal como el brief permite explícitamente cuando la estructura del proyecto no tiene tests automatizados.

## 8. Convención de nombres / prefijos elegida

Para evitar cualquier colisión con el resto del código (mu-plugin `hypestyle_*`, tema, otros plugins):

- Prefijo de funciones/constantes/clases PHP: `hpg_` / `HPG_` (Hypestyle Purchase Gift) — mismo patrón que `hype-wally-coupons` (clases `HWC_*`), no se introducen namespaces de PHP para no romper la convención ya establecida en el proyecto.
- Text domain: `hypestyle-purchase-gift`.
- REST namespace propio: `hypestyle-gift/v1` (separado de `hypestyle/v1`, que es del mu-plugin existente — no se toca ese archivo).
- Opciones de WordPress: `hpg_settings`, `hpg_levels`, `hpg_metrics` (prefijo propio, sin chocar con `hs_cost_profiles` / `hs_mayorista_min_order` del resto del proyecto).
