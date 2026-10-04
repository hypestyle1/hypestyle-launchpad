# Private Access — SS27 Part 01 · Diagnóstico y plan

Fecha: sábado 03/10/2026. Lanzamiento: domingo 04/10. Apertura pública: domingo 11/10.
Estado: **solo diagnóstico. No se tocó producción ni código.**

---

## 1. Cómo está armado hoy lo relevante

**Stack headless.** El sitio es Next.js 14 (App Router) en Vercel (`hypestyle-launchpad/next-app`). WordPress + WooCommerce en Hostinger es catálogo, stock y pedidos, consumido por API. No hay theme ni front de WordPress en uso.

**Cómo llegan los productos al sitio.** Un único canal: WPGraphQL público (`/graphql`) con `where: { status: "publish" }`.
- `lib/products-server.ts` y `app/api/products/route.ts` traen el catálogo completo (paginado por cursor, `revalidate: 60`). Esa lista alimenta la query React Query `['products']`, de la que cuelgan **home, colecciones, categorías, buscador del navbar, productos relacionados, básicos, back in stock**. No hay búsqueda server-side: el buscador filtra en el browser sobre esa misma lista.
- `lib/product-detail.ts` trae la ficha por slug (también público, sin auth). `app/producto/[slug]` es ISR (`revalidate 3600`) y el browser refetchea la ficha con `useProduct`.
- `app/sitemap.ts` usa `fetchProductSlugs()` con el mismo filtro `publish`.
- Las colecciones se definen por **tag de Woo** (`lib/category-config.ts`: `tag: 'summer-26'`, etc.) o por listas de slugs curadas (`lib/fw26.ts`, `lib/faith-drop.ts`).

**Endpoints públicos de WordPress que exponen productos (verificado en vivo hoy, solo lectura):**

| Endpoint | Estado | Respeta `post_status` |
|---|---|---|
| `/graphql` (WPGraphQL) | 200, público | sí: anónimo solo ve `publish` |
| `/wp-json/wc/store/v1/products` (Store API) | 200, público | sí |
| `/wp-json/wp/v2/product` | 200, público | sí |
| `/wp-sitemap.xml` | 200 | sí |
| `/wp-json/wc/v3/products` | 401 (requiere credenciales) | — |
| Feed RSS de productos | 302 | — |

Plugins en el WP (según el Local Site de abril): Facebook for WooCommerce, Google Listings & Ads, Klaviyo, Jetpack, LiteSpeed Cache. Los sync de catálogo (Meta, Google) solo toman productos publicados.

**Checkout.** El carrito vive en `localStorage` (`context/CartContext.tsx`, ítems por `id` = slug + talle + precio). `/api/create-order` reenvía al mu-plugin `hypestyle/v1/create-order`, que busca el producto con `get_page_by_path($slug, OBJECT, 'product')` (**no filtra por status**) y agrega la variante con `$order->add_product()` (**no exige `is_purchasable()`**). Es decir: un producto `private` en Woo se puede comprar por el flujo actual sin cambios. El chequeo de stock en vivo de la ficha (`lib/checkStock.ts`) va por GraphQL público: con un producto privado devuelve `null` y la función responde `'ok'` (ver riesgo 6).

**Auth y sesiones ya existentes (patrones reutilizables).**
- `lib/mayorista-auth.ts`: cookie firmada con HMAC SHA-256 vía Web Crypto (`id.exp.sig`), verificable en middleware Edge y en route handlers, fail-closed si falta el secreto. Es exactamente el patrón para la cookie de Private Access.
- `app/acceso` + `app/api/acceso` + bloque en `middleware.ts`: el early access de junio (contraseña única, cookie `hype_early_access`, 24 h). Está inerte porque las fechas pasaron. Sirve de referencia visual (card liquid glass, countdown) pero no de modelo: contraseña única y gate de todo el sitio no es lo que queremos ahora.
- `lib/admin-auth.ts` + `lib/admin-profiles.ts`: panel con clave compartida o sesión de perfil con secciones (`creadores`, `pedidos`…). `components/admin/nav.ts` registra las pantallas.

