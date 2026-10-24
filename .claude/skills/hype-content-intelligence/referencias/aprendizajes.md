# Registro de aprendizajes — formato y reglas

Los aprendizajes se acumulan en `_claude/contenido/aprendizajes.md`. Este archivo define cómo
se escriben y cuándo cambian de estado.

## Por qué un registro y no "que el skill aprenda solo"

Un sistema que ajusta sus reglas con cada publicación termina persiguiendo el último resultado.
Lo que se busca es lo contrario: que cada afirmación tenga trazabilidad, que se pueda discutir, y
que haga falta una decisión humana para convertir una observación en criterio.

## Estados

| Estado | Qué significa | Cómo se llega |
|---|---|---|
| `hipótesis` | Alguien lo cree, no hay datos que lo sostengan | Se escribe y listo |
| `señal` | Hay evidencia observacional: n ≥ 8 por segmento, sin solapamiento | Un `contrastar` con veredicto `señal`, o varias consultas coincidentes |
| `validado` | Un experimento controlado lo confirmó | Protocolo de experimento cumplido **+ confirmación de Valentín** |
| `descartado` | La evidencia lo contradice, o se probó y no funcionó | Se deja registrado con el motivo |

**Nada sube de estado solo.** El skill propone el cambio; la persona decide. Un aprendizaje
`validado` también puede bajar si aparece evidencia nueva en contra.

## Formato de cada entrada

```markdown
## [estado] Título corto y concreto
- **Afirmación:** qué se sostiene, en una línea.
- **Métrica:** cuál y con qué denominador (ej. guardados/alcance).
- **Segmento:** a qué se aplica (ej. gorras, portada producto-piso, orgánico).
- **Evidencia:** n por segmento, medianas, ventana temporal, 2-3 permalinks concretos.
- **Confianza:** alta/media/baja + por qué.
- **Límites:** confusores no controlados, qué no cubre.
- **Registrado:** fecha · **Última revisión:** fecha
- **Decisión humana:** quién lo aprobó y cuándo (solo para `validado`).
```

Para una recomendación descartada alcanza con: qué se propuso, por qué se descartó, y qué haría
falta para reconsiderarla.

## Reglas de uso

1. **Antes de recomendar**, revisá el registro: si ya hay algo `validado` sobre el tema, citalo;
   si hay algo `descartado`, no lo repitas sin evidencia nueva.
2. **Una publicación aislada no cambia nada.** Ni la mejor ni la peor.
3. **Lo que no se puede atribuir, no se atribuye.** Si un post voló porque lo reposteó una cuenta
   grande, eso es el aprendizaje — no el formato que usaba.
4. **Las hipótesis también se registran**, aunque no tengan datos: sirven para diseñar los
   experimentos que las pondrían a prueba.
5. Cuando el gate B1 esté cerrado, estas entradas se sincronizan con la tabla
   `wp_hs_ig_learnings` (que guarda estado y `evidence_json`). Mientras tanto, el archivo local
   es la única fuente. **El skill nunca escribe en producción.**

## Semilla

`Hype/08 - Marketing/Aprendizajes - qué funcionó y qué no.md` tiene aprendizajes anteriores al
sistema, anotados a mano. Al migrarlos, entran como `hipótesis` salvo que haya datos que los
sostengan: lo que se creía sin medir no es evidencia.
