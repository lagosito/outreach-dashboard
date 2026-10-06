/**
 * Minimal OpenRouter JSON helper shared by the JOBI API routes.
 * Kept in its own module (not documents.ts) so a route that only needs a
 * plain JSON completion does not drag the document pipeline in.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const LLM_MODEL = process.env.DOC_MODEL || "openai/gpt-6.1-sol";

export interface LlmResult {
  data: Record<string, unknown>;
  cost_usd: number | null;
  total_tokens: number | null;
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Modelo no devolvió JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export async function callModelJson(prompt: string): Promise<LlmResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY no configurada en Vercel");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: ["Bearer", key].join(" "),
      "Content-Type": "application/json",
      "HTTP-Referer": "https://jobi-gabriel-lagos-projects.vercel.app",
      "X-Title": "JOBI outreach",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.5,
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
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respuesta vacía de OpenRouter");
  return {
    data: extractJson(content),
    cost_usd: typeof json.usage?.cost === "number" ? json.usage.cost : null,
    total_tokens: json.usage?.total_tokens ?? null,
  };
}

/** Strips markdown emphasis the model sometimes leaves in plain-text fields. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

/**
 * Hard cap for a LinkedIn connection message. Falls back to the last word
 * boundary below `target` so the message never ends mid-word.
 */
export function capLinkedInIntro(value: string, max = 300, target = 290): string {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const slice = text.slice(0, target);
  const boundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("\n")
  );
  const cut = boundary > 60 ? slice.slice(0, boundary + 1) : slice;
  return cut.trim();
}
