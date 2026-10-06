# CV adaptado a Google — frame `225:20` (contenido + estructura visual)

- **Archivo Figma:** `2JmkE1tTtSNM7BaGpEvCqp` — *resume_Gabriel-Lagos*, página `0:1`.
- **Frame:** `225:20` — nombre de capa **`CV-2026_Google-Creative-Marketing`**, 595×842 px (A4 vertical), fondo `#FFFFFF`.
- **Oferta a la que está adaptado:** Creative Marketing / Campaigns / Creative Direction & AI (ver `anschreiben_google_reference.md` para la oferta exacta: *Creative Marketing Manager, Consumer AI Marketing (German, English)*).
- Posiciones relativas al origen del frame (esquina superior izquierda = 0,0).

---

## 1. Estructura visual (orden de columnas y jerarquía)

**Layout: dos columnas sobre fondo blanco, sin imágenes ni iconos (solo texto).**

- **Cabecera a todo el ancho** (y = 41–188): nombre + claim + profile.
- **Columna izquierda** `x = 40`, ancho útil **300 px** → `Professional Experience` (bloque más largo: y 202 → 791).
- **Columna derecha** `x = 361`, ancho útil **~198–215 px** → `Technical Skills`, `Education & Languages`, `Key Clients`, `contact`.
- Margen izquierdo 40 px; la columna derecha termina en ~x 576 (margen derecho ~19 px).

### Jerarquía tipográfica y de color

| Nivel | Fuente | Tamaño | Color | Uso |
|---|---|---|---|---|
| H1 nombre | **GRIFTER 700** | 18 px | `#000000` | «Gabriel Lagos» |
| Claim / subtítulo | Space Grotesk 400 | 9 px | `#676767` (gris) | línea bajo el nombre |
| Etiqueta de bloque (H2) | GRIFTER 700 | 9–10 px | `#000000` | «profile», «Professional Experience», «Technical Skills», «Education & Languages», «Key Clients», «contact» |
| Cuerpo | Karla 400 | 7–9 px | `#181818` | párrafos y bullets |
| Cuerpo destacado | Karla 700 | 7 px | `#181818` | etiquetas dentro de Technical Skills |

Interlineados: nombre 18.8 px · claim 14 px · profile 13 px · etiquetas 9.4–10.4 px · cuerpo 13 px. Todo `align=LEFT`.

### Bloques, en orden de lectura

| # | node id | bloque | rel (x,y) | caja |
|---|---|---|---|---|
| 1 | `225:22` | **Gabriel Lagos** (H1) | (40, 41) | 136×19 |
| 2 | `225:23` | claim | (40, 60) | 272×14 |
| 3 | `225:21` | etiqueta *profile* | (40, 92) | 37×10 |
| 4 | `225:24` | texto de perfil (2 párrafos) | (40, 110) | 490×78 ← **a todo el ancho** |
| 5 | `225:35` | etiqueta *Professional Experience* | (40, 202) | 128×9 |
| 6 | `225:34` | **experiencia** (7 puestos) | (40, 219) | 300×572 |
| 7 | `225:27` | etiqueta *Technical Skills* | (361, 202) | 82×9 |
| 8 | `225:30` | skills (Karla 700) | (361, 219) | 198×78 |
| 9 | `225:25` | etiqueta *Education & Languages* | (361, 318) | 139×10 |
| 10 | `225:28` | educación + idiomas | (361, 336) | 198×52 |
| 11 | `225:26` | etiqueta *Key Clients* | (361, 423) | 65×10 |
| 12 | `225:29` | clientes | (361, 439) | 187×39 |
| 13 | `225:31` | etiqueta *contact* | (361, 506) | 45×10 |
| 14 | `225:33` | contacto | (361, 524) | 215×65 |

No hay pie de página, ni logo, ni foto, ni líneas separadoras: solo texto en dos columnas.

---

## 2. Contenido exacto (node id → texto)

