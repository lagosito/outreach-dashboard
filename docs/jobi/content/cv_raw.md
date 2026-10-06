# CV de Gabriel Lagos — extracción cruda desde Figma

- **Archivo Figma:** `2JmkE1tTtSNM7BaGpEvCqp` — *resume_Gabriel-Lagos*.
- **Páginas del archivo:** 12 (no 1). `Page 1` (`0:1`) tiene 57 elementos (54 frames CV/Anschreiben + otros); las 11 restantes son variantes por empresa: `Claude`, `N26_09_26`, `OpenAI_09_26`, `FRASER_09_26`, `StarFinanz_09_26`, `TripleTen_09_26`, `TripleTen-Growth_09_26`, `OpenAI-B2B-DACH_09_26`, `MadisonBlack_09_26`, `Google-CreativeMKT_10_26` (contiene `225:20` y `226:2`), `trbo_10_26`.
- **Método:** Figma REST API (`GET /v1/files/2JmkE1tTtSNM7BaGpEvCqp`) → nodos `TEXT` con `characters` **exactos**, node id, posición y tipografía. El MCP `get_metadata` devuelve nombres de capa truncados (p. ej. `02.2018 – Current Se`) y solo listó 54 frames de la página 1, así que la fuente de verdad es la API REST.
- **No hay vídeo en ninguno de los dos archivos** (0 nodos tipo `VIDEO`); todo el contenido es texto + imágenes estáticas.

---

## 1. Decisión: frame maestro = `162:9` (`CV-2026`)

Comparé todos los frames CV de las 12 páginas extrayendo su nodo de experiencia y contando puestos fechados, líneas de bullets y secciones presentes.

| frame | página | nombre de capa | puestos fechados | líneas de la sección de experiencia | chars | secciones |
|---|---|---|---|---|---|---|
| **`162:9`** | Page 1 | CV-2026 | **8 (con mes)** | **29** | 1734 | Profile, Exp, Skills, Edu&Lang, Clients, Contact |
| `181:6` | Page 1 | CV-2026 | 8 (con mes) | 29 | 1734 | idéntico a `162:9` |
| `185:2` | Page 1 | CV-2026 | 8 (con mes) | 29 | 1721 | idéntico salvo 1 línea de título |
| `81:23` | Page 1 | CV-2025 | **9 (años)** | 9 (una línea por puesto) | 1268 | **sin Profile** |
| `50:2`/`29:2`/`32:2`/`54:2`/`25:2`/`1:2`/`22:2` | Page 1 | CV-2025 | 9 líneas de fecha | 24 | ~520 | experiencia sin bullets |
| `91:2` | Page 1 | Gabriel_Lagos_CV-08_2025_1 | 8 (años) | 20 | 1378 | + Core Strengths + Selected Achievements |
| `81:2` / `92:28` | Page 1 | Gabriel_Lagos_CV-08_2025_ | 8 (años) | 25 / 24 | 1197 / 1218 | `92:28` en alemán |
| `138:2` | Page 1 | CV-2025_General | 3 bloques (agencias agrupadas) | 17 | 1397 | + Impact Highlights |
| `144:2` | Page 1 | CV-2025_Urban | 2 bloques | — | — | skills AI muy amplias |
| `187:2` | Page 1 | CV-2026_ | 3 bloques | 34 | 2042 | perfil "Brand & Communications Lead, 20+ años" |
| `81:73` | Page 1 | CV-2025 | 5 | 25 | 1803 | ⚠️ no usar (ver §4) |
| `213:2` etc. | páginas por empresa | CV-2026_* | 7 (agencias agrupadas) | 30 | 2021 | variantes adaptadas a cada oferta |

**Por qué `162:9`:** es el frame con la lista de experiencias **más completa en detalle**: 8 puestos fechados con **precisión de mes** (Dezember 2011 - August 2013, …), **29 líneas** en la sección (el máximo de todos los frames con puestos completos), bullets de 1–5 líneas por puesto, y TODAS las secciones presentes (Profile a 2 párrafos, Professional Experience, Technical Skills, Education & Languages, Key Clients, Contact). Además es de la serie **CV-2026** (la más reciente de Page 1).

