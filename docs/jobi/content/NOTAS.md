# NOTAS — extracción desde Figma (CV + Services Guide)

Fecha: 2026-10-06. Solo lectura en Figma y escritura dentro de `docs/jobi/content/`. **No se editó código, no se hizo commit.** (`git status`: lo único nuevo es `docs/jobi/content/` sin trackear; `tsconfig.tsbuildinfo` aparece como modificado pero su mtime es 2026-10-01, es preexistente.)

## Qué hay en los dos archivos

**1) `2JmkE1tTtSNM7BaGpEvCqp` — *resume_Gabriel-Lagos***
- **12 páginas**, no 1: `Page 1` (57 elementos: ~54 CV/Anschreiben + ejemplos) y 11 páginas por empresa (`Claude`, `N26_09_26`, `OpenAI_09_26`, `FRASER_09_26`, `StarFinanz_09_26`, `TripleTen_09_26`, `TripleTen-Growth_09_26`, `OpenAI-B2B-DACH_09_26`, `MadisonBlack_09_26`, `Google-CreativeMKT_10_26`, `trbo_10_26`).
- **`225:20` (CV Google) y `226:2` (carta Google) están en la página `Google-CreativeMKT_10_26` (`225:19`)**, no en `Page 1` — por eso no aparecen si solo pides metadata de `0:1`.
- 798 nodos `TEXT`, 0 nodos `VIDEO`, 6 fills `IMAGE` (todos en las páginas "Examples": capturas dentro de `156:*` y `161:*`), 6 `RECTANGLE`.

**2) `LJFQ84WAue2C9XNqJ9cQVr` — *make-happen-GmbH---2026***
- 1 página, **14 slides** `PAGE 1`…`PAGE 14` de 1920×1080 (los nombres de capa van desordenados: `PAGE 14` está en la fila de abajo, antes que `PAGE 12/13`).
- 147 nodos `TEXT`, componente único `Header & Footer` instanciado en las 14 slides.
- Los 6 casos viven solo en **slide 10** (`1:143`) y **slide 11** (`1:173`).

## Método y por qué

- Empecé con el MCP de Figma (`get_metadata`), pero devuelve **nombres de capa truncados a ~20 caracteres** (p. ej. `02.2018 – Current Se`, `2008 – 2011 Diplom K`) y solo la página que le pidas. Para texto literal use la **Figma REST API** con el token de `~/.hermes/figma_token.txt`: `GET /v1/files/{key}` (ambos archivos completos, en `~/.hermes/cache/scratch/figma_cv.json` y `figma_mh.json`) y `GET /v1/images/{key}` para exportar PNG.
- Verificación de los PNG: `file` (8 archivos PNG válidos) + `vision_analyze` sobre las slides 10 y 11 para confirmar el orden de los casos (VW · Sindalah · KvD / Hochbahn · AI Content · AI Agents).

## Archivos escritos

| ruta absoluta | contenido |
|---|---|
| `/Users/pablo/outreach-dashboard/docs/jobi/content/cv_raw.md` | CV completo: cabecera, contacto, experiencia con fechas/empresa/rol/bullets, skills, educación, clientes. Frame maestro + bloques que solo están en otras variantes + tabla comparativa de ~50 frames + discrepancias. |
| `/Users/pablo/outreach-dashboard/docs/jobi/content/cv_google_reference.md` | contenido y estructura visual del frame `225:20` (dos columnas, jerarquía tipográfica y de color, 14 bloques con node id y posición). |
| `/Users/pablo/outreach-dashboard/docs/jobi/content/anschreiben_google_reference.md` | contenido y estructura del frame `226:2` (una columna de 515 px, 7 bloques, tono, párrafos, firma, idioma). |
| `/Users/pablo/outreach-dashboard/docs/jobi/content/mh_raw.md` | textos de las 14 slides, slide → contenido, con node id, posición relativa y tipografía; clasificación de los 4 servicios, el proceso y los 6 casos. |
| `/Users/pablo/outreach-dashboard/docs/jobi/content/assets/cases/*.png` | 8 PNG (ver abajo). |
| `/Users/pablo/outreach-dashboard/docs/jobi/content/NOTAS.md` | este archivo. |

### Imágenes (`assets/cases/`)