### Cabecera

**`225:22`** — Gabriel Lagos

**`225:23`** — Creative Marketing & Brand | Campaigns, Creative Direction & AI

### `225:24` — profile

> Creative director and brand marketer with 20+ years in the German market, first at Heimat, BBDO, DDB, Serviceplan and Jung von Matt, then independently, creating campaigns for Deutsche Telekom, BMW, Volkswagen, Mercedes-Benz, Allianz and PlayStation®. I turn global brand stories into work that feels made for Germany and lead creative, social and production partners from brief to launch. Hands-on with AI every day, I know how to tell its story in human terms: what it does for people, not how it works.
>
> Fluent in German and English, native Spanish, and at home in front of senior stakeholders.

### `225:34` — Professional Experience (columna izquierda)

```
make happen GmbH
Founder & Creative Director | 2019 – Current
Creative and AI studio for brands in the German-speaking market, with direct accountability for revenue.
Led creative direction for campaigns and content, from strategy and concept through production and launch.
Briefed and steered creative, production and freelance partners to keep quality high and delivery on time.
Built AI workflows (n8n, Claude, LLM APIs, generative image and video) that speed up concepting and content production.
Delivered several AI workshops for business owners and leaders at the Handelskammer Hamburg, making AI tangible for non-technical audiences.
Owned positioning, budgets and performance tracking to decide where to invest next.

Gabriel Lagos Freelancer
Senior Creative & Marketing Consultant | 2013 – Present
Integrated campaigns and launches for enterprise brands in the German-speaking market.
Developed integrated campaigns and launch programmes across digital, social, events and print.
Worked directly with marketing leadership, briefing and steering agency and production teams.
Built narratives and pitch material for complex technology products, combining creative direction with performance data.
Selected Clients: Deutsche Telekom, BMW, Mercedes-Benz, Audi, Volkswagen

Jung von Matt 
Digital Creative | December 2011 - August 2013
Creative for Vodafone, Mercedes-Benz. Led cross-functional teams in digital transformation.

Serviceplan Group 
Creative Art | June 2010 - November 2011
Creative for BMW, Osram and new business development.

DDB 
Art Director | August 2008 - May 2010
Creative direction for Volkswagen, Sky, Allianz (insurance).

BBDO 
Creative Director | April 2007 - July 2008
Marketing Specialist for Pepsi, Banco LaFise (banking).

Heimat GmbH 
Art Director | April 2005 - February 2007
Strategic direction for Audi, Hornbach.
```

> ⚠️ Diferencia con el CV maestro `162:9`: aquí **no aparece TBWA (2003–2005)**; hay **7 puestos**, no 8. Las fechas de agencia están **en inglés** (December, June, May…), a diferencia de `162:9` que las tiene en alemán.

### `225:30` — Technical Skills (columna derecha, Karla 700)

```
Creative: Creative Direction, Brand Storytelling, Integrated & Social Campaigns, Launches, Agency & Production Steering
Brand & Ops: Campaign Planning, Budgets, Briefings, Performance Reporting, Figma, Framer, Airtable
AI: ChatGPT, Claude, LLM APIs, n8n, Generative Image & Video, Agent Workflows
```

### `225:25` / `225:28` — Education & Languages

```
Visual Communication Design & New Media
Languages: German (Fluent), English (Fluent), Spanish (Native)
Continuous learning in AI for creative, content and marketing
```

### `225:26` / `225:29` — Key Clients

> Deutsche Telekom, Telekom MMS, BMW, Mercedes-Benz, Audi, Volkswagen, Allianz, PlayStation®, McDonald's, Hyundai, NEOM, Hochbahn

### `225:31` / `225:33` — contact

```
Phone: +49 176 4664 2026
Email: gabriel@makehappen.de
Location: Hamburg, Germany 
LinkedIn: linkedin.com/in/lagosito/
www.makehappen.de
```
