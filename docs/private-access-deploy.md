# Private Access SS27 · Puesta en producción

Orden pensado para que en ningún paso se rompa nada: el plugin entra apagado,
el front entra sin efecto visible, y recién al final se prende.

## 1. WordPress (Hostinger)

1. Subir `PHP/hypestyle-private-access.php` a `wp-content/mu-plugins/`.
   Archivo nuevo e independiente: no reemplaza ni toca `hypestyle-api.php`.
   Entra **apagado** (`enabled: false`): no cambia nada hasta activarlo.
2. Verificar que respondió (crea sus dos tablas en la primera carga):
   ```bash
   curl -s -H "X-Hypestyle-Secret: $WP_SECRET" "https://lightpink-rook-704850.hostingersite.com/wp-json/hypestyle/v1/private-access/config?_cb=1"
   ```
   Tiene que devolver JSON con `"enabled":false`. Sin el secreto, 403.

## 2. Productos en Woo

Por cada producto de SS27:

- Estado **Privado** (no "Borrador": el checkout necesita encontrarlo).
- Etiqueta (tag) **`ss27-part-01`**.
- Precio regular + **precio de oferta** (−20%) programado hasta el 10/10 23:59.
- Stock por talle cargado.

Con eso no aparece en ningún lado público (sitio, búsqueda, GraphQL, Store
API, sitemap, catálogo de Meta y Google) y sí en `/private-access`.

## 3. Vercel (variables de entorno, Production)

| Variable | Valor |
|---|---|
| `PRIVATE_ACCESS_SESSION_SECRET` | Nueva, 64 caracteres al azar (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Sin esto nadie puede entrar (fail-closed). |
| `PRIVATE_ACCESS_MOCK` | **No definirla.** Es solo para local. |
| `CRON_SECRET` | Ya existe; la usa el cron de apertura. |

Merge del PR → deploy. Con el plugin apagado, el home no muestra el bloque.

## 4. Lista de Mejores Amigos

En `/admin/private-access`:

1. **Traer de Close Friends**: suma los tildados del panel Close Friends.
2. **Importar CSV / JSON**: `username,name` o el `close_friends.json` del
   export oficial de Instagram. Muestra preview antes de guardar.
3. Alta manual para los que escriban por DM.

## 5. Activar

1. Tildar **Preventa habilitada** y Guardar (fechas ya vienen cargadas).
2. Probar con 2 o 3 usuarios reales en el celular, incluido el navegador de
   Instagram: entrar, ver colección, agregar, pagar.
3. Publicar la story con el link a `https://hypestyle.com.ar/private-access`.

**Pausar** corta todo al instante (banner, colección y accesos nuevos).

## 6. Apertura pública (11/10)

Automática: el cron (cada 10 min) publica los productos del tag y saca el
precio de oferta. También está el botón **Abrir al público ahora** con
preview de qué se publica. Los links `/private-access/<producto>` pasan a
redirigir a `/producto/<producto>`.

## QA antes de activar

- [ ] Sin cookie, `/private-access` muestra el formulario y el HTML no trae productos.
- [ ] Usuario que no está → mensaje de Mejores Amigos (mismo mensaje que bloqueado).
- [ ] `@Usuario`, `usuario`, ` usuario ` y el link del perfil entran igual.
- [ ] Talle agotado no se puede agregar; el chequeo en vivo lo frena si se agota mientras mirás.
- [ ] Pedido pago con meta `_hs_private_access` en Woo y suma en las métricas del panel (lo agrega create-order-gocuotas solo con sesión válida y si el pedido trae un producto de la preventa).
- [ ] Sin sesión, un pedido armado a mano con un slug privado se rechaza ("no está disponible").
- [ ] Ningún producto SS27 en `/api/products`, buscador, `/sitemap.xml` ni `/producto/<slug>` (404).
- [ ] Pausar → banner y colección desaparecen al instante; reanudar → vuelven.

## Limitaciones conocidas

- **Checkout internacional**: la cotización de envío usa el catálogo público;
  con productos privados no encuentra peso ni categoría. La preventa es para
  Argentina.
- **Precio del pedido**: lo calcula el servidor (#512). Los productos de la
  preventa se tasan con el precio que devuelve el mu-plugin, solo si el
  pedido trae una sesión válida de Mejores Amigos.
- **Imágenes**: las fotos de Woo viven en `wp-content/uploads` y son públicas
  por URL (inherente a WordPress); no se listan en ningún lado.
