# Handoff — Feature: Productos dinámicos desde WordPress

## Estado actual

- **Repositorio:** `C:\Users\pc\Documents\Hypestyle\hypestyle-launchpad`
- **Rama activa:** `feature/wordpress-products`
- **Rama ya subida a GitHub:** sí (`git push` realizado)
- **Commit:** `0c52beb feat: replace hardcoded products with WordPress/WooCommerce as source of truth`

---

## Tarea pendiente para la próxima sesión

**Crear el Pull Request en GitHub usando `gh` CLI** (ya instalado, solo falta autenticarse).

### Paso 1 — Autenticar gh (si no está hecho)

```
gh auth login
```

Opciones a elegir:
1. GitHub.com
2. HTTPS
3. Login with a web browser → pegar el código en el navegador

### Paso 2 — Ir al directorio del repo

```
cd C:\Users\pc\Documents\Hypestyle\hypestyle-launchpad
```

### Paso 3 — Crear el PR

```
gh pr create --title "feat: productos dinámicos desde WordPress/WooCommerce" --base main --head feature/wordpress-products --body "$(cat <<'EOF'
## Resumen

- Elimina el array PRODUCTS hardcodeado como fuente de datos en todos los componentes
- WordPress/WooCommerce pasa a ser la única fuente de verdad para el catálogo
- Las páginas de producto usan ISR (revalidación cada 1 hora) para SEO óptimo

## Cambios principales

- **lib/wp-products.ts** (nuevo) — fetchProductSlugs() server-side para generateStaticParams
- **app/producto/[slug]/page.tsx** — generateStaticParams consulta WC + revalidate: 3600
- **app/personalizar/[slug]/page.tsx** — ídem
- **hooks/useProducts.ts** y **useProduct.ts** — eliminado el fallback al array estático
- **components/ y app/colecciones/** — todos usan el hook useProducts para obtener datos de WC

## ⚠️ Prerequisito antes de mergear

Verificar en Vercel que la variable de entorno esté seteada correctamente:

NEXT_PUBLIC_GRAPHQL_URL=https://lightpink-rook-704850.hostingersite.com/graphql

Sin esto los fetches van a fallar en producción.

## Test plan

- [ ] Verificar que los productos se cargan en /productos/
- [ ] Verificar que el detalle de producto /producto/[slug]/ funciona
- [ ] Verificar búsqueda en la Navbar
- [ ] Verificar Wishlist Drawer muestra productos correctamente
- [ ] Verificar Special Prices muestra productos con descuento
- [ ] Verificar colecciones /colecciones/fw26/ y /colecciones/pink-set-drop/

🤖 Generated with Claude Code
EOF
)"
```

---

## Resumen completo de cambios realizados

### Archivo nuevo
| Archivo | Descripción |
|---|---|
| `next-app/lib/wp-products.ts` | Función `fetchProductSlugs()` server-side. Consulta WooCommerce GraphQL para obtener los slugs de todos los productos publicados. Usada en `generateStaticParams` para ISR. |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `next-app/app/producto/[slug]/page.tsx` | `generateStaticParams` ahora consulta WC vía `fetchProductSlugs()`. Agregado `revalidate = 3600` (ISR cada 1 hora). |
| `next-app/app/personalizar/[slug]/page.tsx` | Igual que producto. Genera rutas para todos los productos (no solo los `customizable`, que es un campo local que no existe en WC). |
| `next-app/app/producto/[slug]/ProductoClient.tsx` | Sección "Completa el Look" reemplaza `getRelated()` por `useProducts(20)` + filtro aleatorio excluyendo el producto actual. |
| `next-app/app/personalizar/[slug]/PersonalizarClient.tsx` | Reemplaza `getProduct(slug)` sincrónico por `useProduct(slug)` hook. Agrega loading spinner. |
| `next-app/app/back-in-stock/page.tsx` | Reemplaza array estático filtrado de `PRODUCTS` por `useProducts(100)` + `useMemo` filtrando por `BACK_SLUGS`. |
| `next-app/app/colecciones/fw26/page.tsx` | Igual que back-in-stock con sus propios slugs curados. |
| `next-app/app/colecciones/pink-set-drop/page.tsx` | Igual que fw26 con sus propios slugs. |
| `next-app/components/BackInStock.tsx` | Componente home page: mismo patrón `useProducts` + filtro por slugs. |
| `next-app/components/SpecialPrices.tsx` | Usa `useProducts(100)` + `useMemo` para filtrar productos con `originalPrice > price` y ordenar por mayor descuento. |
| `next-app/components/WishlistDrawer.tsx` | Usa `useProducts(200)` para buscar los productos guardados en favoritos por slug. |
| `next-app/components/Navbar.tsx` | Búsqueda del navbar usa `useProducts(100)` en lugar del array estático. Imagen cambiada de `p.images[0]` a `p.image`. |
| `next-app/hooks/useProducts.ts` | Eliminado `staticFallback()` y la importación de `PRODUCTS`. En caso de error devuelve `[]`. |
| `next-app/hooks/useProduct.ts` | Eliminado `staticProduct` fallback y la importación de `PRODUCTS`. En caso de error devuelve `undefined`. |

### Archivos de datos (sin tocar, pueden eliminarse manualmente)
- `next-app/data/products.ts` — Ya no se importa desde ningún componente. Contiene el tipo `Product` (aún necesario como tipo en `useProduct.ts`) y el array `PRODUCTS` obsoleto.
- `next-app/data/products-tn.ts` — Auto-generado de Tiendanube, obsoleto.

---

## Arquitectura resultante

```
WordPress/WooCommerce (GraphQL)
        │
        ├── generateStaticParams (build time, ISR cada 1h)
        │       └── fetchProductSlugs()  ← wp-products.ts
        │
        └── Runtime (cliente)
                ├── useProducts()  →  listas, categorías, búsqueda
                └── useProduct()   →  detalle de producto individual
```

---

## Variables de entorno necesarias en Vercel

| Variable | Valor de producción |
|---|---|
| `NEXT_PUBLIC_GRAPHQL_URL` | `https://lightpink-rook-704850.hostingersite.com/graphql` |
| `NEXT_PUBLIC_WP_URL` | `https://lightpink-rook-704850.hostingersite.com` |
| `WC_CONSUMER_KEY` | (ya configurado) |
| `WC_CONSUMER_SECRET` | (ya configurado) |
