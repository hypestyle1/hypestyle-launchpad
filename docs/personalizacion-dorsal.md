# Personalización de dorsal — cómo viaja la info al pedido

Documenta cómo el nombre + número que el cliente elige en el personalizador de la
camiseta llega a la orden de WooCommerce y dónde se ve. Verificado el 04/06/2026.

---

## Resumen

✅ La personalización (nombre + número) **llega bien** a WooCommerce y al panel de admin.

El producto personalizable es **LA NUESTRA — JERSEY MUNDIAL 26'** (product_id `1571`,
slug `la-nuestra-jersey-mundial-26`). Es el único slug en
`next-app/lib/customizable.ts` → `CUSTOMIZABLE_SLUGS`.

---

## Flujo de datos (de punta a punta)

1. **Personalizador** (`app/personalizar/[slug]/PersonalizarClient.tsx`)
   El cliente escribe nombre y número → se guarda en el carrito como
   `customization: { playerName, number }` (ver `context/CartContext.tsx`).
   Dos ítems del mismo talle con distinto dorsal son **líneas separadas** (no se fusionan).

2. **Checkout** (`app/checkout/page.tsx` → `lib/wc-client.ts`)
   `createOrderAndPreference()` manda el `customization` de cada ítem.
   **Todos los pedidos domésticos** usan `/api/create-order-gocuotas`
   (los internacionales `/api/create-order-intl`). El endpoint PHP
   `hypestyle/v1/create-order` **no** se usa.

3. **Creación de la orden** (`app/api/create-order-gocuotas/route.ts`, líneas ~49-55)
   El `customization` se mapea a **meta del line item** con claves **visibles**
   (sin guion bajo, así aparecen en el admin de Woo):

   ```js
   if (c.number)     m.push({ key: 'Número dorsal', value: String(c.number) });
   if (c.playerName) m.push({ key: 'Nombre dorsal', value: String(c.playerName) });
   li.meta_data = m;
   ```

4. **WooCommerce** guarda esa meta bajo el producto del pedido.

---

## Dónde se ve

| Lugar | Qué muestra |
|---|---|
| **Admin de WooCommerce** (editar pedido) | `Número dorsal` / `Nombre dorsal` debajo del producto |
| **Mail de confirmación** (`api/send-confirmation`) | "Dorsal: #7 MARTINA" |
| **Panel `/admin/pedidos`** | badge "Dorsal: #7 MARTINA" en el detalle + `[#7 MARTINA]` en el listado |

---

## Verificación (04/06/2026)

- Revisado el código del flujo completo (checkout → create-order-gocuotas → meta).
- Prueba real punta a punta: pedido de test del jersey con dorsal **MARTINA / 7**.
  WooCommerce lo guardó y devolvió correcto:

  ```
  LA NUESTRA - JERSEY MUNDIAL 26'
     [Número dorsal] = 7
     [Nombre dorsal] = MARTINA
     [Talle]         = M
  ```

- A la fecha **no hay pedidos reales con dorsal** (la remera recién estuvo visible
  y se ocultó del catálogo antes de venderse), por eso el listado aún no muestra ninguno.

---

## Bug encontrado y arreglado — panel `/admin/pedidos` (PR #69)

**Síntoma:** en WooCommerce el dorsal llegaba bien, pero el panel `/admin/pedidos`
mostraba solo el **Talle** y omitía la personalización.

**Causa:** las APIs del panel (`api/admin/orders` y `api/admin/orders/[id]`) solo
extraían la meta de talle (`talle`, `pa_talle`, `size`, `pa_size`) e ignoraban
`Nombre dorsal` / `Número dorsal`.

**Fix:** ambas rutas ahora extraen `dorsalName` / `dorsalNumber`, y el frontend los
muestra:
- Detalle del pedido (`app/admin/pedidos/[id]/page.tsx`): badge ámbar "Dorsal: #7 MARTINA".
- Listado (`app/admin/pedidos/page.tsx`): resumen `LA NUESTRA M [#7 MARTINA] ×1`.

> Nota de robustez: el matcher acepta variantes `número dorsal` / `numero dorsal`
> (con y sin tilde) y `nombre dorsal`, por si en el futuro cambia el casing/acento
> de las claves.

---

## Estado del producto (ocultar/mostrar)

LA NUESTRA está **oculta del catálogo** (`catalog_visibility: hidden`):
no aparece en shop/categorías/buscador, pero la **URL directa y el personalizador
siguen vivos**. Con el link directo todavía se podría comprar.
Para blindarla del todo (que nadie la vea ni compre) → pasarla a **borrador** (`status: draft`).

Cambiar visibilidad vía WC REST:

```
PUT /wp-json/wc/v3/products/1571  { "catalog_visibility": "visible" | "hidden" }
PUT /wp-json/wc/v3/products/1571  { "status": "publish" | "draft" }
```