**Close Friends en el panel (ya existe, PHP v1.31.0).** `/admin/content/close-friends` con option `hs_close_friends` y rutas `close-friends` / `close-friends/entry`. Ojo con la semántica: es la lista de **clientes que dejaron su Instagram al comprar**, con un tilde "ya lo agregué a Mejores Amigos" (`added`). No es la lista de Mejores Amigos de la cuenta. Hoy tiene ~360 entradas (119 del sheet maestro + 243 agregadas el 08/09 por script de consola + sync de Woo). Los que tienen `added: true` sí están en Mejores Amigos con certeza.

**Lo que ya existe para la base de Instagram.** En `NUEVAS IMPLEMENTACIONES/MEJORES AMIGOS/` hay un script de consola (`close-friends-consola-2026-09-08.js`) que, desde el browser logueado como @hypestyle en `instagram.com/accounts/close_friends/`, usa las dos llamadas internas de esa pantalla (`users_reloader` para resolver usuario → id y `make_close_friend` para agregar). Corrió con éxito: 243 agregados, 14 ya estaban, 19 no encontrados, 6 fallidos. Es un método no oficial, con cookies de sesión y rate limit, que ya conocés.

**Infra de pruebas.** Hay WordPress local (Local Sites `hypestyle`, con WooCommerce, WPGraphQL y la copia de `hypestyle-api.php`), PHP 8.3 en la máquina, tests PHP puros en `PHP/_tests/`, Vitest y Playwright en el front, y previews de Vercel por PR. **No hay staging de WordPress**: el PHP se sube a mano a producción (File Manager). La forma segura ya usada en el proyecto (stock-alerts, reviews) es: mu-plugin **nuevo, independiente y apagado por defecto**, que no toca `hypestyle-api.php`.

**Patrón de campañas con fecha + override** ya resuelto en campañas mayoristas (`hs_wholesale_campaigns`: `status draft/active/ended` + fechas, vigencia real calculada en cada request, cron de Vercel solo cosmético). Vercel está en plan con crons por minuto (`*/2 * * * *` en `vercel.json`).

## 2. Archivos y piezas involucradas

Backend (carpeta `PHP/`, fuente de verdad):
- **Nuevo** `hypestyle-private-access.php` (mu-plugin independiente, misma estructura que `hypestyle-stock-alerts.php`).
- `hypestyle-api.php`: **sin cambios** salvo, opcionalmente, guardar el meta `_hs_private_access` en `create-order` (2 líneas, vía el hook `hype_order_line_item` o leyendo el payload). Puede evitarse en el MVP: Next ya puede agregar el meta por WC REST después de crear el pedido.
- `_tests/private-access.test.php` (funciones puras: normalización, import, config).

Frontend (`next-app/`):
- `lib/private-access/{types,store,session,normalize}.ts`
- `app/api/private-access/{status,unlock,logout,products,product,stock}/route.ts`
- `app/api/admin/private-access/{config,members,import,export,open}/route.ts`
- `components/private-access/{Banner,UnlockModal,GrantedTransition}.tsx`
- `app/private-access/page.tsx` + `app/private-access/[slug]/page.tsx` (+ `layout.tsx` noindex)
- `app/page.tsx` (insertar el banner debajo del hero), `app/producto/[slug]/ProductoClient.tsx` (modo privado), `components/admin/nav.ts`, `app/admin/private-access/page.tsx`
- `lib/ga.ts` + `lib/fbpixel.ts` (eventos nuevos), `app/api/create-order/route.ts` (adjuntar id de miembro)
- `vercel.json` (cron de apertura), `.env.example` (`PRIVATE_ACCESS_SESSION_SECRET`)

WooCommerce (sin código): productos SS27 en estado **Privado** + tag `ss27-part-01` + precio de oferta programado.

