// Document generation for JOBI: CV / CV+Anschreiben / make happen guide.
// Server-side only — the master JSONs are the single source of truth and the
// model may only select, order and rephrase what is already in them.

import cvMaster from "@/content/cv-master.json";
import mhMaster from "@/content/mh-master.json";
import verticalesMaster from "@/content/verticales.json";

interface Vertical {
  id: string;
  nombre: string;
  para_quien: string;
  ejemplos: string[];
  servicios: string[];
  casos: string[];
  promesa: string;
  titulo_portada: string;
}

export const VERTICALS: Vertical[] = (
  verticalesMaster as { verticales: Vertical[] }
).verticales;

export function verticalById(id: string | null | undefined): Vertical | null {
  if (!id) return null;
  return VERTICALS.find((v) => v.id === id) ?? null;
}

export type DocType = "cv" | "cv_anschreiben" | "mh";

export const DOC_TYPES: DocType[] = ["cv", "cv_anschreiben", "mh"];

/** Supabase column that stores the generated document for each type. */
export const DOC_FIELD: Record<DocType, "doc_cv" | "doc_anschreiben" | "doc_mh"> = {
  cv: "doc_cv",
  cv_anschreiben: "doc_anschreiben",
  mh: "doc_mh",
};

export const DOC_LABEL: Record<DocType, string> = {
  cv: "CV",
  cv_anschreiben: "CV + Anschreiben",
  mh: "make happen",
};

export const MODEL = process.env.DOC_MODEL || "openai/gpt-6.1-sol";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface DocContext {
  empresa: string;
  cargo: string;
  hipotesis: string | null;
  contacto_nombre: string | null;
  vacante_texto?: string | null;
  instruccion?: string | null;
  /** Id de vertical de verticales.json (solo aplica a la guía make happen). */
  vertical?: string | null;
}