**Único matiz:** el frame con **9** puestos fechados es `81:23` (nodo `81:29`), que añade **Junior Art Director | Media Consulta | 2005–2006** — un puesto que no aparece en ningún otro CV — pero a cambio trae solo una línea por puesto y **no tiene bloque de Profile**. Por eso su entrada está incluida aparte en §3.1 para que la lista final sea la más completa posible.

`181:6` es **idéntico byte a byte** a `162:9`. `185:2` solo difiere en `Head of Creative` vs `Head of Creative Intelligence`.

---

## 2. Contenido del frame maestro `162:9` (CV-2026)

Estructura de **dos columnas**: izquierda en `x=1668` (perfil + experiencia, ancho ~300 px), derecha en `x=1989` (skills, educación, clientes, contacto, ancho ~198 px).

### Cabecera
| node id | contenido | tipografía |
|---|---|---|
| `162:11` | **Gabriel Lagos** | GRIFTER 700 · 18 px |
| `162:12` | Creative Director · Brand Systems & Creative Operations | Space Grotesk 400 · 9 px |

### Columna izquierda

**`162:10` — "Profile"** (GRIFTER 700 · 10 px)

**`162:13` — perfil** (Karla 400 · 9 px):
> Creative leader with 15+ years driving global brand identity and creative systems for leading European brands including Deutsche Telekom, BMW, and Mercedes-Benz. Expert in merging design systems, storytelling, and AI-enabled creative operations to scale consistent brand experiences across markets.
>
> Strong strategic partner to Marketing, Product, and Corporate Communications teams, with proven ability to build and lead high-performing in-house and agency teams, define brand governance frameworks, and deliver high-quality brand experiences across global markets and regions.

**`162:24` — "Professional Experience"** (GRIFTER 700 · 9 px)

**`162:23` — experiencia completa** (Karla 400 · 8 px):

```
make happen GmbH 
Head of Creative Intelligence | 2019 – Current
Built and led a creative systems studio operating as an in-house–like partner for international brands.
Designed and governed brand identity systems, design libraries, templates, and creative standards across digital, social, motion, and experiential touchpoints.
Introduced AI-enabled creative workflows to support brand-safe content production, rapid prototyping, and scalable adaptation across regions.
Defined brand governance models ensuring visual and narrative consistency across markets.
Led compact, high-performing creative teams using agile review, feedback, and quality-control structures aligned with strategic brand priorities.

Gabriel Lagos Freelancer
Marketing Specialist, Product Design UI/UX | 2013 – Current
Developed data-informed brand and design solutions for international automotive and telecom clients.
Bridged brand strategy and creative execution for global launches and digital transformation initiatives.

Jung von Matt 
Digital Creative | Dezember 2011 - August 2013
Creative work for global brand and identity initiatives for Vodafone and Mercedes-Benz. Led cross-functional teams in digital transformation projects.

Serviceplan Group 
Creative Art | Juni 2010 - November 2011
Creative for BMW, Osram and new business development.

DDB 
Art Director | August 2008 - Mai 2010
Creative direction for Volkswagen, Sky, Allianz. 

BBDO 
Creative Director | April 2007 - Juli 2008
Marketing Specialist for Pepsi, Banco LaFise. 

Heimat GmbH 
Art Director | April 2005 - Februar 2007
Strategic direction for Audi, Hornbach. 

TBWA 
Designer | November 2003 - Februar 2005
Visual solutions for PlayStation® gaming platform, Siemens, Swarovski. 
```

> Literal del original: las fechas de agencia están **en alemán** (Dezember, Juni, Mai, Juli, Febrero) aunque el resto del CV está en inglés. Se conserva tal cual.

### Columna derecha

**`162:16` — "Technical Skills"** (GRIFTER 700 · 9 px)

**`162:19` — skills** (Karla 700 · 8 px):
```
Design Systems & Creative Tools:
Adobe Creative Cloud, After Effects, Figma, Lottie, Framer
Creative Operations & AI:
Runway, ElevenLabs, Stable Diffusion, Recraft, ComfyUI, Flora, Weavy
Analytics & Automation
GA4, HubSpot, Power BI, Zapier, Notion AI
Social & Publishing Platforms
TikTok Creative Center, Meta Business Suite, 
```
> El texto termina con coma: así está en Figma (bloque sin cerrar).