## 3. Arquitectura recomendada

### 3.1 Ocultar los productos: estado `private` de Woo + tag de colección

La propiedad que controla todo es **el estado del producto en WordPress** (`post_status = private`), no un meta propio. Razón: es la única propiedad que **todos** los canales respetan sin tocarlos (WPGraphQL, Store API, wp/v2, wp-sitemap, RSS, sync de Meta y Google, y por lo tanto todo el sitio Next, que solo ve lo que GraphQL le da). Un meta `hype_private_access=true` obligaría a filtrar en cada consumidor y a confiar en que ninguno se olvide; un producto `private` no existe para nadie que no esté autenticado en WP.

La identidad de la colección es un **tag de Woo** `ss27-part-01` (mismo patrón que `summer-26`, `race`, etc.). Nada de IDs hardcodeados: el mu-plugin lee "los productos con este tag", y la config guarda el slug del tag (cambiable desde el admin).

Apertura pública = pasar esos productos a `publish`. Una sola operación, idempotente, sobre "todos los productos con el tag que sigan en private".

### 3.2 Catálogo privado: endpoint server-to-server con secreto

Mu-plugin nuevo `hypestyle-private-access.php`, rutas bajo `hypestyle/v1/private-access/*`, todas con `hype_verify_secret()` (fail-closed, y ya marca no-cache para LiteSpeed):

| Ruta | Qué hace |
|---|---|
| `GET/POST config` | option `hs_private_access_config`: `enabled`, `collectionTag`, `startAt`, `publicOpenAt`, `override` (`auto`/`force_on`/`force_off`), `clearSaleOnOpen`, `openedAt`. |
| `POST validate` | `{ handle, name, ipHash }` → normaliza, busca en la tabla, registra evento y devuelve `{ ok, memberId }` o `{ ok:false }` (misma respuesta y tiempo para "no existe" y "bloqueado"). Rate limit por `ipHash` y por handle en transients. |
| `GET products` | productos con el tag, `status IN (private, publish)`, en **el mismo shape que la query GraphQL** del sitio, así se reutiliza `fromWPNode()` sin tocar la normalización. |
| `GET product?slug=` | ficha completa en el shape de `GET_PRODUCT` (descripción, atributos, metaData, galería, variaciones). |
| `GET stock?slug=&size=` | stock en vivo para la ficha privada (reemplaza a `checkStock` que va por GraphQL público). |
| `GET/POST/DELETE members`, `POST members/import`, `GET members/export` | CRUD + import batch + CSV. |
| `POST open` | publica los productos del tag, opcionalmente borra el precio de oferta, marca `openedAt`. Idempotente. |
| `GET stats` | miembros, accesos, pedidos y revenue con meta `_hs_private_access`. |

Tablas propias (patrón `hs_stock_alerts`, `dbDelta` en `init` con versión de schema):
- `{prefix}hs_pa_members`: `id, handle (UNIQUE, 30), name, source (csv|manual|close_friends|ig_export), status (active|blocked), created_at, last_access_at, access_count, note`.
- `{prefix}hs_pa_events`: `id, type (attempt|granted|denied|rate_limited|open), member_id NULL, handle_hash, ip_hash, ua, meta JSON, created_at`.

Alternativa evaluada y descartada para el MVP: autenticar WPGraphQL con Application Password para leer productos `private` con las queries existentes. Menos código, pero depende de que WPGraphQL honre app passwords en ese server y mete credenciales de usuario WP en Vercel. Queda como opción si el endpoint PHP se complica.

### 3.3 Sesión de acceso: cookie httpOnly firmada