export interface GeneratedDoc {
  tipo: DocType;
  language: "de" | "en";
  generated_at: string;
  model: string;
  /** Real cost reported by OpenRouter for this generation (USD). */
  cost_usd?: number | null;
  total_tokens?: number | null;
  /** Free-form document body; shape depends on `tipo`. */
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * Language: the document follows the language of the vacancy.
 * ------------------------------------------------------------------ */
const DE_HINTS = [
  " und ", " der ", " die ", " das ", " für ", " mit ", " sie ", " ihre ",
  "stelle", "stellenangebot", "unternehmen", "aufgabe", "wir suchen",
  "kenntnisse", "erfahrung", "bitte", "bewerbung", "vertrag", "deutsch",
];
const EN_HINTS = [
  " and ", " the ", " for ", " with ", " you ", " your ", " role ", " team ",
  "experience", "requirements", "responsibilities", "apply", "we are looking",
  "about the job", "english", "remote",
];

export function detectLanguage(...texts: (string | null | undefined)[]): "de" | "en" {
  const blob = ` ${texts.filter(Boolean).join(" ")} `.toLowerCase();
  if (!blob.trim()) return "de";
  let de = 0;
  let en = 0;
  for (const h of DE_HINTS) de += blob.split(h).length - 1;
  for (const h of EN_HINTS) en += blob.split(h).length - 1;
  return en > de ? "en" : "de";
}

/* ------------------------------------------------------------------ *
 * Prompts
 * ------------------------------------------------------------------ */
const RULES = `REGLAS DURAS (no negociables):
1. El ÚNICO material permitido es el JSON MAESTRO de abajo. SOLO podés elegir, ordenar y reformular lo que ya está ahí.
2. PROHIBIDO añadir experiencias, clientes, cifras, premios, casos o servicios que no estén en el JSON maestro. Si algo no está, no existe.
3. PROHIBIDO inventar métricas o resultados. Cifras solo si están literales en el maestro.
4. PROHIBIDO mencionar precios, tarifas o costes de ningún tipo.
5. PROHIBIDO mencionar "HOMEMOTION" o usarlo como caso.
6. Devolvé SOLO JSON válido (sin markdown, sin comentarios) con exactamente la forma pedida.
7. Todo el documento en el idioma indicado (language). No mezcles idiomas.
8. El CV NO debe enfocarse en make happen: destacá lo que pide la vacante.
9. Años de experiencia: siempre "20+" (nunca "15+" ni otra cifra).
10. Nunca menciones precios, tarifas, costes ni la palabra pricing aunque aparezca en el JSON maestro.`;

function promptCV(ctx: DocContext, language: "de" | "en"): string {
  return `Sos el asistente que adapta el CV de Gabriel Lagos a una vacante concreta.

${RULES}

IDIOMA DEL DOCUMENTO: ${language}

CONTEXTO DE LA VACANTE:
- Empresa: ${ctx.empresa}
- Cargo: ${ctx.cargo}
- Hipótesis de contacto: ${ctx.hipotesis || "no disponible"}
- Texto de la vacante (opcional): ${ctx.vacante_texto || "no proporcionado — usá el cargo y la hipótesis"}
- Instrucción extra de Gabriel (opcional): ${ctx.instruccion || "ninguna"}

JSON MAESTRO (única fuente de verdad):
${JSON.stringify(cvMaster, null, 2)}

Devolvé JSON con esta forma:
{
  "language": "${language}",
  "claim": "línea de claim bajo el nombre (del maestro)",
  "perfil": ["párrafo 1", "párrafo 2"],
  "experiencia": [{"empresa": "...", "rol": "...", "periodo": "...", "bullets": ["..."]}],
  "skills": [{"grupo": "...", "items": ["..."]}],
  "educacion": ["..."],
  "idiomas": [{"idioma": "...", "nivel": "..."}],
  "clientes": ["..."],
  "contacto": {"telefono": "...", "email": "...", "ubicacion": "...", "linkedin": "...", "web": "..."}
}
Criterio: los puestos y bullets que mejor conectan con la vacante van primero; podés omitir los que no aportan, pero nunca inventar ni reescribir fechas.`;
}

function promptAnschreiben(ctx: DocContext, language: "de" | "en"): string {
  return `Sos el asistente que escribe la carta de presentación (Anschreiben / cover letter) de Gabriel Lagos para una vacante concreta.

${RULES}

IDIOMA DEL DOCUMENTO: ${language}

CONTEXTO DE LA VACANTE:
- Empresa: ${ctx.empresa}
- Cargo: ${ctx.cargo}
- Hipótesis de contacto: ${ctx.hipotesis || "no disponible"}
- Persona de contacto: ${ctx.contacto_nombre || "no disponible"}
- Texto de la vacante (opcional): ${ctx.vacante_texto || "no proporcionado"}
- Instrucción extra de Gabriel (opcional): ${ctx.instruccion || "ninguna"}

JSON MAESTRO (única fuente de verdad):
${JSON.stringify(cvMaster, null, 2)}

Estructura: 3–4 párrafos + cierre. Tono: directo, profesional, sin fórmulas gastadas ("mit großem Interesse..." está prohibido), sin adjetivos vacíos. Referencia de estructura: motivo concreto → evidencia del maestro → qué aporta → cierre con llamada a la acción.

Estructura visual (A4, una columna): cabecera nombre+claim+contacto · destinatario a la izquierda y lugar/fecha a la derecha · línea de asunto en negrita · cuerpo (saludo, 3-4 párrafos, bloque de 3 bullets "qué aportaría", cierre, despedida).

Devolvé JSON con esta forma:
{
  "language": "${language}",
  "claim": "línea de claim del maestro",
  "contacto_linea": "línea de contacto del maestro (teléfono · email · linkedin · ciudad)",
  "ort_datum": "Hamburg, <fecha de hoy formateada en el idioma del documento>",
  "empfaenger": ["empresa", "área o equipo"],
  "betreff": "línea de asunto en negrita",
  "saludo": "...",
  "parrafos": ["párrafo 1", "párrafo 2", "párrafo 3"],
  "destacados": {"titulo": "What I would bring / Was ich mitbringe", "bullets": ["...", "...", "..."]},
  "cierre": "párrafo final",
  "despedida": "Best regards / Mit freundlichen Grüßen",
  "firma": ["Gabriel Lagos", "cargo del maestro"]
}
Dejá vacío cualquier campo que no puedas completar con el maestro (nada de direcciones inventadas).`;
}

function promptMH(ctx: DocContext, language: "de" | "en"): string {
  const vertical = verticalById(ctx.vertical);
  const verticalBlock = vertical
    ? `

VERTICAL OBLIGATORIO: "${vertical.nombre}" (${vertical.id})
- Portada: usá "${vertical.titulo_portada}" como eje del titular/claim de portada.
- Servicios a mostrar: SOLO ${vertical.servicios.join(", ")} (del maestro; no inventes otros).
- Casos a mostrar: SOLO ${vertical.casos.join(", ")} (del maestro).
- Arrancá la propuesta ("qué construiríamos para vosotros") desde esta promesa: "${vertical.promesa}".
- Para quién es esta vertical: ${vertical.para_quien}`
    : "";
  return `Sos el asistente que prepara una versión corta y personalizada del Services Guide de make happen para una empresa concreta.

${RULES}

IDIOMA DEL DOCUMENTO: ${language}

CONTEXTO DE LA VACANTE:
- Empresa destino: ${ctx.empresa}
- Cargo: ${ctx.cargo}
- Hipótesis (qué construiríamos para ellos): ${ctx.hipotesis || "no disponible"}
- Texto de la vacante (opcional): ${ctx.vacante_texto || "no proporcionado"}
- Instrucción extra de Gabriel (opcional): ${ctx.instruccion || "ninguna"}

JSON MAESTRO (única fuente de verdad):
${JSON.stringify(mhMaster, null, 2)}

Documento de ~6 páginas 16:9, en este orden:
1 portada personalizada ("für ${ctx.empresa}") · 2 quiénes somos · 3 qué construiríamos para vosotros (desde la hipótesis) · 4 servicios relevantes (2–4 del maestro) · 5-6 2–3 casos que encajen · 7 contacto.${verticalBlock}

Devolvé JSON con esta forma:
{
  "language": "${language}",
  "paginas": [
    {"tipo": "portada", "titel": "...", "untertitel": "...", "fuer": "${ctx.empresa}"},
    {"tipo": "quienes_somos", "titel": "...", "textos": ["..."], "datos": ["..."]},
    {"tipo": "propuesta", "titel": "...", "parrafos": ["..."], "puntos": ["..."]},
    {"tipo": "servicios", "titel": "...", "servicios": [{"id": "del maestro", "nombre": "...", "descripcion": "...", "bullets": ["..."]}]},
    {"tipo": "casos", "titel": "...", "casos": [{"id": "del maestro", "nombre": "...", "cliente": "...", "descripcion": "..."}]},
    {"tipo": "contacto", "titel": "...", "lineas": ["..."]}
  ]
}
Usá ids reales del maestro para servicios y casos (nunca nombres inventados). Años de experiencia: "20+".`;
}

export function buildPrompt(tipo: DocType, ctx: DocContext, language: "de" | "en"): string {
  if (tipo === "cv") return promptCV(ctx, language);
  if (tipo === "cv_anschreiben") return promptAnschreiben(ctx, language);
  return promptMH(ctx, language);
}

/* ------------------------------------------------------------------ *
 * Guardrails: anything the model invents is rejected before storage.
 * ------------------------------------------------------------------ */
const BANNED = [/HOMEMOTION/i, /\b\d+([.,]\d+)?\s?(€|EUR)\b/, /\b\d+([.,]\d+)?\s?(USD)\b/i];

/** Cost/token usage of the last model call (OpenRouter reports it per response). */
let LAST_USAGE: { cost_usd: number | null; total_tokens: number | null } = {
  cost_usd: null,
  total_tokens: null,
};

function masterSets(tipo: DocType): { empresas: Set<string>; ids: Set<string> } {
  if (tipo === "mh") {
    const m = mhMaster as unknown as {
      servicios: { id: string }[];
      casos: { id: string }[];
    };
    return {
      empresas: new Set(),
      ids: new Set([...m.servicios.map((s) => s.id), ...m.casos.map((c) => c.id)]),
    };
  }
  const m = cvMaster as unknown as {
    experiencia: { empresa: string }[];
    clientes: string[];
  };
  return {
    empresas: new Set(m.experiencia.map((e) => e.empresa.toLowerCase())),
    ids: new Set(m.clientes.map((c) => c.toLowerCase())),
  };
}

/**
 * Returns a list of problems; empty list = the document is safe to store.
 * `allowed` are the entities that belong to the offer being answered (target
 * company, contact person, role) — without them a legitimate Anschreiben
 * addressed to Google would be rejected for "not existing in the master".
 */
export function validateDoc(
  tipo: DocType,
  doc: Record<string, unknown>,
  allowed: string[] = []
): string[] {
  const errors: string[] = [];
  const raw = JSON.stringify(doc);
  const allow = new Set(
    allowed
      .filter(Boolean)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 1)
  );