**`162:14` — "Education & Languages"** (GRIFTER 700 · 10 px)

**`162:17` — educación/idiomas** (Karla 400 · 8 px):
```
Visual Communication Design & New Media
Languages: Spanish (Native), German (Fluent) ,English (Fluent)
Continuous learning in AI for marketing, automation, and creative analytics
```

**`162:15` — "Key Clients"** (GRIFTER 700 · 10 px)

**`162:18` — clientes** (Karla 400 · 8 px):
> Deutsche Telekom, Telekom MMS, BMW, Mercedes-Benz, Audi, McDonald's, Hyundai, Volkswagen, PlayStation®, NEOM, Hochbahn

**`162:20` — "contact"** (GRIFTER 700 · 10 px)

**`162:22` — contacto** (Karla 400 · 8 px):
```
Phone: +49 176 4664 2026 |
Email: gabriel@makehappen.de
Location: Hamburg, Germany 
LinkedIn: linkedin.com/in/lagosito/
www.makehappen.de
```

---

## 3. Contenido que SOLO está en otros frames (complementa al maestro)

### 3.1 Experiencia extra: `81:29` (frame `81:23`) — el puesto de Media Consulta

Único frame con **9 puestos fechados**. Texto literal del nodo `81:29`:
```
Founder & Creative Strategist | make happen GmbH | Hamburg | 2018–Present  Lead creative strategies for 25+ clients. Manage C-level stakeholder relationships and cross-functional teams. €500K+ budgets, 90% retention.
Freelance Creative Strategist | 2013–Present  Digital strategies for Volkswagen, Mercedes-Benz, Audi, McDonald's, Telekom. Complex stakeholder management across agency teams.
Creative Art Director | Jung von Matt | 2011–2013 Creative strategies for Vodafone, Mercedes-Benz. Led cross-functional teams in digital transformation.
Senior Art Director | Serviceplan Group | 2010–2011  Strategic leadership for BMW, Osram. Stakeholder management and new business development.
Art Director | DDB | 2008–2010  Creative direction for Volkswagen, Sky, Allianz. Cross-functional team collaboration.
Creative Director | BBDO Honduras | 2007–2008  Strategic vision for Pepsi, Banco LaFise. International stakeholder management.
Art Director | Heimat | 2006–2007  Strategic direction for Audi, Hornbach. Innovation through team collaboration.
Junior Art Director | Media Consulta | 2005–2006  Visual branding for Dunlop, EU, Lidl. Team leadership and project coordination.
Graphic Designer | TBWA | 2003–2005  Visual solutions for PlayStation®, Siemens, Swarovski.
```
→ **Si se quiere la lista de experiencias más larga posible: son 9 puestos = los 8 de `162:9` + «Junior Art Director | Media Consulta | 2005–2006».**

### 3.2 Dirección postal (no está en `162:9`)

`50:19` (frame `50:2`):
```
Gabriel Lagos
Susannenstraße 21A. 20357 Hamburg
M. +49 176 4664 2026
gabriel@makehappen.de
www.makehappen.de
https://www.linkedin.com/in/lagosito/
```
(En el Services Guide, slide 13, node `1:213`, aparece también: «gabriel@makehappen.de – Susannenstraße 21a. 20357 – Hamburg – Germany».)

### 3.3 Skills ampliadas — `144:12` (frame `144:2`, CV-2025_Urban)
```
Creative Tech & AI: Weavy, Flora, Dfirst, Kling, Seedream, Fal, Reve, Freepick, Dreamina, Heygen, Runway, ChatGPT, ElevenLabs, Recraft, Stable Diffusion, 
Social Publishing: TikTok Creative Center, Meta Business Suite, YouTube Studio. Rapid prototyping & iterative creative testing
Analytics & Automation: HubSpot, Zapier, Notion AI
Design & Project Tools: Adobe CC, After Effects, Premiere, Lottie, Framer. Figma, Trello, Webflow, CMS platforms
```
`50:17` (frame `50:2`):
```
Brand & Print Design: Adobe Suite.
Digital Content & Animation: After Effects, Premiere Pro.
Web & Social Media: Figma, Webflow, CMS platforms.
Marketing Analytics & CRM: Google Analytics (GA4), HubSpot, Management: Asana, Trello, n8n.
```

