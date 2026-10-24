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
  una muestra orgánica invalida la comparación. **Ojo:** `wasBoosted` es un campo curado que no
  escribe ningún proceso automático, así que una publicación sin marca de pauta puede ser orgánica
  o simplemente no revisada. El motor cuenta esas como *distribución sin verificar*, lo informa en
  el encabezado y baja la confianza; recién cuando alguien las cruza con Meta Ads (y queda la
  referencia en `boostRef`) se puede hablar de orgánico confirmado.
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

1. **Hipótesis escrita.** Ej.: "una portada `producto-piso` genera más guardados/alcance que una
   `modelo-editorial`, para el mismo tipo de producto".
2. **Pares equivalentes.** Mismo tipo de producto, mismo slot horario (±1 h), semanas alternas.
   Solo cambia la variable bajo estudio.
3. **Métrica primaria única**, definida de antemano, más secundarias. Elegirla después de ver los
   resultados es hacer trampa.
4. **Mínimo de pares** antes de leer: 4-6. Con menos, es anécdota.
5. **Lectura a 72 h y a 7 días.** Antes de las 48 h los datos de Meta pueden estar incompletos.
6. El resultado actualiza el estado del aprendizaje. Nunca automáticamente.

## Mezcla editorial objetivo (aprobada el 24/10/2026)

| Categoría | Participación objetivo |
|---|---:|
| `producto` | 30% |
| `editorial` | 20% |
| `drop` | 15% |
| `comunidad` | 15% |
| `proceso` | 10% |
| `cultura` | 5% |
| `institucional` | 5% |

**Son objetivos orientativos, no cuotas.** Sirven para detectar que algo se está repitiendo de más
o que una categoría desapareció hace meses, y para conversarlo. **La planificación no se modifica
sola por un desvío.** Los datos pueden justificar cambiar la mezcla; la dirección creativa
también.

## Dimensiones de clasificación — taxonomía v1 (congelada)

Cinco vocabularios cerrados, cada uno con una pregunta distinta, más el formato, que es observado.
El listado completo con las definiciones está en `next-app/lib/ig-insights/taxonomia.ts` y
replicado en `lib/analisis.mjs` (`VOCABULARIO`); los valores son los mismos del gold set.

- **Formato** (de la API, no se etiqueta): carrusel · imagen · reel · reel-prueba · video-feed ·
  story. `reel-prueba` es el reel con `is_shared_to_feed = false`: otra audiencia, no se mezcla.
- **`category`** — para qué existe: producto · drop · editorial · comunidad · cultura · proceso ·
  institucional · otro.
- **`cover_type`** — qué se ve en la portada: producto-piso · producto-detalle · producto-estudio ·
  modelo-editorial · modelo-producto · grafica · escena · otro.
- **`visual_style`** — cómo está hecha: luz-natural · estudio · flash · nocturna · grafica-digital ·
  archivo · ia-asistido · otro.
- **`scenario`** — dónde pasa: calle · interior-casa · local · taller · estudio · exterior-natural ·
  evento · sin-escenario · otro. `sin-escenario` es la respuesta correcta para flatlays y gráficas.
- **`has_models`** — personas: no · si-rostro · si-sin-rostro · grupo · otro.
- **IA**: sin IA · asistido · generado, en su propio campo. Única regla de coherencia:
  `visual_style = ia-asistido` ⇒ el uso de IA no puede ser `none`. Al revés no.

El vacío (`''`) significa **sin clasificar** en las cinco dimensiones y nunca forma un segmento.

Cambiar un valor obliga a subir la versión de taxonomía y a rehacer el gold set: medir contra un
gold set v1 con un vocabulario v2 no mide nada.
