import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn, type Contact } from "@/db";
import { detectLanguage } from "@/lib/documents";
import {
  callModelJson,
  capLinkedInIntro,
  cleanText,
} from "@/lib/llm";
import mhMaster from "@/content/mh-master.json";

const TABLE = "outreach_contacts";

/**
 * POST /api/contacts/regenerate
 * Regenerates the three outreach drafts for one lead (email_draft as Make Happen,
 * email_freelancer as Gabriel, linkedin_intro) using the same rules the autopilot
 * uses: language of the job posting, always reference the posting, never invent
 * experience/clients/prices, and the LinkedIn intro capped at 300 chars (target 290).
 */

const SERVICES = (
  mhMaster as unknown as {
    servicios: { id: string; titulo?: string; nombre?: string; resumen?: string }[];
  }
).servicios;

function servicesBlock(): string {
  return SERVICES.map(
    (s) => `- ${s.titulo || s.nombre || s.id}${s.resumen ? `: ${s.resumen}` : ""}`
  ).join("\n");
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const contact = await supaFindById<Contact>(TABLE, id);
  if (!contact) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  const vacante = (contact as unknown as { vacante_texto?: string | null }).vacante_texto || "";
  const language = detectLanguage(vacante, contact.hipotesis, contact.cargo, contact.empresa);

  const prompt = `Eres el asistente de prospección de make happen (agencia de branding, ads con IA, UX/UI y agentes de IA en DACH) y de Gabriel Lagos (freelance AI & Automation). Prepara los tres textos de contacto para UNA oferta de trabajo concreta.

IDIOMA: ${language === "de" ? "Alemán (DE)" : "Inglés (EN)"}. Nunca español.

CONTEXTO DE LA OFERTA
- Empresa: ${contact.empresa || "(desconocida)"}
- Cargo: ${contact.cargo || "(desconocido)"}
- Persona: ${contact.contacto_nombre || "(desconocida)"}
- Email: ${contact.contacto_email || "(ninguno)"}
- Hipótesis interna: ${contact.hipotesis || "(ninguna)"}
- Texto de la oferta:
${vacante ? vacante.slice(0, 4000) : "(no está cargado en el panel; trabaja solo con cargo/empresa/hipótesis)"}

SERVICIOS DE MAKE HAPPEN (úsalos como referencia real; no inventes otros)
${servicesBlock()}

REGLAS (obligatorias)
1. Ambos emails DEBEN referenciar la oferta concreta: el cargo, la empresa o algo de su texto. Nada de mensajes genéricos.
2. Nunca inventes experiencia, clientes, cifras, casos ni resultados. Solo lo que sabes de arriba.
3. Nunca menciones precios, presupuestos ni HOMEMOTION.
4. email_draft: voz de la agencia make happen (nosotros).
5. email_freelancer: voz de Gabriel como freelance AI & Automation.
6. linkedin_intro: mensaje de solicitud de conexión, MÁXIMO 300 caracteres (objetivo 290). Un solo párrafo, concreto, sin hashtags ni emojis.
7. Cada email empieza con la línea "Betreff: <asunto>" y después el cuerpo en texto plano (sin markdown, sin firmas con URLs).

DEVUELVE SOLO JSON:
{"email_draft": "Betreff: ...\n\n...", "email_freelancer": "Betreff: ...\n\n...", "linkedin_intro": "..."}`;

  let result: Awaited<ReturnType<typeof callModelJson>>;
  try {
    result = await callModelJson(prompt);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM call failed" },
      { status: 502 }
    );
  }

  const mh = cleanText(result.data.email_draft);
  const fl = cleanText(result.data.email_freelancer);
  const intro = capLinkedInIntro(String(result.data.linkedin_intro ?? ""));

  if (!mh || !fl || !intro) {
    return NextResponse.json(
      { error: "El modelo devolvió campos vacíos", raw_keys: Object.keys(result.data) },
      { status: 502 }
    );
  }
  const banned = /HOMEMOTION|\b\d+([.,]\d+)?\s?(€|EUR|USD)\b/i;
  for (const [name, value] of [
    ["email_draft", mh],
    ["email_freelancer", fl],
    ["linkedin_intro", intro],
  ] as const) {
    if (banned.test(value)) {
      return NextResponse.json(
        { error: `Contenido prohibido detectado en ${name} (precios o HOMEMOTION)` },
        { status: 502 }
      );
    }
  }

  const ok = await supaUpdateIn(TABLE, id, {
    email_draft: mh,
    email_freelancer: fl,
    linkedin_intro: intro,
    updated_at: new Date().toISOString(),
  });
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email_draft: mh,
    email_freelancer: fl,
    linkedin_intro: intro,
    language,
    model: process.env.DOC_MODEL || "openai/gpt-6.1-sol",
    cost_usd: result.cost_usd,
    total_tokens: result.total_tokens,
  });
}