- `POST /api/private-access/unlock` (Next) → valida con PHP → setea `hype_pa` = `memberId.exp.sig` (HMAC, `PRIVATE_ACCESS_SESSION_SECRET`, mismo código que `mayorista-auth`), `httpOnly`, `sameSite=lax`, `secure`, `path=/`, vence en `publicOpenAt`. Más una cookie legible `hype_pa_ok=1` sin datos, solo para que el banner muestre "Entrar" en vez de "Acceder" sin pedir nada al servidor.
- Nada en `localStorage`: no puede ser httpOnly y no viaja al servidor. La sesión dura toda la preventa (no solo la pestaña).
- Toda ruta que devuelve datos privados verifica el token server-side. El browser nunca recibe la whitelist ni el secreto de WP.
- Freno a handles compartidos: tope de N desbloqueos por handle (ej. 5 dispositivos) registrados en `hs_pa_events`; superado el tope, respuesta de denegado genérica y aviso en el admin.

### 3.4 Páginas

- **Home**: `PrivateAccessBanner` debajo de `<HeroLookbookFW26 />`, antes de `<SaleBanner />`. El estado "activo/inactivo" se resuelve **en el servidor** al renderizar el home (fetch de `config` con `next: { revalidate: 60 }`) y se pasa por prop: así el HTML estático ya trae el banner, sin CLS y sin volver dinámico el home (leer `cookies()` en `app/page.tsx` destruiría el trabajo de SSR/CLS; ver nota en `middleware.ts`). El estado "ya desbloqueado" se lee en el cliente de `hype_pa_ok` y solo cambia el texto del botón.
- **`/private-access`**: server component `force-dynamic`, `noindex`. Lee la cookie: sin token → renderiza el gate (mismo contenido que el modal, a pantalla completa, con la foto de campaña de fondo); con token → grilla de SS27 con `ProductCard` y `href` apuntando a `/private-access/[slug]`. Si `active` es false → "La preventa terminó / todavía no empezó" con link al home.
- **`/private-access/[slug]`**: misma verificación; ficha con `ProductoClient` en modo privado (`initialProduct` del endpoint privado, refetch y stock por rutas privadas, relacionados = resto de SS27). Desde el 11/10 esta ruta redirige 308 a `/producto/[slug]` para que los links compartidos sigan vivos.
- `middleware.ts`: **sin cambios** (el gate vive en las páginas; no hace falta correr nada en el edge).

### 3.5 Apertura: programación + override manual (opción C)

- Vigencia real = `override === 'force_on'` o (`override === 'auto'` y `enabled` y `startAt <= now < publicOpenAt`). `force_off` apaga banner y página aunque estemos en fecha. Esta función corre en cada request, igual que `isCampaignLive` de mayoristas: no depende de ningún cron para decidir.
- Cron de Vercel `*/10 * * * *` → `/api/admin/private-access/tick` → si `now >= publicOpenAt` y hay productos del tag en `private`, llama `open`, hace `revalidatePath` de `/`, `/productos`, `/new-in`, `/sitemap.xml` y de cada `/producto/[slug]`. Idempotente, así que correrlo de más no hace nada.
- Botón "Abrir al público ahora" en el admin que llama lo mismo. Y botón "Pausar" (= `force_off`).

### 3.6 El 20% off

Precio de oferta nativo de Woo con **fecha de fin programada** (`date_on_sale_to = 2026-10-10 23:59:59` hora Argentina). Lo muestra todo el sitio tal cual (precio tachado + badge) sin lógica nueva, Woo lo apaga solo y `open` además borra el precio de oferta por si el cron diario de Woo se atrasa. Se carga por producto en wp-admin (si son ~10-20 productos) o con un script WC REST tipo `update_prices.js` usando credenciales de entorno. Descartado: cupón automático (toca carrito, checkout y validación, y no deja ver el precio rebajado en las cards).

## 4. MVP para mañana (P0) vs V2

