# JOBI: rediseño del outreach dashboard

Paquete para Pablo. Objetivo: llevar este diseño al dashboard que hoy vive en
`outreach-dashboard-gabriel-lagos-projects.vercel.app`, conectado a los datos reales.

## Qué hay en el paquete

- `index.html`: prototipo funcional (un solo archivo, sin build). Ábrelo en el navegador.
  Todos los filtros, estados y botones funcionan con datos de ejemplo.
- `screens/`: capturas de referencia a 1440 px, 1000 px y móvil (390 px).
- `HANDOFF.md`: este documento.

El prototipo es la referencia visual y de comportamiento. No hace falta copiarlo tal cual:
respeta la estructura, la tipografía y los estados, y usa el stack del dashboard actual.

## Reglas que no se negocian

1. Nombre del producto: **JOBI**. Subtítulo: "Dashboard de leads".
2. Nada de guiones largos (ni em dash ni en dash) en textos de la interfaz ni en borradores generados.
3. Ninguna acción borra datos. "Descartar" solo cambia el estado. Cualquier acción
   irreversible pide confirmación explícita.
4. La fila expandida de Contactos conserva la estructura actual, en este orden:
   Hipótesis, Email draft Make Happen, Email draft Gabriel freelancer, LinkedIn intro,
   timeline, acciones, actualizar estado.

## Estructura

Tres pestañas arriba: **Contactos**, **LinkedIn**, **Directorio**, cada una con su contador.
LinkedIn muestra además un contador ámbar con los candidatos pendientes de aprobar.

### Contactos

- Tarjeta **Pipeline**: título, 4 KPIs en una línea (contactos, con borrador listo,
  contactados, respuestas) y el botón "Buscar y filtrar" a la derecha.
- Al abrir "Buscar y filtrar" aparece la barra de etapas (clic en una etapa = filtro por
  estado) y debajo: Buscar, Contactado (Todos / Sí / No con contadores), Estado, Email.
- Si hay filtros activos con la tarjeta plegada, el botón muestra un contador ámbar.
- **Contactado = Sí** significa que existe `Fecha envío`. No depende del estado:
  un contacto descartado después de enviar sigue contando como contactado.
- Tabla: Empresa (+ razón social) | Puesto (+ ubicación) | Contacto (avatar, nombre,
  email o "Sin email", icono LinkedIn alineado a la derecha) | Estado | Fecha | chevron.
- Fila expandida (fondo crema):
  - Hipótesis
  - Borradores de email: Make Happen y Gabriel freelancer lado a lado, cada uno con
    Betreff, cuerpo y botón Copiar (copia asunto + cuerpo)
  - LinkedIn intro con contador sobre 300 caracteres y botón Copiar
  - Timeline: Creado, Enviado, Follow-up 1, Follow-up 2 ("Pendiente" si está vacío)
  - Acciones: Ver oferta, Enviar email (mailto con cc gabriel@makehappen.de y el
    borrador MH en el cuerpo), Mensaje en LinkedIn
  - Actualizar estado: Marcar como enviado (escribe `Fecha envío` = ahora),
    Respondió, Descartar

### LinkedIn

- Arriba **Cola de aprobación** (borde ámbar): candidatos del cron diario con
  Aprobar / Rechazar. Aprobado pasa a la tabla con estado "Borrador listo".
- **Resumen de LinkedIn**: posts, con borrador listo, publicados, score medio y
  "Buscar y filtrar" (Buscar, Publicado Sí/No, Estado, Score, Desde, Hasta).
- Tabla: Autor / Empresa | Post (2 líneas máx.) | Score (número + barra) | Estado | Fecha.
- Fila expandida, tres columnas sin cajas: POST COMPLETO (+ Ver en LinkedIn, fuente,
  score) | NUESTRO BORRADOR DE COMENTARIO (textarea, contador, se guarda en blur) |
  ACCIONES (Copiar comentario, Abrir post, Marcar publicado, Descartar).

### Directorio

