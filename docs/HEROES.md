# Galería de Heroes de Hype®

Registro vivo de todos los heroes de la home: los que están en uso, los
archivados y las alternativas en evaluación. **Ningún hero se borra del repo**:
cada pieza queda con su componente completo (efectos incluidos) lista para
volver a usarse o para inspirar el próximo drop.

## En uso

| Hero | Componente | Qué hace |
|---|---|---|
| **SS27 Mobile** (aprobado) | `components/ss27-home/HeroSs27.tsx` → `HeroMobile` | Video de estudio a pantalla completa, STYLE&CULTURE al centro (destino de la intro), aparición scale 0.88→1, CTA liquid glass con metal rim. |
| **SS27 Desktop "card que crece"** (en prod; candidato a archivo) | `components/ss27-home/HeroSs27.tsx` → `HeroDesktop` | Card 767→1220px con pin GSAP de 200%, tríos de fotos verticales que rotan cada 4,5s, film de estudio desenfocado de fondo, card glass con la prenda del slide, STYLE&CULTURE que escala ×2,1 con el scroll. **Feature distintiva a conservar**: el timeline grow+hold y el patrón de slides por tríos. Nació en `HeroLookbookFW26`. |

## Alternativas en evaluación (12/10/2026, solo desktop)

`components/ss27-home/HeroDesktopLab.tsx` — conmutables desde el panel LAB:

| Variante | Principio (benchmark) | Composición |
|---|---|---|
| **A · Editorial** | EME/Nude: una sola foto de campaña a sangre, texto mínimo | `hero-duo-grey-hd` full-bleed 88svh, display 64–84px abajo-izq, CTA liquid abajo-der. Cero JS. |
| **B · Split dúo** | Nude "For him / For her", con líneas de producto propias | Dos verticales de campaña (Athletic LS / Hoodie Eagle) con labels linkeando a /longsleeves y /hoodies; STYLE&CULTURE + CTA al centro sobre la costura. |
| **C · Showroom** | ALD/Entire, producto primero | `hero-flatlay-hd` (la colección completa desde arriba) en 62svh: el feed entra casi de inmediato. |

## Archivo (fuera de uso, completos en el repo)

| Hero | Componente | Época |
|---|---|---|
| Hero + EventCountdown + PinnedIntro | `components/Hero.tsx` y afines | pre-SS27 |
| HeroLaNuestra | `components/HeroLaNuestra.tsx` | Mundial 26 |
| HeroHannaDrop | `components/HeroHannaDrop.tsx` | drop Hanna |
| HeroLookbookFW26 | `components/HeroLookbookFW26.tsx` | FW26 — el padre del "card que crece" |

## Reglas

- Antes de reemplazar un hero, sumarlo acá con una línea de qué lo hacía único.
- Los assets de cada hero (fotos/videos) no se borran de `public/` mientras el componente exista.
- Las decisiones de cuál está activo se toman con el dueño, nunca de oficio.