**P0 (mañana)**
1. Mu-plugin: tablas, config, `validate` con rate limit, `members` + import CSV + export, `products`, `product`, `stock`, `open`, `stats` básico.
2. Woo: productos SS27 privados + tag + oferta programada (lo carga el equipo; yo valido).
3. Next: banner, modal con nombre + Instagram, transición ACCESS GRANTED, sesión por cookie, `/private-access` y `/private-access/[slug]`, compra completa, eventos GA4/Meta con id anónimo, meta de pedido.
4. Admin mínimo: estado, switch auto/forzar/pausar, fecha de apertura, tag, lista de miembros con buscar/agregar/eliminar, import CSV, export CSV, contadores (miembros, accesos, pedidos).
5. Cron de apertura + botón manual.
6. QA mobile en preview de Vercel con teléfonos reales.

**V2 (semana que viene)**
- Dashboard: accesos por día, embudo attempt → granted → add_to_cart → purchase, revenue, top handles.
- Sync Instagram: import del export oficial (`close_friends.json`) con diff contra la tabla; botón "traer tildados de Close Friends del panel".
- Alta de miembros desde el bot de WhatsApp/Instagram (ya existe la bandeja en `/admin/conversaciones`).
- Gestión completa: bloqueo, notas, historial de accesos por miembro, límite de dispositivos configurable.
- Reutilizar el módulo para futuros drops (la config ya es por colección).
- Limpieza del early access de junio en `middleware.ts` y `app/acceso` (código muerto).

## 5. Riesgos

1. **Tiempo.** Es un día de trabajo real (PHP + Next + admin + QA). Es factible si arrancamos hoy y el equipo carga los productos en Woo en paralelo. Lo que recorto si no llega: `stats`, export CSV y la ficha privada propia (fallback: comprar desde la grilla con selector de talle en la card).
2. **Sin staging de WP.** El mu-plugin se prueba en el WordPress local (Local Sites) y se sube a producción **apagado** (`enabled=false`, sin productos con el tag): no cambia nada hasta que se activa. Es el mismo procedimiento que stock-alerts.
3. **Filtración de handles.** Un Mejor Amigo le pasa su usuario a 10 amigos. Mitigación: tope de desbloqueos por handle, registro de eventos, y el mensaje de denegado no confirma si el usuario existe. Aceptar que algo de esto va a pasar: es una preventa, no un sistema bancario.
4. **Base incompleta (300 de 900).** Si la lista no está completa el domingo, el 60% de los Mejores Amigos va a ver "reservado". Plan en §9. Red de seguridad: alta manual desde el admin en segundos + mensaje "escribinos por DM".
5. **Precio confiado al cliente** (pre-existente): `create-order` cobra el precio que manda el browser. No lo empeoramos, pero con un drop nuevo y descuento conviene anotarlo. Se resuelve en otro PR validando precio server-side.
6. **Stock en vivo.** `checkStock` por GraphQL público no ve productos privados y responde `ok`. La ficha privada tiene que usar `/api/private-access/stock`. Sin esto, un talle agotado se puede agregar al carrito y Woo lo acepta igual (`add_product` no bloquea sin stock; el stock queda negativo).
7. **Cache de LiteSpeed en Hostinger** cachea GET de REST por URL. Las rutas nuevas usan `hype_verify_secret()`, que ya marca `no-cache`, y Next llama con cache-buster como hace `close-friends/store.ts`.
8. **Navegador interno de Instagram.** Las cookies first-party funcionan, pero son propias de ese navegador: quien desbloquea desde la story y después abre Safari tiene que desbloquear de nuevo (es un segundo tap, no un problema). Probar `backdrop-filter`, teclado sobre el modal y `100dvh` ahí.
9. **Cron y timezone.** `publicOpenAt` se guarda en ISO con offset (`2026-10-11T00:00:00-03:00`). El tick corre cada 10 min: la apertura ocurre entre las 00:00 y las 00:10. Si querés exactitud, el botón manual.
10. **Vercel preview contra WP de producción.** Para probar el front en preview el mu-plugin ya tiene que estar subido (apagado). Alternativa: `npm run dev` apuntando al WP local.

## 6. Cache