| archivo | node | tamaño | verificado |
|---|---|---|---|
| `slide_10_cases_vw-sindalah-kvd.png` | `1:143` (render completo de la slide) | 3840×2160 | ✅ vision: VW · Sindalah · KvD |
| `slide_11_cases_hochbahn-ai_content-ai_agents.png` | `1:173` (render completo) | 3840×2160 | ✅ vision: Hochbahn · AI Content · AI Agents |
| `case_1_vw.png` | `1:146` | 1230×1240 | ✅ (rojo VW ID.) |
| `case_2_sindalah.png` | `1:147` | 1230×1240 | ✅ (marina/puerto) |
| `case_3_kvd.png` | `1:157` | 1230×1240 | ✅ (cuadro Specialized S-Works) |
| `case_4_hochbahn.png` | `1:177` | 1230×1240 | ✅ (panel de señalización U-Bahn) |
| `case_5_elevating-brands-ai-content.png` | `1:178` | 1230×1240 | ✅ (moto de agua + explosión) |
| `case_6_ai-agents.png` | `1:179` | 1230×1240 | ✅ (retrato) |

(Exportados con `format=png&scale=2`.)

## Qué NO se pudo extraer / lo que falta

1. **PNG de las otras 12 slides** del Services Guide: no los pedí porque el encargo era slides 10 y 11 (y los casos). Se pueden exportar igual con `GET /v1/images/LJFQ84WAue2C9XNqJ9cQVr?ids=…` si los quieres.
2. **Imágenes ocultas** de las slides 1, 2 y 12 (`1:19` "image 3", `1:27` "image 1", `1:205` "image 7"): tienen `visible=false` (son fondos de borrador tapados). No las exporté; sus `imageRef` están anotados en `mh_raw.md` por si las necesitas.
3. **Vectores / logos**: los bloques "Edit_here" de las slides 8 y 12 son `VECTOR` (flechas dibujadas a mano) y el QR `1:201` es un `RECTANGLE` con fill de imagen. No exporté SVG de esos vectores (habría que pedir `geometry=paths` o `download_assets`); el QR sí se ve en el render de la slide 12, que no exporté.
4. **Archivos de fuente**: GRIFTER, HelveticaNeue LT 95 Black, Space Grotesk, Karla, Helvetica Neue, Desyrel. Solo registré familia, peso y tamaño — Figma no deja bajar las fuentes por API (las dos primeras son licencias comerciales).
5. **Nombres de capa ≠ texto real**: varios nombres de capa son caducos o se cortan (`1:213` se llama "Title" pero contiene la dirección completa; `162:23`-style names truncated). El texto literal de `characters` es lo que va a los `.md`.
6. **Variantes de Header & Footer**: el texto cambia entre slides (`©COPYRIGHT MAKE HAPPEN 2025` vs `2026`, weight 400 vs 700, `SERVICES GUIDES` en plural). Lo dejé tal cual por slide, sin unificar — es contenido real del archivo.
7. **Carácter raro en slide 12**: el node `1:202` contiene un carácter de control `U+0003` literal tras «Don't like QR codes?». Conservado en `mh_raw.md` tal cual.
8. **Textos de las páginas por empresa del CV** (Claude, N26, OpenAI, TripleTen, etc.): no los vertí a ficheros aparte — solo están resumidos en la tabla comparativa de `cv_raw.md`. Si necesitas el CV adaptado a otra empresa concreta, se extrae igual (mismo proceso, nodo `NNN:16/17`).
9. **No verificado contra la UI de Figma**: toda la extracción es de la API REST; no abrí Figma en el navegador para contrastar pantalla a pantalla (la verificación visual se hizo sobre los PNG exportados de las slides 10 y 11).

## Coherencia de datos detectada (para que la redacción no la herede sin avisar)

- make happen: `2019 – Current` vs `2018–Present` según frame.
- Heimat: `April 2005 - Februar 2007` vs `2006–2007`.
- Los CV-2025 antiguos meten **dos entradas de DDB** (una con fechas `05.2014 – 01.2016`, solapada con el periodo freelance).
- Idiomas: `German (Native)` en `81:36` vs `German (Fluent)` en `162:17`/`225:28`.
- Web: `makehappen.de` vs `makehappen.ai`.
- `162:19` (skills) y `144:12` terminan con coma: texto sin cerrar en Figma.
- `81:73` tiene el bloque de experiencia **duplicado** (`81:75` = `81:76`) — frames a ignorar.
