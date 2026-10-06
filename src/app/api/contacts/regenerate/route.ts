import { NextRequest, NextResponse } from "next/server";
import { supaFindById, supaUpdateIn, type Contact } from "@/db";
import { detectLanguage } from "@/lib/documents";
import { callModelJson, capLinkedInIntro, cleanText } from "@/lib/llm";
import mhMaster from "@/content/mh-master.json";

const TABLE = "outreach_contacts";

/**
 * POST /api/contacts/regenerate
 * Regenerates ONE outreach piece per call (each button is independent):
 *   target = "mh"    → email_draft (voz make happen)
 *   target = "fl"    → email_freelancer (voz Gabriel freelance)
 *   target = "intro" → linkedin_intro (tope duro 300 caracteres, objetivo 290)
 * body: { id, target, language?: "de" | "en" }   (sin language → se detecta)
 *
 * Reglas siempre aplicadas: idioma indicado, referenciar la oferta concreta,
 * nunca inventar experiencia/clientes/cifras y nunca mencionar precios.
 */

const SERVICES = (
  mhMaster as unknown as {
    servicios: { id: string; titulo?: string; nombre?: string; resumen?: string }[];
  }
).servicios;

const TARGETS = ["mh", "fl", "intro"] as const;
type Target = (typeof TARGETS)[number];

const KEY: Record<Target, string> = {
  mh: "email_draft",
  fl: "email_freelancer",
  intro: "linkedin_intro",
};

const LABEL: Record<Target, string> = {
  mh: "email_draft: correo desde la voz de la agencia make happen",
  fl: "email_freelancer: correo desde la voz de Gabriel, freelance AI & Automation",
  intro:
    "linkedin_intro: mensaje de solicitud de conexión en LinkedIn (máximo 300 caracteres)",
};

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

  const target = body.target as Target;
  if (!TARGETS.includes(target)) {
    return NextResponse.json(
      { error: "target debe ser 'mh', 'fl' o 'intro'" },
      { status: 400 }
    );
  }

  const contact = await supaFindById<Contact>(TABLE, id);
  if (!contact) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  const forcedLanguage =
    body.language === "de" || body.language === "en" ? body.language : undefined;
  const vacante =
    (contact as unknown as { vacante_texto?: string | null }).vacante_texto || "";
  const language =
    forcedLanguage ??
    detectLanguage(vacante, contact.hipotesis, contact.cargo, contact.empresa);

  const introRule =
    target === "intro"
      ? "- Un solo párrafo, concreto, sin hashtags ni emojis. MÁXIMO 300 caracteres (objetivo 290)."
      : '- Empieza con la línea "Betreff: <asunto>" y después el cuerpo en texto plano (sin markdown, sin firmas con URLs).';

  const prompt = `Eres el asistente de prospección de make happen (agencia de branding, ads con IA, UX/UI y agentes de IA en DACH) y de Gabriel Lagos (freelance AI & Automation). Prepara UN SOLO texto de contacto para una oferta de trabajo concreta.

IDIOMA: ${language === "de" ? "Alemán (DE)" : "Inglés (EN)"}. Nunca español.

CONTEXTO DE LA OFERTA
- Empresa: ${contact.empresa || "(desconocida)"}
- Cargo: ${contact.cargo || "(desconocido)"}
- Persona: ${contact.contacto_nombre || "(desconocida)"}
- Email: ${contact.contacto_email || "(ninguno)"}
- Hipótesis interna: ${contact.hipotesis || "(ninguna)"}
- Texto de la oferta:
${vacante ? vacante.slice(0, 4000) : "(no está cargado en el panel; trabaja solo con cargo/empresa/hipótesis)"}

SERVICIOS DE MAKE HAPPEN (referencia real; no inventes otros)
${servicesBlock()}

REGLAS (obligatorias)
1. El texto DEBE referenciar la oferta concreta: el cargo, la empresa o algo de su texto. Nada genérico.
2. Nunca inventes experiencia, clientes, cifras, casos ni resultados.
3. Nunca menciones precios ni presupuestos.
4. Tono cercano y profesional, como quien escribe a una persona concreta.
5. Genera SOLAMENTE esto: ${LABEL[target]}.
${introRule}

DEVUELVE SOLO JSON con UNA CLAVE:
{"${KEY[target]}": "..."}`;

  let result: Awaited<ReturnType<typeof callModelJson>>;
  try {
    result = await callModelJson(prompt);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM call failed" },
      { status: 502 }
    );
  }

  const raw = result.data[KEY[target]];
  const value =
    target === "intro" ? capLinkedInIntro(String(raw ?? "")) : cleanText(raw);

  if (!value) {
    return NextResponse.json(
      { error: "El modelo devolvió un texto vacío", raw_keys: Object.keys(result.data) },
      { status: 502 }
    );
  }

  if (/\b\d+([.,]\d+)?\s?(€|EUR|USD)\b/i.test(value)) {
    return NextResponse.json(
      { error: "El texto menciona un precio; se ha descartado." },
      { status: 502 }
    );
  }

  const ok = await supaUpdateIn(TABLE, id, {
    [KEY[target]]: value,
    updated_at: new Date().toISOString(),
  });
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    target,
    column: KEY[target],
    language,
    [KEY[target]]: value,
    model: process.env.DOC_MODEL || "openai/gpt-6.1-sol",
    cost_usd: result.cost_usd,
    total_tokens: result.total_tokens,
  });
}
