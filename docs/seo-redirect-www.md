# Redirect www.hypestyle.com.ar → hypestyle.com.ar

**Estado:** preparado, **NO aplicado**. Se aplica en Vercel con el OK del dueño, después de completar el checklist de abajo.

## Por qué

`https://www.hypestyle.com.ar/` y todas sus rutas responden **200** con el mismo contenido que el dominio sin www (medido el 11/10/2026). El canonical apunta al dominio sin www y lo mitiga, pero hay dos hosts indexables: las señales se dividen si alguien enlaza a www y GSC las cuenta como "Página alternativa con etiqueta canónica". `http://` ya redirige con 308.

## Cómo se aplica (un solo cambio, en Vercel)

1. Vercel → proyecto **next-app** → Settings → Domains.
2. En `www.hypestyle.com.ar` → Edit → **Redirect to** `hypestyle.com.ar` → **308 Permanent Redirect**.
3. Guardar. No requiere deploy ni cambios de código.

Se hace a nivel dominio y no en `next.config.mjs` porque así responde el edge antes de llegar a Next: no hay invocación de función y se revierte en un clic, volviendo el dominio a "Connect to an environment: Production".

## Checklist antes de aplicar

Un 308 sobre un **POST** de webhook rompe la notificación si el emisor no sigue redirecciones, y PayPal no las sigue. Por eso hay que confirmar que ninguna integración tenga cargada la URL con www.

| Integración | Qué URL usa | Estado |
|---|---|---|
| GOcuotas: webhook y retorno | `https://hypestyle.com.ar/...`, fijo en `app/api/gocuotas-order/route.ts` | ✅ sin www |
| Mercado Pago: webhook | `NEXT_PUBLIC_WP_URL/wp-json/hypestyle/v1/mp-webhook` (va a WP) | ✅ no pasa por este dominio |
| Mercado Pago: `back_urls` | `NEXT_PUBLIC_FRONTEND_URL` | ⬜ **verificar el valor en Vercel → Environment Variables (Production)**. Si es www sigue funcionando, porque el retorno es GET y el 308 conserva la query, pero conviene pasarla al dominio sin www. |
| PayPal: `return_url` / `cancel_url` | `NEXT_PUBLIC_FRONTEND_URL` | ⬜ igual que la fila anterior |
| PayPal: webhook (`/api/paypal-webhook`) | Configurado en el panel de PayPal Developer → Webhooks | ⬜ **verificar que no sea www** |
| Andreani, Brevo, n8n y otros webhooks entrantes a `/api/*` | Configurados en cada panel o workflow | ⬜ buscar `www.hypestyle` en n8n y en los paneles |
| Meta Pixel / CAPI / GA4 / Clarity | `lib/tracking-host.ts` acepta los dos hosts | ✅ sin cambios |
| Meta Commerce: feed de catálogo y dominio verificado | Panel de Meta | ⬜ revisar que el dominio verificado sea el sin www (el de www puede quedar también) |
| Google Search Console | Propiedad de dominio o de prefijo | ⬜ si es de prefijo, existe la propiedad `https://hypestyle.com.ar/` |
| Links en mails de Brevo y bio de Instagram | Texto | Funcionan igual: solo suman un salto |
| `CORS` del mu-plugin (`PHP/hypestyle-api.php`) | Permite los dos orígenes | ✅ sin cambios |
| Tests de layout (`playwright.layout.config.ts`) | Base por defecto `https://www.hypestyle.com.ar` | Siguen el redirect. Conviene cambiar el default al dominio sin www en un PR aparte. |

## Verificación después de aplicar

```
curl -sI https://www.hypestyle.com.ar/                    # 308 → https://hypestyle.com.ar/
curl -sI https://www.hypestyle.com.ar/producto/regular-tee-black  # 308 conservando el path
curl -sI "https://www.hypestyle.com.ar/confirmacion/?order=1"     # 308 conservando la query
```

Después, una compra de prueba por cada pasarela según el procedimiento habitual, y revisar los logs de `/api/paypal-webhook` y `/api/gocuotas-webhook` durante 24 h.
