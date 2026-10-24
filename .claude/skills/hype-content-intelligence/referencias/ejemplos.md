# Ejemplos de consultas y respuestas

Muestran el nivel de rigor esperado. Los números de los ejemplos vienen del **dataset demo**
(sintético) y están marcados como tal: son ejemplos de forma, no resultados de Hype.

---

## 1. "¿Qué publicaciones funcionaron mejor estos 90 días?"

```bash
node lib/consultar.mjs top --metrica likesReach --dias 90 --limite 5
```

**Respuesta esperada:** las publicaciones con su permalink, su valor, el ×mediana y el alcance.
Lo que la hace una buena respuesta es lo que agrega alrededor:

> De las 14 publicaciones orgánicas del período con métricas confiables, el tope es un carrusel de
> categoría `producto` del 26/07 con 9,77% de likes/alcance, 2,23× la mediana del período (4,39%).
> Tres de las cinco primeras son de esa categoría, pero con n=3 eso **no** alcanza para decir que
> la categoría explica el resultado: dos de esas tres son del mismo producto, así que puede ser el
> producto y no la portada.

Mal ejemplo (lo que **no** hay que hacer): "El producto en piso es lo que mejor funciona, hay que
hacer más". Ni el n lo sostiene, ni se descartó el producto como explicación.

---

## 2. "¿Las fotos en piso funcionan mejor que las editoriales?"

La pregunta es de **portada**, no de categoría: se contrasta `producto-piso` contra
`modelo-editorial` en la dimensión `portada`.

```bash
node lib/consultar.mjs contrastar --a producto-piso --b modelo-editorial --dimension portada \
  --dias todo --metrica likesReach
```

Salida real del CLI con el dataset demo:

```
producto-piso vs modelo-editorial — likes / alcance
  producto-piso: n=7, mediana 7,16% (p25–p75 5,42%–8,84%)
  modelo-editorial: n=11, mediana 3,40% (p25–p75 2,87%–4,83%)
  Diferencia observada: 2,11×
  Veredicto: INSUFICIENTE · confianza baja
   - "producto-piso" tiene n=7 (menos de 8)
   - 58 de 58 publicaciones tienen distribución SIN VERIFICAR: si alguna tuvo pauta, la
     diferencia puede ser plata y no contenido
   - es una diferencia observada, no una causa
```

**Cómo responder:** la diferencia es grande y va en la dirección de la hipótesis, pero con n=7 en
uno de los dos lados el veredicto es insuficiente — y encima la distribución no está verificada.
Lo honesto es proponer el experimento que lo resolvería (pares equivalentes, misma categoría de
producto, portadas distintas, métrica primaria guardados/alcance a 72 h), no declarar ganador.

Además: el editorial no se evalúa solo por reacción. Construye marca, que es otro objetivo.
Recomendar bajarlo porque "rinde menos en likes" es confundir la métrica con el propósito.

---

## 3. "¿Qué formato conviene para una bermuda camuflada?"

```bash
node lib/consultar.mjs producto --producto "camo" --metrica savedReach
```

**Respuesta esperada (formato completo):**

```
RECOMENDACIÓN
Carrusel con portada producto-piso, 5-6 fotos, cerrando con una de producto puesto.

EVIDENCIA
De 15 publicaciones con "camo" en el copy, las 4 de mayor guardados/alcance son carruseles con
portada producto-piso (1,10% · 0,81% · 0,80% · 0,72%, contra una mediana de 0,44% del conjunto).
  https://www.instagram.com/p/DEMO008/  (1,10% · 2,5× la mediana)
  https://www.instagram.com/p/DEMO048/  (0,81% · 1,8×)

HIPÓTESIS
Que el fondo de cemento ayude al producto camuflado por contraste de textura. No hay datos que
separen el fondo del formato: siempre aparecieron juntos.

ALTERNATIVA
Un reel corto mostrando la caída de la bermuda en movimiento. Los reels del histórico tienen más
alcance pero menos guardados; si el objetivo es alcance y no intención de compra, conviene.

CONFIANZA
Media. Las 4 referencias son consistentes, pero el corte por producto tiene n=15 y las categorías
dentro quedan en muestra chica. No se controló el momento de campaña.

QUÉ MIRAR DESPUÉS
Guardados/alcance a 72 h, contra la mediana de portadas producto-piso del trimestre. Secundaria: visitas al
perfil. Si guardados/alcance queda por debajo de la mediana, la hipótesis del fondo se debilita.
```

---

## 4. "¿Estamos repitiendo mucho algún formato?"

```bash
node lib/consultar.mjs mezcla --dias 180
```

Devuelve la mezcla real contra la objetivo, los días desde la última de cada categoría y la racha
más larga de la misma categoría seguida.

**Cómo responder:** señalá los desvíos mayores a 5 puntos y, sobre todo, **las categorías que
desaparecieron** (el campo `días desde la última`). Una categoría que no sale hace 138 días
importa más que un desvío de 3 puntos. Y recordá que la mezcla objetivo es una hipótesis: si se
viene desviando sistemáticamente en una dirección que funciona, la que está mal puede ser la
hipótesis.

---

## 5. "¿Qué probamos en el próximo lanzamiento?"

No hay comando único: se combinan `mezcla` (qué falta), `segmentos` (qué rinde) y el registro de
aprendizajes (qué ya se probó).

**La respuesta debe incluir un experimento concreto**, no una lista de buenas intenciones:
hipótesis, pares, métrica primaria, cuántos pares antes de leer, y a qué altura leerlo.

---

## 6. Cuando no hay datos suficientes

Pregunta: "¿qué portada funciona mejor para hoodies?" con 3 publicaciones de hoodies.

**Respuesta correcta:**

> Con 3 publicaciones de hoodies en el histórico clasificado no se puede responder. Las tres son
> de portada `modelo-editorial`, así que ni siquiera hay con qué comparar.
> Lo que sí puedo decir: a nivel general, [dato del conjunto con su n].
> Para poder responderlo, las próximas 6-8 publicaciones de hoodies tendrían que alternar portada
> `producto-piso` y `modelo-editorial` de forma deliberada. Si querés, armo ese experimento.

Lo que **no** se hace: extrapolar de otra categoría de producto como si fuera lo mismo, ni
responder con el promedio general disfrazado de respuesta específica.
