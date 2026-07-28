# Importación de reseñas desde Nuby

Este documento define cómo se va a importar, más adelante, el histórico de
reseñas que entregue Nuby. Es una especificación — el importador completo
**no está implementado todavía** (solo la estructura de datos del frontend
público ya está preparada para consumir reseñas reales una vez que existan;
ver `docs/reviews-api.md` y `next-app/lib/reviews/public.ts`).

## Formatos aceptados

- CSV (UTF-8, separador `,` o `;` autodetectado)
- XLSX
- JSON (array de objetos)

## Campos esperados por fila

| Campo | Obligatorio | Notas |
|---|---|---|
| Nombre | Sí | Se abrevia al publicar (`Lucía M.`), nunca se muestra completo salvo autorización explícita del cliente. |
| Email | Solo interno | Usado únicamente para: (a) detectar duplicados, (b) intentar matchear con un pedido real en WooCommerce para marcar `verified`. **Nunca se expone públicamente ni se devuelve en `GET /wp-json/hypestyle/v1/public-reviews`.** |
| Rating | Sí | Entero 1–5. Filas fuera de rango se reportan como fallidas, no se fuerzan al rango. |
| Texto | Sí | Se sanitiza (`wp_kses`) antes de guardar como contenido del comentario. |
| Fecha | Sí | Fecha original de la reseña en Nuby — se preserva como `comment_date`, no se reemplaza por la fecha de import. |
| Producto | Sí (nombre o referencia) | Usado como respaldo si no hay SKU. |
| SKU | Recomendado | Vía principal de asociación al producto (ver abajo). |
| Compra verificada | No | Si Nuby la marca como verificada en origen, se preserva esa señal — no se recalcula contra pedidos de Hypestyle salvo que el email matchee un pedido real. |
| Fuente original | Sí | Se guarda en `_hs_review_source` (ver metas abajo). |
| Fotos | No | Si existen, se suben a la biblioteca de medios de WP y se asocian al comentario (no se muestran en el MVP público, se preparan para una fase posterior). |
| Respuesta de la tienda | No | Si existe, se crea como un comentario hijo (reply) del mismo hilo, marcado con el mismo `_hs_review_source`. |

## Qué genera el importador por cada fila válida

Una reseña nativa de WordPress (`wp_insert_comment` con `comment_type =
'review'`, igual que cualquier reseña de WooCommerce), con:

- `comment_approved = 0` — **siempre pendiente de moderación**, igual que las
  reseñas que llegan por el flujo de solicitud automática (ver
  `docs/reviews-headless-architecture.md`). Nada entra publicado sin revisión
  humana, ni siquiera un import masivo.
- `comment_post_ID` — el producto asociado (ver resolución de producto abajo).
- `comment_date` — la fecha original de Nuby, no la fecha de import.
- Meta del comentario:
  - `_hs_review_source = nuby_import`
  - `_hs_original_review_id` — el ID que traía la fila en el archivo de Nuby (para poder re-ejecutar el import de forma idempotente).
  - `_hs_imported_at` — timestamp del momento del import.
  - `rating` — meta estándar que usa WooCommerce para el rating (`comment_meta.rating`), así se integra con el sistema nativo de estrellas.
  - `verified` (meta estándar de WooCommerce, `_verified_owner` en el approach nativo) solo si hay señal real de compra verificada.

## Resolución de producto

1. Buscar por SKU (`wc_get_product_id_by_sku`).
2. Si no hay SKU o no matchea, buscar por nombre exacto de producto.
3. Si no matchea ninguna, la fila se reporta como **omitida** (no se crea un comentario huérfano ni se inventa una asociación).

## Deduplicación

Antes de insertar, se busca un comentario existente con
`_hs_original_review_id` igual al de la fila. Si ya existe, la fila se
reporta como **omitida (duplicado)**, nunca se crea una segunda reseña ni se
sobrescribe la existente. Esto permite correr el importador más de una vez
sobre el mismo archivo (por ejemplo, si Nuby entrega un export incremental)
sin generar duplicados.

## Reporte de resultado

Cada corrida del importador debe devolver/loguear un resumen con tres listas:

- **Importadas**: fila original + ID del comentario creado.
- **Omitidas**: fila original + motivo (duplicado / producto no encontrado / fila vacía).
- **Fallidas**: fila original + error (rating inválido, fecha inválida, texto vacío, etc.).

No se aborta el import completo por una fila inválida — se sigue con las
siguientes y se reporta el detalle al final.

## Qué NO hace este importador

- No publica nada automáticamente — todo queda `pending`, igual que el resto
  del sistema de reseñas.
- No expone el email de origen en ningún endpoint público.
- No genera cupones ni dispara ningún email — el flujo de incentivo
  (`docs/reviews-headless-architecture.md`) es exclusivo de las reseñas que
  se originan por una compra real en Hypestyle, no aplica a reseñas
  importadas de otra plataforma.
- No sobrescribe reseñas nativas ya existentes con el mismo producto.

## Estado de implementación

Pendiente. Cuando Nuby entregue el archivo real, se implementa un script
PHP puntual (WP-CLI command o script one-off, siguiendo el mismo patrón que
el resto del backend en `PHP/hypestyle-reviews/`) que seguía esta
especificación, se prueba contra una copia de staging antes de correr en
producción, y se documenta el resultado real del import (cuántas filas
importadas/omitidas/fallidas) antes de aprobar las reseñas para publicación.