  for (const re of BANNED) {
    if (re.test(raw)) errors.push(`contenido prohibido: ${re.source}`);
  }

  const { empresas, ids } = masterSets(tipo);

  if (tipo === "mh") {
    const paginas = (doc.paginas as Array<Record<string, unknown>>) || [];
    for (const p of paginas) {
      for (const key of ["servicios", "casos"] as const) {
        const list = (p[key] as Array<Record<string, unknown>>) || [];
        for (const item of list) {
          const id = String(item.id || "").toLowerCase();
          if (!ids.has(id)) errors.push(`${key}: id "${item.id}" no existe en el maestro`);
        }
      }
    }
    return errors;
  }

  const experiencias = (doc.experiencia as Array<Record<string, unknown>>) || [];
  for (const e of experiencias) {
    const empresa = String(e.empresa || "").toLowerCase();
    if (!empresas.has(empresa) && !allow.has(empresa)) {
      errors.push(`experiencia: empresa "${e.empresa}" no existe en el maestro`);
    }
  }
  const clientes = (doc.clientes as unknown[]) || [];
  for (const c of clientes) {
    const v = String(c).toLowerCase();
    if (!ids.has(v) && !allow.has(v)) {
      errors.push(`cliente "${c}" no existe en el maestro`);
    }
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * OpenRouter call
 * ------------------------------------------------------------------ */
function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Modelo no devolvió JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

async function callModel(prompt: string): Promise<Record<string, unknown>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY no configurada en Vercel");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://jobi-gabriel-lagos-projects.vercel.app",
      "X-Title": "JOBI documents",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { cost?: number; total_tokens?: number };
    error?: { message?: string };
  };
  LAST_USAGE = {
    cost_usd: typeof json.usage?.cost === "number" ? json.usage.cost : null,
    total_tokens: json.usage?.total_tokens ?? null,
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Respuesta vacía de OpenRouter: ${JSON.stringify(json).slice(0, 200)}`);
  return extractJson(content);
}

/** Strips markdown emphasis the model sometimes leaves in plain-text fields. */
function sanitize(node: unknown): unknown {
  if (typeof node === "string") {
    return node
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/`/g, "")
      .trim();
  }
  if (Array.isArray(node)) return node.map(sanitize);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return node;
}