- Home: estático/ISR como hoy. El banner recibe `active` por prop desde un fetch cacheado 60 s en el servidor; nada por usuario en el HTML.
- `/api/private-access/status`: `Cache-Control: public, s-maxage=60` (solo datos públicos: activo, fechas, nombre de colección).
- `unlock`, `products`, `product`, `stock` y las páginas `/private-access*`: `force-dynamic` + `Cache-Control: private, no-store`. Vercel no cachea respuestas con `Set-Cookie` ni `no-store`.
- Apertura: `revalidatePath` en el tick, además de la revalidación natural a los 60 s de `/api/products` y a la hora de las fichas.
- `/api/products` **no** se toca: sigue sin ver los productos hasta que sean `publish`.
- WP: rutas autenticadas → `DONOTCACHEPAGE` + `X-LiteSpeed-Cache-Control: no-cache` (ya lo hace el helper).

## 7. Cómo protejo los productos

- `post_status = private` cierra GraphQL, Store API, wp/v2, sitemap de WP, RSS, Meta y Google (verificado hoy que todos esos endpoints están abiertos y filtran por status).
- Del lado Next, por consecuencia: no entran a `['products']`, así que no aparecen en home, categorías, buscador, relacionados, básicos, back in stock ni `sitemap.xml`; `/producto/[slug]` da 404 real (`notFound()`).
- El catálogo privado sale solo de rutas Next con cookie válida, que hablan con PHP con el secreto. `robots: noindex` en `/private-access*` (mejor noindex que Disallow, como en `/acceso`).
- Nada de precios, nombres ni fotos de SS27 en el bundle del cliente ni en el HTML del home (el banner no muestra productos).
- Las imágenes viven en `wp-content/uploads` de Hostinger: **son públicas por URL** si alguien adivina la ruta. Es inherente a WordPress; el riesgo real es bajo (URLs con nombre de archivo) y el drop se abre en una semana.

## 8. Whitelist

Tabla propia (no option) por tres motivos: búsqueda indexada por `handle`, contador y última fecha de acceso por fila, y una tabla de eventos al lado para analytics y rate limit. Shape:

```
id · handle (único, normalizado) · name · source (csv | manual | close_friends | ig_export)
status (active | blocked) · created_at · last_access_at · access_count · note
```

Normalización (misma función en PHP y en TS, con test en los dos lados): trim → quitar `@` iniciales → minúsculas → quitar puntos finales → validar `^[a-z0-9._]{1,30}$`. `@ValentinPozzi ` ≡ `valentinpozzi`. Ya existe `normalizeHandle()` en `lib/close-friends/types.ts` y `hs_close_friends_handle()` en PHP; se reutilizan.

Import: `username,name` (nombre opcional, con o sin encabezado, tolera `@` y mayúsculas), dedupe por handle, `source=csv`, y devuelve `parsed / nuevos / ya existían / inválidos` con los inválidos listados.

## 9. Cómo completar los ~900

En orden de preferencia, y conviene arrancar el paso 1 **hoy mismo** porque tarda:

1. **Export oficial de Meta (seguro, cero riesgo).** Accounts Center → Tu información y permisos → Descargar tu información → Instagram → "Alguna de tu información" → *Seguidores y seguidos* → formato **JSON**, rango *Todo el tiempo*. El paquete incluye `connections/followers_and_following/close_friends.json` con los usuarios de Mejores Amigos. Suele llegar en minutos u horas (puede tardar hasta 48 h). El admin lo importa directo (V2: botón "importar JSON de Instagram"; para mañana lo convierto a CSV con un script de 10 líneas).
2. **CSV manual.** Si tenés la lista en otro lado (sheet, notas), entra por el import de P0.
3. **Los que ya están confirmados en el panel.** Los ~360 con `added=true` de Close Friends se importan con un click (`source=close_friends`). Son con certeza Mejores Amigos (los agregó el script del 08/09 o estaban en el sheet).
4. **Lectura por consola (último recurso, no oficial).** El mismo enfoque del script del 08/09 pero **solo lectura**: desde `instagram.com/accounts/close_friends/` con la sesión de @hypestyle, paginar la lista actual y copiar los usernames. Requiere sesión y cookies privadas, usa endpoints internos que Meta cambia sin aviso y puede devolver 429 o pedir checkpoint. Leer es menos agresivo que escribir, pero el riesgo de molestar a la cuenta existe. Lo haría solo si el export oficial no llegó para el sábado a la noche, en una sola corrida y despacio.
5. **Red de seguridad operativa.** Mensaje de denegado con "escribinos por DM", el equipo agrega desde el admin (alta manual P0) en segundos.

