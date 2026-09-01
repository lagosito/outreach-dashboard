# Outreach Dashboard — Handoff (28 Aug 2026)

## Estado actual

### Dashboard
- **URL:** https://outreach-dashboard-gabriel-lagos-projects.vercel.app
- **Repo:** https://github.com/lagosito/outreach-dashboard
- **Stack:** Next.js 16 + Supabase REST API + Tailwind CSS
- **Deploy:** Vercel (auto-deploy on push to main)

### Datos en Supabase (qbtoupvgujlhntorwbnj)
- **Tabla:** outreach_contacts (289 records)
- **Con hipótesis + draft:** 279 (100%)
- **Con email:** 77 (28%)
- **Con LinkedIn:** ~15
- **Descartados:** 10

### Funcionalidades del dashboard
- KPI cards (Total Leads, Email Found, Draft Ready, Sent, Responded, Discarded)
- Pipeline Conversion (accordion)
- Analytics Trends (accordion)
- Tabla de leads con búsqueda, filtros, sort, paginación
- Fila expandible: hipótesis, email draft, fechas
- Botones: View job posting, Copy email draft, Send email, Message on LinkedIn
- Botón Descartar leads

## Crons (migrados a Supabase)

| Cron | Horario | Estado |
|------|---------|--------|
| outreach-intake | 9/13/17 L-V | ✅ Migrado a Supabase |
| outreach-followups | 10:00 L-V | ✅ Migrado a Supabase |
| outreach-response-detection | 9/11/13/15/17 L-V | ✅ Migrado a Supabase |
| outreach-draft-watcher | */15 8-20 L-V | ✅ Ya usaba Supabase |
| outreach-pending-reminder | 10:30 + 16:30 L-V | ⚠️ Usa Airtable (pendiente migrar) |

**Gateway:** Iniciado pero puede haberse detenido con el restart de la Mini.

## Pendientes

### Alta prioridad
1. **LinkedIn MCP re-login** — `uvx mcp-server-linkedin@latest --login` para obtener datos de job posters (Meet the hiring team)
2. **Migrar pending reminders a Supabase** — Los crons 2f1a6ab3eeda y 1d6480914305 todavía usan Airtable
3. **Encontrar emails para 202 leads restantes** — Usar web_search + web_extract en job boards (Personio, StudySmarter, etc.)

### Media prioridad
4. **Browser-harness** — Ya funciona (0.1.10). Chrome necesita `--remote-debugging-port=9222` al iniciar. Útil para scrape de LinkedIn con login.
5. **Agregar contacto_nombre y contacto_linkedin** para más leads — Buscar en "Meet the hiring team" de cada job posting

### Baja prioridad
6. **Deploy a dominio custom** (ej. leads.makehappen.de)
7. **Auth/-login** para el dashboard (actualmente es público)

## Cómo usar el dashboard

1. Abrir https://outreach-dashboard-gabriel-lagos-projects.vercel.app
2. Expandir un lead para ver hipótesis + draft
3. "Copy email draft" copia al clipboard
4. "Send email" abre Gmail con To/CC/Subject prellenados
5. "Message on LinkedIn" abre el perfil de LinkedIn
6. "View job posting" abre la vacante original
7. X para descartar leads

## Env vars en Vercel (Production)
- SUPABASE_URL=https://qbtoupvgujlhntorwbnj.supabase.co
- SUPABASE_ANON_KEY=eyJhbG... (ver .env.local del repo)

## API de Supabase
- URL: https://qbtoupvgujlhntorwbnj.supabase.co
- Anon key: en ~/outreach-dashboard/.env.local
- Tabla: outreach_contacts
- RLS deshabilitado (acceso directo con anon key)