/**
 * Generates a document and validates it against the master JSON.
 * One repair round is allowed; if the model still invents content we fail
 * loudly instead of storing something unverifiable.
 */
export async function generateDocument(
  tipo: DocType,
  ctx: DocContext,
  forcedLanguage?: "de" | "en"
): Promise<GeneratedDoc> {
  const language = forcedLanguage || detectLanguage(ctx.vacante_texto, ctx.cargo, ctx.empresa);
  // Entities of the offer itself (target company + contact) are legitimate
  // content of the answer, so the validator must accept them.
  const allowed = [ctx.empresa, ctx.contacto_nombre].filter(
    (v): v is string => typeof v === "string" && !!v.trim()
  );
  let prompt = buildPrompt(tipo, ctx, language);
  let errors: string[] = [];
  let cost = 0;
  let tokens = 0;
  let costKnown = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const data = await callModel(prompt);
    cost += LAST_USAGE.cost_usd ?? 0;
    costKnown = costKnown || LAST_USAGE.cost_usd !== null;
    tokens += LAST_USAGE.total_tokens ?? 0;
    errors = validateDoc(tipo, data, allowed);
    if (errors.length === 0) {
      const clean = sanitize(data) as Record<string, unknown>;
      if (tipo === "mh" && ctx.vertical) clean.vertical = ctx.vertical;
      return {
        tipo,
        language,
        generated_at: new Date().toISOString(),
        model: MODEL,
        cost_usd: costKnown ? Number(cost.toFixed(6)) : null,
        total_tokens: tokens || null,
        data: clean,
      };
    }
    prompt = `${prompt}\n\nTU RESPUESTA ANTERIOR FALLÓ LA VALIDACIÓN (${errors.join("; ")}).
Corregí SOLO esas cosas, manteniendo el resto, y devolvé el JSON completo otra vez.`;
  }

  throw new Error(`Contenido no verificable contra el JSON maestro: ${errors.join("; ")}`);
}
