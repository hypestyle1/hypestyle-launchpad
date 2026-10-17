# Metodología analítica

Las reglas del doc 03 de la propuesta (`_claude/propuestas/_content-intelligence-2026-10-17/`),
en la forma en que el skill las aplica.

## Métricas y denominadores

| Métrica | Fórmula | Para qué |
|---|---|---|
| `likesReach` | likes / alcance | **Principal de reacción relativa.** Comparable entre publicaciones |
| `erReach` | (likes + comentarios + guardados + compartidos) / alcance | Interacción total |
| `savedReach` | guardados / alcance | Interés real en el producto — la señal más cercana a intención de compra |
| `sharesReach` | compartidos / alcance | Distribución: cuánto lo pasan a otros |
| `commentsReach` | comentarios / alcance | Conversación |
| `followsReach` | seguidores nuevos / alcance | Captación |
| `likesViews` | likes / views | **Secundaria.** Views cuenta varias vistas de la misma cuenta |

**El alcance (`reach`) son cuentas únicas y Meta lo declara una estimación.** Las
visualizaciones (`views`) incluyen repeticiones: en publicaciones reales de la cuenta la relación
views/alcance varió entre 2,5× y 6,3×, así que usar views de denominador distorsiona la
comparación entre posts. Por eso likes/views es secundaria y nunca encabeza una recomendación.

`erReach` exige las cuatro interacciones presentes: si falta una, el resultado sería menor al
real y el post parecería peor de lo que fue. En ese caso el valor es `null`, no un número bajo.

**Una métrica ausente nunca vale 0.** La Graph API devuelve un conjunto vacío cuando no tiene el
dato; un 0 significa "se midió y dio cero". El skill los distingue siempre.

## Comparar sin engañarse

- **Medianas y percentiles, no promedios.** Un viral desplaza la media y hace parecer que todo
  un segmento rinde mejor. La mediana no se mueve por un caso.
- **p25–p75 visible.** Si los rangos de dos segmentos se solapan, la diferencia entre sus
  medianas puede ser ruido. El comando `contrastar` lo dice explícitamente.
- **n ≥ 8 para comparar.** Por debajo, el segmento se muestra marcado como muestra chica y no
  sostiene ninguna conclusión. Con menos de dos segmentos comparables no hay comparación posible.
- **Misma época.** Las publicaciones de hace dos años no se comparan en valores absolutos con las
  de hoy: la cuenta creció y el algoritmo cambió. Los ratios normalizados aguantan mejor, pero
  tampoco son inmunes.
- **Atípicos aparte.** Se marcan por 1,5×IQR y se analizan por separado: suelen ser el lugar
  donde está el aprendizaje, pero promediarlos contamina el segmento.

## Confusores que hay que nombrar

Antes de atribuirle un resultado al formato o la portada, revisá si no lo explica:

- **El producto.** Un best-seller levanta cualquier formato.
- **La pauta.** Por eso el universo es orgánico por defecto. Una publicación pauteada dentro de
  una muestra orgánica invalida la comparación.
- **El horario y el día.**
- **El momento de campaña.** Un lanzamiento concentra atención que no tiene un posteo de valle.
- **Las colaboraciones.** Un repost de una cuenta grande no es comparable con una publicación propia.
- **El tamaño de la cuenta en ese momento.**

## Niveles de veredicto

El comando `contrastar` devuelve uno de tres:

- **`insuficiente`** — alguno de los segmentos tiene n < 8. No se afirma nada.
- **`indicio`** — ambos con n ≥ 8 pero los rangos se solapan. Se puede mencionar como señal débil.
- **`señal`** — ambos con n ≥ 8 y sin solapamiento. Es lo más fuerte que puede decir un análisis
  observacional: sigue sin ser causa. Para afirmar causa hace falta un experimento.

## Experimentos

Para pasar de señal a causa, el protocolo mínimo, **definido antes de publicar**:

1. **Hipótesis escrita.** Ej.: "una portada flatlay genera más guardados/alcance que una
   editorial, para el mismo tipo de producto".
2. **Pares equivalentes.** Mismo tipo de producto, mismo slot horario (±1 h), semanas alternas.
   Solo cambia la variable bajo estudio.
3. **Métrica primaria única**, definida de antemano, más secundarias. Elegirla después de ver los
   resultados es hacer trampa.
4. **Mínimo de pares** antes de leer: 4-6. Con menos, es anécdota.
5. **Lectura a 72 h y a 7 días.** Antes de las 48 h los datos de Meta pueden estar incompletos.
6. El resultado actualiza el estado del aprendizaje. Nunca automáticamente.

## Matriz de contenido (hipótesis de la Fase 0)

| Categoría | Participación objetivo |
|---|---:|
| Producto en piso / flatlay | 25% |
| Editorial / campaña | 15% |
| Reel visual / producto | 15% |
| UGC / comunidad | 10% |
| Reel hablando | 10% |
| Producto / estudio | 10% |
| Behind the scenes | 10% |
| Creativo / cultura | 5% |

Orientativo, además: una portada de producto en piso cada 3-5 publicaciones, un reel cada 3-4.

**Esto es una hipótesis de trabajo, no una regla.** Sirve para detectar que algo se está
repitiendo de más o que una categoría desapareció hace meses. Los datos pueden justificar
cambiarla; la dirección creativa también.

## Dimensiones de clasificación

Una publicación vive en varias a la vez:

- **Formato** (de la API, no se etiqueta): carrusel · reel · imagen · story.
- **Categoría**: las ocho de la matriz.
- **Tipo de portada**: producto en piso · modelo editorial · modelo + producto · estudio limpio ·
  gráfica/lettering · frame de video · collage/split.
- **Estilo visual**: luz natural · estudio · flash directo · IA asistido · archivo.
- **Objetivo**: venta directa · lanzamiento/drop · marca/cultura · comunidad · restock.
- **Escenario**: piso/cemento · estudio · exterior urbano · local/showroom · evento.
- **Personas**: sin personas · modelo · creador/UGC · equipo.
- **IA**: sin IA · asistido · generado (se evalúan por separado).