Todas las personas encontradas hasta la fecha: Nombre, Empresa, Rol, Email (clic copia),
LinkedIn (botón Perfil), Encontrado (fecha + fuente). Filtros: Buscar, Datos
(Todos / Con email / Con LinkedIn), Fuente. Botón "Copiar emails visibles".

## Datos

### Contactos: Airtable `app8ewENLTNvhLuZR`, tabla `Ofertas` (esquema verificado)

| UI | Campo Airtable |
|---|---|
| Empresa | `Empresa` |
| Puesto | `Cargo` |
| Ubicación | `Ubicación` |
| Ver oferta | `Job Link` |
| Estado | `Estado` (singleSelect) |
| Hipótesis | `Hipótesis` |
| Contacto nombre / rol | `Contacto Nombre`, `Contacto Cargo` |
| Email | `Contacto Email` |
| LinkedIn | `Contacto LinkedIn` |
| Enviado / FU1 / FU2 | `Fecha envío`, `Fecha follow-up 1`, `Fecha follow-up 2` |
| Creado | fecha de creación del record |
| Fuente (Directorio) | `Fuente` |

Pendiente de confirmar por Pablo:

- `Ofertas` tiene un solo campo `Draft` (el canal lo marca `Canal`). La UI necesita tres
  textos: Email Make Happen, Email freelancer y LinkedIn intro. El dashboard actual ya los
  muestra por separado, así que usa la misma fuente que usa hoy. Si no existe, crear tres
  campos (`Draft MH`, `Draft Freelancer`, `LinkedIn Intro`) **pidiendo confirmación a
  Gabriel antes de tocar el esquema**.
- Mapear las opciones reales del singleSelect `Estado` a las 6 etapas de la UI:
  Nuevo, Contacto encontrado, Borrador listo, Enviado, Respondió, Descartado.
- Razón social (dieseo GmbH bajo Pammys) no existe como campo. Si no hay dato, ocultar
  esa segunda línea.

### Directorio

Una fila por persona:
- Contacto principal de cada record de `Ofertas`.
- Más cada línea de `Contactos alternativos` (formato por línea: Nombre, Cargo, email o
  LinkedIn). Parsear y deduplicar por email o URL de LinkedIn.

### LinkedIn: Supabase `linkedin_engagements` (a crear)

Propuesta de columnas: `id`, `author_name`, `author_role`, `is_company`, `post_url`,
`post_text`, `post_summary`, `source` (feed | keyword), `keyword`, `score` (0 a 100),
`status` (pending_approval | draft_ready | published | discarded), `comment_draft`,
`posted_at`, `approved_at`, `published_at`, `created_at`.

Flujo: cron diario (feed + keywords) crea filas `pending_approval` y avisa en Slack.
Aprobar (desde Slack o desde la cola en JOBI) pasa a `draft_ready`.

## Diseño

- Fuentes: Bricolage Grotesque (títulos, números) y Figtree (todo lo demás), Google Fonts.
- Escala tipográfica: 12 (etiquetas en mayúsculas con tracking .08em), 13 (secundario),
  15 (base, tablas, cuerpo), 17 (score), 20 (títulos de tarjeta), 24 (KPIs y marca).
- Colores y modo oscuro: tokens CSS en `:root` del prototipo. Copiarlos tal cual.
- Fila abierta: fondo crema `--cream`. Chevron simple a la derecha en todas las tablas.
- Estados: mismo pill en todas las pestañas, alto 32 px.
- Breakpoints: a 1100 px los KPIs bajan a una segunda línea y se oculta la columna Fecha;
  a 820 px las filas pasan a tarjeta.

## Checklist de entrega

- [ ] Tres pestañas con contadores reales
- [ ] Filtro Contactado basado en `Fecha envío`
- [ ] Fila expandida con las 7 secciones en el orden indicado
- [ ] Marcar como enviado / Respondió / Descartar escriben en Airtable
- [ ] Directorio con contactos principales + alternativos, deduplicado
- [ ] Sin guiones largos en ningún texto
- [ ] Preview en Vercel y link a Gabriel antes de pasar a producción
