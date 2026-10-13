# Galería de Heroes de Hype®

Registro vivo de todos los heroes de la home: los que están en uso, los
archivados y las alternativas en evaluación. **Ningún hero se borra del repo**:
cada pieza queda con su componente completo (efectos incluidos) lista para
volver a usarse o para inspirar el próximo drop.

## En uso

| Hero | Componente | Qué hace |
|---|---|---|
| **SS27 Desktop "Showroom split"** (elegido 13/10/2026) | `components/ss27-home/HeroSs27.tsx` → `HeroDesktopSplit` | Split pantalla completa: flatlay de la colección a la izquierda + film de estudio vertical a sangre a la derecha; STYLE&CULTURE (crece 0.62→1 con el scroll) + CTA liquid sobre la costura; cortina blanca sticky con CSS puro (sin GSAP) + hold de 45svh; flechita SCROLL. Principio ALD/Entire: producto primero. |
| **SS27 Mobile dúo al azar** (elegido 13/10/2026) | `components/ss27-home/HeroSs27.tsx` → `HeroMobile` / `HeroMobileFlatlay` | 50/50 al azar por visita: el video de estudio aprobado (aparición scale 0.88→1) o el flatlay a sangre (S&C crece 0.68→1). En los dos, STYLE&CULTURE sticky que se clava bajo el navbar con handoff, CTA liquid glass con metal rim y flechita SCROLL. El server siempre manda el video (sin mismatch de hidratación); el swap es al montar. |

## Archivo (fuera de uso, completos en el repo)

| Hero | Componente | Época |
|---|---|---|
| **SS27 Desktop "card que crece"** | `components/ss27-home/HeroCardQueCrece.tsx` | drop SS27 (11–13/10/2026) — card 767→1220px con pin GSAP de 200%, tríos de fotos verticales que rotan cada 4,5s, film de estudio desenfocado de fondo, card glass con la prenda del slide, STYLE&CULTURE que escala ×2,1 con el scroll. **Feature distintiva a conservar**: el timeline grow+hold y el patrón de slides por tríos. Nació en `HeroLookbookFW26`. OJO al remontarlo: va adentro de un wrapper con key (el pin de GSAP crashea al desmontar sin él). |
| Hero + EventCountdown + PinnedIntro | `components/Hero.tsx` y afines | pre-SS27 |
| HeroLaNuestra | `components/HeroLaNuestra.tsx` | Mundial 26 |
| HeroHannaDrop | `components/HeroHannaDrop.tsx` | drop Hanna |
| HeroLookbookFW26 | `components/HeroLookbookFW26.tsx` | FW26 — el padre del "card que crece" |

## Alternativas evaluadas y descartadas (12–13/10/2026, en el lab)

`components/ss27-home/HeroDesktopLab.tsx` de la rama `feature/rediseno-lab`:
**A · Editorial** (EME/Nude: `hero-duo-grey-hd` a sangre, cero JS) y **B · Split
dúo** (Nude "For him / For her" con Athletic LS / Hoodie Eagle). La C
"Showroom" ganó y es la que está en uso.

## Reglas

- Antes de reemplazar un hero, sumarlo acá con una línea de qué lo hacía único.
- Los assets de cada hero (fotos/videos) no se borran de `public/` mientras el componente exista.
- Las decisiones de cuál está activo se toman con el dueño, nunca de oficio.
