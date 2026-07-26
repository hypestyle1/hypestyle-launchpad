# Análisis de costos — niveles de Purchase Gift

Este documento explica qué falta definir antes de aprobar los montos y regalos definitivos, y da una tabla de partida para discutirlo. La herramienta interactiva equivalente vive en el admin: **WooCommerce → Purchase Gift → Análisis de costos** (calcula esto mismo en vivo, con el costo interno cargado en cada nivel y el stock real).

## Qué falta para decidir los niveles definitivos

1. **Costo real de compra de cada regalo** (no el precio de venta al público). Hoy el catálogo tiene precios de venta para Chain Hype ($22.000), Pack x3 Medias Hype ($28.000) y Per Aspera Ad Astra - ZIPPO ($60.000) — pero el **costo de compra/fabricación de cada uno todavía no está cargado**. Sin ese dato, cualquier % de costo sobre el monto del nivel es una suposición.
2. **Margen bruto real del ticket promedio actual**, para saber cuánto margen se puede "regalar" sin que la promo termine perdiendo plata en el agregado.
3. **Cuántas unidades hay realmente disponibles** de cada producto de regalo hoy (verificar stock real antes de fijar montos — un nivel con poco stock puede agotarse rápido y generar el escenario "calificó pero no hay regalo").
4. **Si el objetivo es aumentar el ticket promedio actual o solo fidelizar** — cambia qué tan agresivos conviene que sean los montos (más bajos = más gente califica pero más costo total; más altos = filtra mejor pero menos adopción, como señala el propio documento de Nuby en la sección de métricas).
5. **Si va a haber promoción/comunicación del beneficio** (banner, mail, Instagram) — sin visibilidad, la campaña no genera el "empuje" que describe el PDF de referencia (secciones 2 y 3), por más bien calculados que estén los montos.

## Tabla de partida (simulación — pendiente de aprobación)

Todos los valores de "Costo interno" son **placeholders**, no costos reales confirmados. Los porcentajes son puramente ilustrativos hasta que se carguen los costos reales en el panel.

| Nivel | Monto requerido | Regalo | Costo interno | % del monto | Diferencia vs. nivel anterior | Costo / diferencia |
|---|---|---|---|---|---|---|
| 1 | $120.000 *(pendiente de aprobación)* | Chain Hype | *(cargar costo real)* | — | $120.000 | — |
| 2 | $240.000 *(pendiente de aprobación)* | Pack x3 Medias Hype | *(cargar costo real)* | — | $120.000 | — |
| 3 | $360.000 *(pendiente de aprobación)* | Per Aspera Ad Astra - ZIPPO | *(cargar costo real)* | — | $120.000 | — |

**Una vez cargado el costo interno real de cada regalo**, esta misma tabla se completa automáticamente en el panel (WooCommerce → Purchase Gift → Análisis de costos), con las columnas de % y las advertencias si el costo supera los umbrales configurados (por defecto: 10% del monto del nivel, 40% del incremento respecto al nivel anterior — ambos editables en Ajustes generales).

## Cómo se calculan las columnas (mismo código que usa el panel)

- **% del monto** = costo interno del regalo ÷ monto requerido del nivel × 100.
- **Diferencia vs. nivel anterior** = monto de este nivel − monto del nivel anterior (el primer nivel usa 0 como "anterior").
- **Costo / diferencia** = costo interno del regalo ÷ esa diferencia × 100. Mide qué tan caro es el regalo en relación a lo *adicional* que tiene que gastar el cliente para llegar a este nivel desde el anterior — es la métrica más honesta de "rentabilidad marginal" del escalón, más que el % del monto total.
- **Stock disponible** y **pedidos estimados que podrían recibirlo** salen directo de WooCommerce (`get_stock_quantity()` del producto de regalo o su variación).

## Nota sobre el sistema de costos existente

El proyecto ya tiene un sistema de costo interno (`hs_cost_profiles`, usado en `/admin/costos`), pero es **específico para prendas fabricadas por tela/construcción** (ej. "Jersey 20/1 TEE") y no aplica directo a accesorios comprados a un proveedor externo. Por eso el costo interno de cada nivel de Purchase Gift es un campo manual — si el producto de regalo ya tiene un perfil de costo asignado, es solo una referencia, no reemplaza cargar el costo real de compra del accesorio.