No propongo scraping con Selenium/Playwright ni APIs no oficiales con login: todo eso es lo que te dije que te explicaría antes de implementar, y acá no hace falta.

## 10. UX: qué cambiaría de la propuesta

- **El link de la story de Mejores Amigos va directo a `/private-access`**, no al home. La story es la distribución natural y ya está restringida a la lista; el home es el camino para quien llega por su cuenta.
- **Instagram primero, nombre después.** El campo de Instagram con el `@` fijo adentro del input (no se puede borrar ni duplicar), `autocapitalize="none"`, `autocorrect="off"`, `spellcheck=false`, `inputmode="text"`. El nombre pide "¿Cómo te llamás?" y es opcional: no bloquea el acceso, pero lo guardamos.
- **Un solo paso.** Nada de "paso 1 / paso 2": campo, botón, listo. En mobile el modal es un bottom sheet con el teclado que no tapa el botón (`100dvh` + el botón pegado al input).
- **Copy del banner** (propuesta):
  ```
  SS27 · PRIVATE ACCESS
  Spring Summer 27 — Part 01
  Preventa exclusiva para Mejores Amigos. 20% OFF hasta el 10.10.
  [ ACCEDER ]      ya desbloqueado → [ ENTRAR ]
  ```
  Le pondría el 20% y la fecha en el banner: el incentivo es ese, y "disponible antes que nadie" solo no explica por qué hoy.
- **Denegado:** "Este acceso es para nuestra lista de Mejores Amigos. Si entraste hace poco, probá en un rato — o escribinos por DM y te sumamos." Misma respuesta y mismo tiempo para cualquier usuario que no esté: no se puede saber si existe.
- **Concedido:** overlay 1.2 s, fondo negro, `ACCESS GRANTED` en tipografía grande y abajo `Spring Summer 27 · Private Preview`, con un fade al grid. Sin confetti ni sonido. `prefers-reduced-motion` → sin animación.
- **Banner que no es popup:** altura fija (~180 px mobile / ~140 px desktop), full-bleed, foto de campaña desenfocada de fondo, card glass arriba. Reserva su alto desde el SSR para que no haya salto.
- **Después del 11/10:** el banner desaparece y `/private-access*` redirige a `/colecciones/ss27` (o la landing que armes), así los links de la semana no mueren.

## 11. Analytics

Eventos (nombres literales, en GA4 y Meta como custom events con `lib/ga.ts` y `lib/fbpixel.ts`):
`private_access_banner_view`, `private_access_open`, `private_access_attempt`, `private_access_granted`, `private_access_denied`, `private_product_view`, `private_add_to_cart`, `private_purchase`.

Parámetros: `collection: 'ss27-part-01'`, `pa_id` = hash SHA-256 con sal del handle, calculado en el servidor y devuelto al desbloquear. **El handle nunca va a GA4 ni a Meta.** Internamente, `hs_pa_events` guarda `member_id` y el pedido guarda `_hs_private_access = {memberId, handle}` como meta de Woo, que es lo que une pedido ↔ persona para el admin.

## 12. Roadmap concreto

