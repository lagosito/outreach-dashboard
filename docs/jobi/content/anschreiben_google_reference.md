# Carta de presentación (Anschreiben) Google — frame `226:2` (contenido + estructura)

- **Archivo Figma:** `2JmkE1tTtSNM7BaGpEvCqp` — *resume_Gabriel-Lagos*, página `0:1`.
- **Frame:** `226:2` — nombre de capa **`CoverLetter_Google-Creative-Marketing`** (en el MCP aparecía como `Anschreiben`/`CoverLetter…`), 595×842 px (A4), fondo `#FFFFFF`.
- Posiciones relativas al origen del frame (0,0 = esquina superior izquierda).

---

## 1. Estructura visual y de párrafos

**Layout: una sola columna de ancho 515 px**, margen izquierdo 40 px (x = 40 → 555, margen derecho 40 px). Sin imágenes, sin logo, sin líneas, sin tabla de datos de contacto aparte.

| # | node id | bloque | rel (x, y) | caja | tipografía |
|---|---|---|---|---|---|
| 1 | `226:3` | **Gabriel Lagos** (H1) | (40, 41) | 136×19 | GRIFTER 700 · 18 px · `#000000` |
| 2 | `226:4` | claim / rol | (40, 60) | 272×14 | Space Grotesk 400 · 9 px · `#676767` |
| 3 | `226:5` | línea de contacto compacta | (40, 82) | 515×11 | Karla 400 · 7 px · `#181818` |
| 4 | `226:6` | destinatario (izquierda) | (40, 120) | 300×25 | Karla 400 · 8 px |
| 5 | `226:7` | lugar y fecha (**alineado a la derecha**) | (355, 120) | 200×13 | Karla 400 · 8 px · `align=RIGHT` |
| 6 | `226:8` | **asunto / línea de aplicación** (negrita) | (40, 180) | 515×15 | Karla **700** · 9.5 px · `#141414` |
| 7 | `226:9` | **cuerpo completo de la carta** | (40, 210) | 515×422 | Karla 400 · 8.5 px · `#262626` · lh 13.2 |

La misma cabecera (nombre + claim) que el CV `225:20`, más una línea de contacto (node `226:5`) que el CV no lleva arriba.

### Jerarquía de la carta

1. Cabecera (nombre, rol, contacto)
2. Destinatario a la izquierda / fecha a la derecha — misma línea vertical (y = 120)
3. Línea de asunto en negrita (y = 180)
4. Cuerpo en un único nodo de texto (y = 210 → 632), párrafos separados por línea en blanco:
   - saludo
   - 4 párrafos de desarrollo
   - bloque "What I would bring to the role:" con 3 líneas de bullets (sin viñeta gráfica, son líneas de texto)
   - párrafo de cierre
   - despedida + firma

**Idioma: inglés** — toda la carta está en inglés; el único dato local es el encabezado de lugar y fecha, *«Hamburg, 2 October 2026»*, también en inglés. La oferta a la que responde pide alemán e inglés.

**Tono:** directo, en primera persona, sin fórmulas comerciales; conecta la experiencia de 20+ años en el mercado alemán con el reto concreto de marketing de IA de consumo; cierra con una propuesta de valor en 3 bullets y disponibilidad.

---

## 2. Contenido exacto (node id → texto)

**`226:3`** — Gabriel Lagos

**`226:4`** — Creative Marketing & Brand | Campaigns, Creative Direction & AI

**`226:5`** — Phone: +49 176 4664 2026  ·  gabriel@makehappen.de  ·  linkedin.com/in/lagosito  ·  Hamburg

**`226:6`** (destinatario):
```
Google Germany
Consumer AI Marketing
```

**`226:7`** (fecha, alineada a la derecha):
```
Hamburg, 2 October 2026
```

**`226:8`** (asunto, negrita):
```
Application: Creative Marketing Manager, Consumer AI Marketing (German, English)
```

**`226:9`** (cuerpo completo):

```
Dear Consumer AI Marketing team,

Most people in Germany have heard of AI. Far fewer have felt what it does for them on an ordinary day: planning a trip, helping with homework, finding the one answer buried in ten open tabs. Closing that gap is a creative challenge more than a technical one, and it is exactly the work I would love to do as your Creative Marketing Manager for Consumer AI.

For more than 20 years I have created campaigns for the German market, first at Heimat, BBDO, DDB, Serviceplan and Jung von Matt, then independently for brands such as Deutsche Telekom, BMW, Volkswagen, Mercedes-Benz, Allianz, PlayStation® and McDonald's. Much of that work meant taking a global brand story and turning it into something that feels made for this market, without losing what makes the brand recognisable.

I know both sides of the agency relationship. I spent years at the creative table receiving the brief, and for a long time now I have been the one writing it: briefing and steering creative, production and freelance partners, protecting the idea through production, and keeping quality and timings on track.

AI is not a topic I watch from the outside. Since 2019 I have run my own creative and AI studio and use AI every day, from concepting to generative image and video production. I have also delivered several AI workshops for business owners and leaders at the Handelskammer Hamburg, and every session confirmed the same thing: people do not get excited about models or features, they get excited the moment they see their own everyday problem solved. That is the storytelling principle I would bring to Gemini, Search and Google's consumer apps.

What I would bring to the role:
Local creative leadership: two decades of turning brand ideas into campaigns for German audiences across digital, social, events and print.
Agency partnership: briefing, steering and challenging creative, social and production partners until the work is excellent.
Human-centric AI storytelling: hands-on AI practice combined with the ability to explain it in plain, relatable language.

I am based in Hamburg, fluent in German and English, and would be glad to discuss how Google's AI products can become a natural part of everyday life and culture in Germany.

Best regards
Gabriel Lagos
```

---

## 3. Notas

- El frame **no tiene bloque de "Anschreiben" clásico alemán** (kein Betreff/Empfänger-Zeile formal estilo DIN 5008): es una carta en formato inglés estilo cover letter, con destinatario abajo-izquierda y fecha arriba-derecha.
- No hay despedida en alemán ni firma manuscrita: la firma es el texto «Best regards / Gabriel Lagos».
- Ojo: existe OTRO frame `123:2` llamado `Anschreiben_Google` (versión 2025 de la carta para Google). El pedido era el frame `226:2`, que es el más reciente (CV-2026 + fecha 2 October 2026).
