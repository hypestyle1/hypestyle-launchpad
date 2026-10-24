# Cómo usar Hype Content Intelligence (para el equipo)

## Qué hace

Responde preguntas sobre el contenido de Instagram de Hype usando el rendimiento real del
histórico, y arma briefs creativos fundamentados en eso. Es **solo lectura**: no publica, no
programa, no toca campañas ni credenciales.

## Cómo se invoca

En Claude Code, preguntá en lenguaje natural dentro del proyecto:

- "¿Qué publicaciones funcionaron mejor estos 90 días?"
- "¿Las fotos en piso rinden más que las editoriales?"
- "¿Qué portadas generaron más interacción relativa?"
- "¿Qué formato conviene para la bermuda camuflada?"
- "¿Qué estamos repitiendo demasiado?"
- "Armame un brief para el drop de hoodies."
- "¿Qué deberíamos probar en el próximo lanzamiento?"

Claude carga el skill solo. Para forzarlo: `/hype-content-intelligence`.

## Estado actual: datos de prueba

**Mientras el gate B1 siga abierto, el skill solo tiene datos sintéticos.** El backend de
ingesta (`hypestyle-ig-insights.php`) todavía no está desplegado y el backfill no se corrió, así
que no existen métricas reales en la base.

Toda salida con datos sintéticos aparece marcada:

```
Fuente: DEMO  ⚠ DATOS SINTÉTICOS — no sirven para decidir
```

Sirve para probar que el sistema funciona y para ver la forma de las respuestas. **No se toma
ninguna decisión con esos números.** Cuando se cierren B1 y B2, las mismas preguntas devuelven
datos reales sin cambiar nada del skill.

## Para que use datos reales (cuando B1/B2 estén cerrados)

El skill lee del panel, así que necesita saber dónde está y con qué clave:

```bash
export HYPE_PANEL_URL="https://<el-dominio-del-panel>"   # o http://localhost:3000 en local
export HYPE_ADMIN_KEY="<la clave de admin>"
```

Si falta la clave, el CLI falla con un mensaje claro. **No cae a datos sintéticos en silencio**:
o hay datos reales, o lo dice.

## Consultas manuales (sin Claude)

```bash
cd hypestyle-launchpad/.claude/skills/hype-content-intelligence

node lib/consultar.mjs resumen    --dias 90
node lib/consultar.mjs top        --metrica savedReach --dias 90
node lib/consultar.mjs segmentos  --dimension portada
node lib/consultar.mjs contrastar --a producto-piso --b modelo-editorial --dimension portada
node lib/consultar.mjs producto   --producto "camo cap"
node lib/consultar.mjs mezcla     --dias 180

# Cualquiera de los anteriores con --demo usa el dataset sintético
# y con --json devuelve la estructura completa.
```

## Qué esperar de las respuestas

Siempre traen **el tamaño de muestra y los límites**. Si el skill dice "no alcanza para
responder", no es que falle: es que con pocos datos cualquier conclusión sería inventada. En esos
casos propone el experimento que sí lo resolvería.

Tampoco va a recomendar repetir siempre el formato de mayor engagement. Hype no publica para
juntar likes, y un sistema que optimiza solo eso termina apagando la cuenta.

## Dónde se guardan los aprendizajes

En `_claude/contenido/aprendizajes.md`, con su estado (`hipótesis` → `señal` → `validado`, o
`descartado`) y la evidencia que lo respalda. **Nada sube de estado automáticamente**: el skill
propone, Valentín decide.

## Instalación

El skill vive en el repo, en `hypestyle-launchpad/.claude/skills/hype-content-intelligence/`, y
está disponible cuando se trabaja sobre archivos de ese repo.

Para tenerlo disponible desde la raíz del proyecto (`C:\Users\pc\Documents\Hypestyle`), junto a
los otros skills de Hype, hay que linkearlo una vez — **después** de que el PR se mergee:

```powershell
New-Item -ItemType SymbolicLink `
  -Path "C:\Users\pc\Documents\Hypestyle\.claude\skills\hype-content-intelligence" `
  -Target "C:\Users\pc\Documents\Hypestyle\hypestyle-launchpad\.claude\skills\hype-content-intelligence"
```

(Es el mismo patrón que usa `seo-audit` en ese repo.)

## Si algo falla

| Síntoma | Qué pasa |
|---|---|
| `El panel respondió 403` | Falta `HYPE_ADMIN_KEY` o está vencida |
| `El panel respondió 404` | La URL de `HYPE_PANEL_URL` no es la correcta |
| No conecta | El panel no está levantado, o no hay red hacia él |
| Dice DEMO aunque el panel responde | El mu-plugin de ingesta no está desplegado (gate B1) |
| "NO alcanza para comparar" | No es un error: no hay suficientes publicaciones clasificadas |