### 3.4 Core Strengths / Selected Achievements — `91:8` y `91:24` (frame `91:2`)
```
Core Strengths:
Creative ideation: turn briefs into clear, high‑impact campaign concepts.
Client‑facing & pitching: confident presenter to C‑level and senior clients.
Branded content & digital: deep experience in content‑driven, social and platform campaigns.
Project management: multi‑project ownership, agile collaboration with sales, production, media.
DACH market experience: long‑term work with German brands and agencies; bilingual comms (DE/EN).

Selected Achievements:
Led creative strategies for 25+ clients, from insight and briefs to final delivery.
Delivered compelling creative presentations and pitches that secured new and repeat work.
Managed cross‑functional teams and partners to ship integrated campaigns on time.
```

### 3.5 Impact Highlights — `138:16` (frame `138:2`, CV-2025_General)
```
Increased creative output by 40–60% through AI-driven workflows and automation pipelines.
Reduced production time by 30–50% across digital and social content without expanding team size.
Delivered brand and content systems adopted across 15+ European markets, improving consistency and speed.
Led cross-functional creative teams of 5–20 people, aligning strategy, design, and marketing for measurable growth.
```

### 3.6 SELECTED HIGHLIGHTS + CORE STRENGTHS — `187:16` (frame `187:2`)
```
SELECTED HIGHLIGHTS
Led brand communications, campaign adaptation and launch activities across the DACH region (Volkswagen)
Led cross-functional teams of 5–10 across strategy, design, copy and development
Built digital-first, AI-supported content workflows delivering 40–60% more creative output and 30–50% less production time

CORE STRENGTHS
Brand Management & Brand Governance
Consumer & Digital-First Communications
Campaign Adaptation & Localisation
Product Launches & Innovation Communications
Media, Creative & PR Agency Management
Digital & Social Media
International Brand Rollouts
AI-Supported Content Production
```

### 3.7 Versión alemana del CV — `92:28`
Misma estructura que `81:2` pero traducida: *Kurzprofil, Kernkompetenzen, Professional Experience, Technische Skills, Bildung & Sprachen, Wichtige Kunden, Kontakt*.

### 3.8 Professional Summary de la variante "twitch" — `91:7`
> Creative Strategist with 15+ years building integrated, content‑led campaigns across DACH and Latin America. Strong in concepting from brief to delivery, pitching to senior stakeholders, and managing cross‑functional teams in fast timelines. Experience with digital entertainment brands and social platforms. Fluent in German and English. Available ASAP.

---

## 4. Discrepancias detectadas entre frames (no corregidas, tal cual están en Figma)

- **Año de inicio de make happen:** `2019 – Current` (`162:23`, `138:16`, `225:34`) vs `2018–Present` (`81:29`).
- **Heimat:** `April 2005 - Februar 2007` (`162:23`) vs `2006–2007` (`81:29`).
- **BBDO:** `Creative Director` (`162:23`) vs `Creative Director | BBDO Honduras` (`81:29`).
- **Entrada contradictoria en los CV-2025 antiguos** (`50:8`, `29:8`, `32:8`, `54:8`, `25:16`, `1:16`, `22:16`): aparece **dos veces DDB** — «DDB / Art Director / August 2008 - Mai 2010» **y** «DDB Hamburg / Art Director / 05.2014 – 01.2016», esta última solapándose con el periodo Freelance 2013–Current. No aparece en `162:9` ni en `81:29`.
- **`81:73` NO usar:** su nodo de experiencia está **duplicado** (`81:75` y `81:76` con texto idéntico superpuesto), omite Serviceplan/Heimat/TBWA y marca «DDB Hamburg | 2014 – 2016».
- **Idiomas:** `81:29`/`81:36` dicen «German (Native), Spanish (Native)»; `162:17` y `225:28` dicen «Spanish (Native), German (Fluent)».
- **Web:** `www.makehappen.de` (mayoría) vs `www.makehappen.ai` (`81:30`, `81:77`).
- **Technical Skills de `162:19`** se corta en «Meta Business Suite, » (coma final sin completar).