Hoy sábado:
1. **(Vos, ahora)** Pedir el export de Instagram (§9.1). Crear en Woo los productos SS27 en estado Privado, con tag `ss27-part-01` y oferta programada hasta 10/10 23:59. Pasarme el CSV que tengas.
2. Rama `feature/private-access` en launchpad y en `hypestyle-backend`.
3. PHP: mu-plugin + test puro. Probar en el WP local (crear 2 productos privados de prueba).
4. Next: lib + rutas API + páginas + banner/modal + admin mínimo + eventos. Unit tests de normalización, import y sesión.
5. `npm run dev` contra el WP local: flujo completo, incluida una compra con Mercado Pago sandbox o transferencia.
6. Subir el mu-plugin a producción **apagado**. PR → preview de Vercel → QA en iPhone Safari, Chrome Android y navegador interno de IG (story de prueba a la lista con el link del preview).
7. Merge a `main` con la config todavía `enabled=false`. Verificar en producción que nada cambió.

Domingo:
8. Importar la base (CSV o export). Comprobar 5 usuarios reales. Activar desde el admin. Publicar la story con el link a `/private-access`.
9. Durante el día: mirar `denied` y altas manuales desde el admin.

Sábado 10/10: revisar que la oferta programada vence; domingo 11/10 00:00–00:10 el tick abre; confirmar en el home.

## 13. Checklist de QA antes de producción

Visibilidad (con un producto SS27 privado de prueba):
- [ ] No aparece en `/graphql`, Store API, `wp/v2/product`, `wp-sitemap.xml`.
- [ ] No aparece en home, `/productos`, `/new-in`, categorías, buscador, relacionados, `sitemap.xml`.
- [ ] `/producto/<slug>` devuelve 404.
- [ ] No está en el catálogo de Meta ni en Google Merchant.
- [ ] `/private-access` sin cookie muestra el gate; con URL conocida no se ven productos. Con `force_off` no se ve nada aunque la cookie sea válida.

Acceso:
- [ ] `@ValentinPozzi ` → ok; `valentinpozzi` → ok; usuario inexistente → denegado con el mismo mensaje y tiempo similar.
- [ ] Cookie httpOnly, Secure, SameSite=Lax, vence el 11/10. Sobrevive a cerrar el navegador.
- [ ] Rate limit: 10 intentos seguidos desde una IP → 429 silencioso (mismo cartel).
- [ ] Token manipulado o vencido → gate.
- [ ] Tope de dispositivos por handle.

Compra:
- [ ] Ficha privada: talles, stock en vivo, agregar al carrito, drawer, checkout, pago (MP sandbox + transferencia), confirmación, mail. Stock descontado en Woo.
- [ ] Pedido con meta `_hs_private_access`. Evento `private_purchase` y Purchase de Meta/GA4 normales.
- [ ] Forzar `/api/create-order` con un slug privado sin cookie: **decisión: no lo bloqueo.** Quien ya tiene el slug es porque entró; cerrar esto obliga a validar sesión en el checkout y no vale la pena para una semana. Queda anotado.

Apertura:
- [ ] `open` publica solo los del tag, borra la oferta si está marcado, es idempotente.
- [ ] Tras abrir: home sin banner, productos en `/api/products` dentro de 60 s, fichas públicas, `/private-access/<slug>` redirige.
- [ ] `force_on` / `force_off` responden al instante.

Mobile:
- [ ] iPhone Safari, Chrome Android, navegador interno de Instagram: banner, modal, teclado, scroll, safe areas, `backdrop-filter`, transición, tiempos de carga.
- [ ] CLS del home sin cambios (Lighthouse mobile antes/después).

Seguridad:
- [ ] Bundle del cliente sin whitelist, sin secreto de WP, sin nombres de productos SS27.
- [ ] Todas las rutas PHP nuevas con `hype_verify_secret`; las de Next admin con `authorizeAdmin`.
- [ ] Inputs saneados en PHP (`sanitize_text_field`, regex de handle, `$wpdb->prepare`).
- [ ] Logs sin datos personales en texto plano fuera de `hs_pa_events`.
